// Direkte Verbindung Handy <-> Anzeige per WebRTC-Datenkanal.
// Kein Server, kein Internet: Die Verbindungsdaten werden per QR-Code ausgetauscht.
// Voraussetzung: Beide Geräte im selben Netz (WLAN oder Handy-Hotspot, Internet nicht nötig).
//
// Ablauf: Anzeige erstellt Angebot (QR) -> Handy scannt, erstellt Antwort (QR) -> Anzeige scannt -> verbunden.
import { b64urlFromBytes, bytesFromB64url } from './util.js';

const CFG = { iceServers: [] };
const OPEN_TIMEOUT = 15000;

let pc = null, dc = null;
let role = null;          // 'display' | 'remote'
let status = 'idle';      // idle | waiting | connecting | open | lost | failed
let lastRx = 0, hbTimer = null, openTimer = null;
const listeners = new Set();

function emit(ev) { listeners.forEach(fn => { try { fn(ev); } catch (e) { console.error(e); } }); }
function setStatus(s) {
  if (status === s) return;
  status = s;
  emit({ type: 'status', status: s, role });
}

/* ---------- SDP kompakt ---------- */
function parseSdp(sdp) {
  const d = { u: '', p: '', fp: '', setup: 'actpass', mid: '0', c: [] };
  for (const l of sdp.split(/\r?\n/)) {
    if (l.startsWith('a=ice-ufrag:') && !d.u) d.u = l.slice(12).trim();
    else if (l.startsWith('a=ice-pwd:') && !d.p) d.p = l.slice(10).trim();
    else if (l.startsWith('a=fingerprint:') && !d.fp) {
      const [alg, hex] = l.slice(14).trim().split(' ');
      if (alg.toLowerCase() === 'sha-256') d.fp = hex;
    } else if (l.startsWith('a=setup:')) d.setup = l.slice(8).trim();
    else if (l.startsWith('a=mid:')) d.mid = l.slice(6).trim();
    else if (l.startsWith('a=candidate:')) {
      const f = l.slice(12).trim().split(/\s+/);
      if (f[1] === '1' && f[2].toLowerCase() === 'udp') d.c.push({ addr: f[4], port: +f[5], typ: f[7] });
    }
  }
  return d;
}

const rankAddr = a => /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(a) ? 0 : /^\d+\.\d+\.\d+\.\d+$/.test(a) ? 1 : a.endsWith('.local') ? 2 : 3;

