// Direkte Verbindung Handy <-> Anzeige per WebRTC-Datenkanal.
// Kein Server, kein Internet: Die Verbindungsdaten werden per QR-Code ausgetauscht.
// Voraussetzung: Beide Geräte im selben Netz (WLAN oder Handy-Hotspot, Internet nicht nötig).
//
// Ablauf: Anzeige erstellt Angebot (QR) -> Handy scannt, erstellt Antwort (QR) -> Anzeige scannt -> verbunden.
import { b64urlFromBytes, bytesFromB64url } from './util.js';
import { lnaState } from './lna.js';

const CFG = { iceServers: [] };
const OPEN_TIMEOUT = 25000;   // ab dem Moment, in dem die Anzeige die Antwort gelesen hat

let pc = null, dc = null;
let role = null;          // 'display' | 'remote'
let status = 'idle';      // idle | waiting | connecting | open | lost | failed
let lastRx = 0, hbTimer = null, openTimer = null, hostUfrag = null;
const listeners = new Set();

function emit(ev) { listeners.forEach(fn => { try { fn(ev); } catch (e) { console.error(e); } }); }
function setStatus(s) {
  if (status === s) return;
  status = s;
  // Während des Verbindens laufend mitschreiben (Diagnose + «Gegenseite hat gelesen»)
  clearInterval(sampleTimer);
  if (s === 'connecting' && pc) { const myPc = pc; sampleTimer = setInterval(() => samplePairs(myPc), 1000); }
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
  const [head, u, p, fpb, setup, mid] = f;
  // Antwort trägt die Sitzungskennung der Anzeige: «a.<ufrag der Anzeige>»
  const [kind, tag = null] = head.split('.');
  const fp = [...bytesFromB64url(fpb)].map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
  const c = [];
  for (let i = 6; i + 1 < f.length; i += 2) c.push({ addr: unpackAddr(f[i]), port: +f[i + 1] });
  return { kind, tag, u, p, fp, setup: setup === 'x' ? 'actpass' : setup === 'a' ? 'active' : 'passive', mid, c };
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
  clearInterval(hbTimer); clearTimeout(openTimer); clearInterval(sampleTimer);
  try { dc && dc.close(); } catch (e) { /* egal */ }
  try { pc && pc.close(); } catch (e) { /* egal */ }
  pc = null; dc = null;
}

/* ---------- Diagnose: was ist bei einem Fehlschlag passiert? ---------- */
let diag = { local: '', remote: '', ice: [] };
// 4 = private IPv4, p = öffentliche IPv4, 6 = IPv6, m = verschleierte Adresse (.local)
const kindOf = a => a.endsWith('.local') ? 'm' : a.includes(':') ? '6' : /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(a) ? '4' : 'p';
const kinds = list => list.map(c => kindOf(c.addr)).join('') || '-';
const hasIp = s => /[46p]/.test(s);

function browserTag() {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? 'And' : /iPhone|iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'iOS' : /Windows/.test(ua) ? 'Win' : /Mac/.test(ua) ? 'Mac' : 'X';
  const m = ua.match(/(Edg|Chrome|Firefox|Version)\/(\d+)/);
  const br = m ? ({ Edg: 'E', Chrome: 'C', Firefox: 'F', Version: 'S' })[m[1]] + m[2] : '?';
  return os + '-' + br;
}

/** Liefert { code, hint } – Code zum Weitergeben, Hinweis in Klartext */
async function diagnose() {
  const lna = await lnaState();
  await samplePairs(pc);
  const { n, ok, bad } = diag.pairs;
  const code = [role === 'display' ? 'A' : 'H', 'L' + diag.local, 'R' + diag.remote, 'I' + (diag.ice.join('>') || '-'),
    `P${n}/${ok}/${bad}`, 'N' + lna.slice(0, 3), browserTag()].join(' ');
  const tried = n > 0 || diag.ice.includes('chec');
  let hint;
  if (lna === 'denied') hint = 'Chrome blockiert den Zugriff aufs lokale Netzwerk. Symbol links in der Adresszeile → Website-Einstellungen → «Lokales Netzwerk» zulassen.';
  else if (diag.remote && !hasIp(diag.local) && !hasIp(diag.remote)) hint = 'Beide Geräte verstecken ihre Netzwerkadresse. Erlaube die Kamera dauerhaft («Immer erlauben») auf beiden Geräten und verbinde neu.';
  else if (!diag.remote || !tried) hint = role === 'remote' ? 'Die Anzeige hat sich noch nicht gemeldet. Hat sie deinen Code gelesen (Piep)?' : 'Es kam kein Verbindungsversuch zustande.';
  else if (ok === 0) hint = 'Die Geräte finden sich im Netz nicht. Sind beide im selben WLAN oder Hotspot? Manche WLANs (z. B. Gast-WLAN) trennen Geräte voneinander.';
  else hint = 'Verbindung kam nicht zustande.';
  return { code, hint, lna };
}

/** Verbindungsversuche zählen – Chrome räumt sie nach dem Scheitern weg, darum laufend mitschreiben */
async function samplePairs(conn) {
  if (!conn) return;
  try {
    let n = 0, ok = 0, bad = 0, rx = 0;
    (await conn.getStats()).forEach(r => {
      if (r.type !== 'candidate-pair') return;
      n++;
      rx += r.requestsReceived || 0;
      if (r.state === 'succeeded') ok++; else if (r.state === 'failed') bad++;
    });
    const p = diag.pairs;
    diag.pairs = { n: Math.max(p.n, n), ok: Math.max(p.ok, ok), bad: Math.max(p.bad, bad) };
    // Erste Anfrage der Gegenseite: Sie hat unseren Code und versucht sich zu verbinden
    if (rx > 0 && !diag.peerSeen && conn === pc) { diag.peerSeen = true; emit({ type: 'peerseen', role }); }
  } catch (e) { /* egal */ }
}

let sampleTimer = null;
function makePc() {
  pc = new RTCPeerConnection(CFG);
  dc = pc.createDataChannel('pt', { negotiated: true, id: 0, ordered: true });
  const myPc = pc;
  diag = { local: '', remote: '', ice: [], pairs: { n: 0, ok: 0, bad: 0 } };
  clearInterval(sampleTimer);
  pc.oniceconnectionstatechange = () => {
    if (pc !== myPc) return;
    const s = myPc.iceConnectionState;
    diag.ice.push(s.slice(0, 4));
    samplePairs(myPc);
    emit({ type: 'ice', state: s, role });
  };
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
  /** true, wenn dieses Gerät eine echte Netzwerkadresse in seinen Code geschrieben hat */
  get exposesIp() { return hasIp(diag.local); },

  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Anzeige: Angebot erstellen. Liefert Code für den QR. */
  async host() {
    reset();
    role = 'display';
    makePc();
    const myPc = pc;
    await myPc.setLocalDescription(await myPc.createOffer());
    await gathered(myPc);
    if (pc !== myPc) throw new Error('abgebrochen');
    const local = parseSdp(myPc.localDescription.sdp);
    hostUfrag = local.u;
    diag.local = kinds(local.c);
    setStatus('waiting');
    return encodeDesc('o', myPc.localDescription.sdp);
  },

  /** Handy: gescanntes Angebot annehmen. Liefert Antwort-Code für den QR. */
  async join(code) {
    const d = decodeDesc(code);
    if (d.kind !== 'o') throw new Error('Kein Verbindungscode der Anzeige');
    reset();
    role = 'remote';
    makePc();
    diag.remote = kinds(d.c);
    await pc.setRemoteDescription({ type: 'offer', sdp: buildSdp(d) });
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    diag.local = kinds(parseSdp(pc.localDescription.sdp).c);
    // Keine Frist hier: Das Handy weiss nicht, wann die Anzeige seinen Code liest.
    // Scheitert die Verbindung wirklich, meldet das der Browser (connectionState «failed»).
    setStatus('connecting');
    return encodeDesc('a.' + d.u, pc.localDescription.sdp);
  },

  /**
   * Anzeige: gescannte Antwort vom Handy übernehmen.
   * Wirft Error mit .code: 'notready' (Angebot noch nicht fertig), 'stale' (Code gehört zu einer anderen/alten Sitzung).
   */
  async accept(code) {
    const d = decodeDesc(code);
    const fail = c => Object.assign(new Error(c), { code: c });
    if (d.kind !== 'a') throw fail('kind');
    if (!pc || role !== 'display' || status !== 'waiting' || pc.signalingState !== 'have-local-offer') throw fail('notready');
    if (d.tag && d.tag !== hostUfrag) throw fail('stale');
    diag.remote = kinds(d.c);
    await pc.setRemoteDescription({ type: 'answer', sdp: buildSdp(d) });
    setStatus('connecting');
    armTimeout();
  },

  send,
  diagnose,

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