// mDNS-Namen (UUID.local) kompakt: 36 Zeichen -> 22 Zeichen, damit der QR-Code gröber bleibt
const UUID_LOCAL = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/i;
function packAddr(a) {
  const m = a.match(UUID_LOCAL);
  if (!m) return a;
  const hex = m.slice(1).join('');
  return '*' + b64urlFromBytes(new Uint8Array(hex.match(/../g).map(h => parseInt(h, 16))));
}
function unpackAddr(a) {
  if (!a.startsWith('*')) return a;
  const h = [...bytesFromB64url(a.slice(1))].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}.local`;
}

function encodeDesc(kind, sdp) {
  const d = parseSdp(sdp);
  if (!d.u || !d.p || !d.fp) throw new Error('sdp');
  const fpBytes = new Uint8Array(d.fp.split(':').map(h => parseInt(h, 16)));
  const seen = new Set();
  const cands = d.c
    .filter(c => (c.typ === 'host' || c.typ === 'srflx') && !c.addr.startsWith('fe80') && !seen.has(c.addr + c.port) && seen.add(c.addr + c.port))
    .sort((a, b) => rankAddr(a.addr) - rankAddr(b.addr))
    .slice(0, 5);
  const setup = d.setup === 'actpass' ? 'x' : d.setup === 'active' ? 'a' : 'p';
  const parts = [kind, d.u, d.p, b64urlFromBytes(fpBytes), setup, d.mid];
  cands.forEach(c => parts.push(packAddr(c.addr), c.port));
  return parts.join('~');
}

function decodeDesc(str) {
  const f = String(str).split('~');
  if (f.length < 6) throw new Error('code');
  const [kind, u, p, fpb, setup, mid] = f;
  const fp = [...bytesFromB64url(fpb)].map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
  const c = [];
  for (let i = 6; i + 1 < f.length; i += 2) c.push({ addr: unpackAddr(f[i]), port: +f[i + 1] });
  return { kind, u, p, fp, setup: setup === 'x' ? 'actpass' : setup === 'a' ? 'active' : 'passive', mid, c };
}

function buildSdp(d) {
  const L = [
    'v=0', `o=- ${Date.now()} 2 IN IP4 127.0.0.1`, 's=-', 't=0 0',
    `a=group:BUNDLE ${d.mid}`, 'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0',
    `a=ice-ufrag:${d.u}`, `a=ice-pwd:${d.p}`, 'a=ice-options:trickle',
    `a=fingerprint:sha-256 ${d.fp}`, `a=setup:${d.setup}`, `a=mid:${d.mid}`,
    'a=sctp-port:5000', 'a=max-message-size:262144'
  ];
  d.c.forEach((c, i) => L.push(`a=candidate:${i + 1} 1 udp ${2122260223 - i * 256} ${c.addr} ${c.port} typ host generation 0`));
  L.push('a=end-of-candidates');
  return L.join('\r\n') + '\r\n';
}

function gathered(conn, ms = 2500) {
  return new Promise(res => {
    if (conn.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, ms);
    conn.addEventListener('icegatheringstatechange', () => {
      if (conn.iceGatheringState === 'complete') { clearTimeout(t); res(); }
    });
  });
}

/* ---------- Verbindung ---------- */
function reset() {
  clearInterval(hbTimer); clearTimeout(openTimer);
  try { dc && dc.close(); } catch (e) { /* egal */ }
  try { pc && pc.close(); } catch (e) { /* egal */ }
  pc = null; dc = null;
}

function makePc() {
  pc = new RTCPeerConnection(CFG);
  dc = pc.createDataChannel('pt', { negotiated: true, id: 0, ordered: true });
  const myPc = pc;
  dc.onopen = () => {
    clearTimeout(openTimer);
    lastRx = Date.now();
    setStatus('open');
    send({ t: 'hi', role });
    clearInterval(hbTimer);
    hbTimer = setInterval(() => {
      send({ t: 'hb' });
      if (status === 'open' && Date.now() - lastRx > 7000) setStatus('lost');
    }, 2000);
  };
  dc.onclose = () => { if (pc === myPc && (status === 'open' || status === 'connecting')) setStatus('lost'); };
  dc.onmessage = e => {
    lastRx = Date.now();
    if (status === 'lost') setStatus('open');
    let msg; try { msg = JSON.parse(e.data); } catch (err) { return; }
    if (msg.t === 'hb') return;
    if (msg.t === 'bye') { reset(); setStatus('idle'); emit({ type: 'bye' }); return; }
    emit({ type: 'message', msg });
  };
  pc.onconnectionstatechange = () => {
    if (pc !== myPc) return;
    const s = myPc.connectionState;
    if (s === 'failed') setStatus(status === 'open' || status === 'lost' ? 'lost' : 'failed');
    else if (s === 'disconnected' && status === 'open') setStatus('lost');
    else if (s === 'connected' && status === 'lost' && dc && dc.readyState === 'open') setStatus('open');
  };
}

function armTimeout() {
  clearTimeout(openTimer);
  openTimer = setTimeout(() => { if (status === 'connecting') setStatus('failed'); }, OPEN_TIMEOUT);
}

export const link = {
  get role() { return role; },
  get status() { return status; },
  get open() { return status === 'open'; },
  get active() { return status === 'open' || status === 'lost'; },

  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Anzeige: Angebot erstellen. Liefert Code für den QR. */
  async host() {
    reset();
    role = 'display';
    makePc();
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    setStatus('waiting');
    return encodeDesc('o', pc.localDescription.sdp);
  },

  /** Handy: gescanntes Angebot annehmen. Liefert Antwort-Code für den QR. */
  async join(code) {
    const d = decodeDesc(code);
    if (d.kind !== 'o') throw new Error('Kein Verbindungscode der Anzeige');
    reset();
    role = 'remote';
    makePc();
    await pc.setRemoteDescription({ type: 'offer', sdp: buildSdp(d) });
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    setStatus('connecting');
    armTimeout();
    return encodeDesc('a', pc.localDescription.sdp);
  },

  /** Anzeige: gescannte Antwort vom Handy übernehmen. */
  async accept(code) {
    const d = decodeDesc(code);
    if (d.kind !== 'a') throw new Error('Kein Antwortcode');
    if (!pc || role !== 'display') throw new Error('Kein Angebot offen');
    if (pc.signalingState !== 'have-local-offer') return; // schon übernommen
    await pc.setRemoteDescription({ type: 'answer', sdp: buildSdp(d) });
    setStatus('connecting');
    armTimeout();
  },

  send,

  close() {
    if (dc && dc.readyState === 'open') { try { dc.send(JSON.stringify({ t: 'bye' })); } catch (e) { /* egal */ } }
    reset();
    role = null;
    setStatus('idle');
  }
};

function send(msg) {
  if (!dc || dc.readyState !== 'open') return false;
  try { dc.send(JSON.stringify(msg)); return true; } catch (e) { return false; }
}

// Zum Testen ohne Kamera (Entwicklerkonsole)
export const _dev = { encodeDesc, decodeDesc, buildSdp, parseSdp };
