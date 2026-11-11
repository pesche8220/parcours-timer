// Koppeln: «Als Anzeige» (Tablet/Laptop) und «Als Fernbedienung» (Handy).
import { $, esc, vibrate } from '../util.js';
import { UI } from '../icons.js';
import { link } from '../link.js';
import { qrSvg, Scanner } from '../qr.js';
import { parseCode, offerUrl, answerText } from '../codec.js';
import { lnaState, requestLna, lnaHelp } from '../lna.js';
import { keepAwake } from '../wake.js';
import { unlock, sfx } from '../sound.js';
import { toast } from '../ui.js';
import * as nav from '../nav.js';

const camHelp = err => (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError'))
  ? 'Kamera nicht erlaubt. Erlaube den Kamerazugriff in den Browser-Einstellungen und versuche es nochmal.'
  : 'Keine Kamera gefunden.';

/** Karte «Lokales Netzwerk erlauben» (nur wenn der Browser das verlangt) */
const lnaCard = id => `<div class="lna-card" id="${id}" hidden>
  <span class="lna-ico">${UI.wifi}</span>
  <p id="${id}Txt"></p>
  <button type="button" class="btn cta small" id="${id}Btn">${UI.check}<span>Erlauben</span></button>
</div>`;

async function checkLna(id) {
  const card = $('#' + id), state = await lnaState();
  const txt = lnaHelp(state);
  card.hidden = !txt;
  if (!txt) return state;
  $('#' + id + 'Txt').textContent = txt;
  $('#' + id + 'Btn').hidden = state !== 'prompt';
  return state;
}
function wireLna(id) {
  $('#' + id + 'Btn').addEventListener('click', async () => {
    const s = await requestLna();
    await checkLna(id);
    if (s === 'granted') toast('Lokales Netzwerk erlaubt');
  });
}

/** Fehlerbox mit Klartext und Code zum Weitergeben */
async function showFailure(el, retryId, retryLabel) {
  const d = await link.diagnose();
  el.innerHTML = `<span class="fail-box">
    <b>Keine Verbindung.</b> ${esc(d.hint)}
    <span class="diag">Code für Rückfragen: <code>${esc(d.code)}</code></span>
    <button type="button" class="btn small" id="${retryId}">${esc(retryLabel)}</button>
  </span>`;
}

/* =====================================================================
   Anzeige
   ===================================================================== */
const pd = document.getElementById('v-pair-display');
pd.innerHTML = `
  <div class="page narrow-wide">
    <header class="bar">
      <button type="button" class="icon-btn" data-back aria-label="Zurück">${UI.back}</button>
      <h1 class="bar-title">Als Anzeige</h1>
    </header>
    <p class="lead">Dieses Gerät zeigt den Timer gross. Dein Handy wird zur Fernbedienung – ohne Internet.</p>
    ${lnaCard('pdLna')}
    <div class="pair-grid">
      <section class="card pair-step">
        <div class="step-head"><span class="step-num">1</span><p>Am Handy <b>Parcours</b> öffnen, <b>Als Fernbedienung</b> tippen und diesen Code scannen.</p></div>
        <div class="qr-box" id="pdQr"><div class="qr-wait">Code wird erstellt …</div></div>
      </section>
      <section class="card pair-step">
        <div class="step-head"><span class="step-num">2</span><p>Das Handy zeigt dann einen Code. Halte ihn <b>ca. 20 cm</b> vor die Kamera dieses Geräts. Ein Piep bestätigt, dass er gelesen wurde.</p></div>
        <div class="cam-box mirror"><video id="pdVid" muted playsinline></video><div class="cam-msg" id="pdCamMsg">Kamera wird gestartet …</div></div>
        <p class="fine">Die Kamera liest nur den Code. Es wird nichts gespeichert oder gesendet.</p>
      </section>
    </div>
    <div class="pair-status" id="pdStatus" role="status"></div>
    <details class="help">
      <summary>Ohne WLAN im Garten?</summary>
      <p>Beide Geräte brauchen ein gemeinsames Netz. Am einfachsten: Handy-Hotspot einschalten und dieses Gerät damit verbinden – Internet ist nicht nötig.</p>
      <p>Ganz ohne Netz geht es auch: Am Handy beim Workout <b>Per Code übergeben</b> wählen und den Code hier vor die Kamera halten. Dann läuft das Workout hier, nur ohne Fernbedienung.</p>
    </details>
  </div>`;
wireLna('pdLna');

let pdScanner = null, pdBusy = false, pdGen = 0, staleHintAt = 0;

async function pdStart() {
  const gen = ++pdGen;
  pdBusy = false;
  $('#pdStatus').textContent = '';
  $('#pdQr').innerHTML = '<div class="qr-wait">Code wird erstellt …</div>';
  checkLna('pdLna');
  // Kamera zuerst: Mit erlaubter Kamera gibt der Browser die lokale Adresse frei (stabilere Verbindung).
  pdScanner = new Scanner($('#pdVid'), pdOnCode, { facing: 'user' });
  try { await pdScanner.start(); $('#pdCamMsg').hidden = true; }
  catch (e) { $('#pdCamMsg').hidden = false; $('#pdCamMsg').textContent = camHelp(e); }
  if (gen !== pdGen) return;
  try {
    const code = await link.host();
    if (gen !== pdGen) return;
    $('#pdQr').innerHTML = qrSvg(offerUrl(code), { ecc: 'L' });
    // Ohne echte Adresse (Kamera nicht erlaubt) klappt die Verbindung oft nicht – gleich sagen
    if (!link.exposesIp) {
      $('#pdStatus').innerHTML = `<span class="fail-box"><b>Achtung:</b> Dieses Gerät gibt seine Netzwerkadresse nicht frei, weil die Kamera nicht erlaubt ist. Dann klappt die Verbindung oft nicht. Erlaube die Kamera und öffne «Als Anzeige» neu.</span>`;
    }
  } catch (e) {
    if (gen !== pdGen) return;
    $('#pdQr').innerHTML = `<div class="qr-wait">Verbindung wird von diesem Browser nicht unterstützt.</div>`;
  }
}

async function pdOnCode(text) {
  if (pdBusy) return;
  const c = parseCode(text);
  if (!c || c.kind === 'unknown') { toast('Unbekannter Code'); return; }
  if (c.kind === 'offer') { toast('Das ist ein Anzeige-Code. Scanne ihn mit dem Handy.'); return; }
  if (c.kind === 'workout') {
    pdBusy = true;
    sfx.count();
    toast('Workout übernommen');
    nav.replace('ready', { workout: c.data });
    return;
  }
  if (c.kind === 'answer') {
    if (link.status !== 'waiting') return;   // Angebot noch nicht fertig: einfach weiter scannen
    pdBusy = true;
    sfx.count();
    $('#pdStatus').textContent = 'Code gelesen. Verbinde …';
    try { await link.accept(c.data); }
    catch (e) {
      pdBusy = false;
      if (e.code === 'notready') { $('#pdStatus').textContent = ''; return; }
      // Alter Code (z. B. vom letzten Mal): nicht blockieren, nur kurz Bescheid geben
      if (Date.now() - staleHintAt > 4000) {
        staleHintAt = Date.now();
        $('#pdStatus').textContent = 'Das ist ein alter Code. Scanne am Handy den Code oben neu.';
      }
    }
  }
}

function pdStop() {
  pdGen++;
  if (pdScanner) pdScanner.stop();
  pdScanner = null;
}

link.on(async ev => {
  if (ev.type !== 'status' || nav.currentView() !== 'pair-display') return;
  if (ev.status === 'open') {
    pdStop();
    toast('Handy verbunden');
    nav.replace('ready');
  } else if (ev.status === 'failed') {
    pdBusy = false;
    await showFailure($('#pdStatus'), 'pdRetry', 'Neuen Code erstellen');
    checkLna('pdLna');
    $('#pdRetry').onclick = () => { pdStop(); pdStart(); };
  }
});

pd.addEventListener('click', e => { if (e.target.closest('[data-back]')) nav.back(); });

nav.register('pair-display', {
  el: pd,
  show() { unlock(); keepAwake('pair', true); pdStart(); },
  hide() {
    pdStop();
    keepAwake('pair', false);
    if (link.role === 'display' && (link.status === 'waiting' || link.status === 'connecting' || link.status === 'failed')) link.close();
  }
});

/* =====================================================================
   Fernbedienung
   ===================================================================== */
const pr = document.getElementById('v-pair-remote');
pr.innerHTML = `
  <div class="page narrow">
    <header class="bar">
      <button type="button" class="icon-btn" data-back aria-label="Zurück">${UI.back}</button>
      <h1 class="bar-title">Als Fernbedienung</h1>
    </header>
    ${lnaCard('prLna')}
    <div id="prScan">
      <p class="lead">Scanne den Code auf dem Tablet oder Laptop.</p>
      <div class="cam-box scan"><video id="prVid" muted playsinline></video><div class="scan-frame" aria-hidden="true"></div><div class="cam-msg" id="prCamMsg">Kamera wird gestartet …</div></div>
      <p class="fine">Auf dem grossen Gerät: Parcours öffnen und <b>Als Anzeige</b> tippen.</p>
      <button type="button" class="btn ghost wide" id="prNoNet">${UI.qr}<span>Kein gemeinsames Netz? Workout per Code übergeben</span></button>
    </div>
    <div id="prShow" hidden>
      <p class="lead">Fast fertig: Halte jetzt den Bildschirm deines Handys ca. 20 cm vor die Kamera der Anzeige, bis sie piept. Tipp: Bildschirm hell stellen.</p>
      <div class="qr-box big" id="prQr"></div>
      <div class="pair-status" id="prStatus" role="status">Warte auf die Anzeige …</div>
      <button type="button" class="btn ghost wide" id="prAgain">${UI.camera}<span>Nochmal scannen</span></button>
    </div>
  </div>`;
wireLna('prLna');

let prScanner = null, prBusy = false, prGen = 0, prSlowTimer = null;

async function prScan() {
  const gen = ++prGen;
  prBusy = false;
  clearTimeout(prSlowTimer);
  checkLna('prLna');
  $('#prScan').hidden = false; $('#prShow').hidden = true;
  $('#prCamMsg').hidden = false; $('#prCamMsg').textContent = 'Kamera wird gestartet …';
  prScanner = new Scanner($('#prVid'), prOnCode, { facing: 'environment' });
  try { await prScanner.start(); if (gen === prGen) $('#prCamMsg').hidden = true; }
  catch (e) { $('#prCamMsg').textContent = camHelp(e) + ' Tipp: Den Code auf der Anzeige auch mit der normalen Kamera-App scannen.'; }
}

async function prOnCode(text) {
  if (prBusy) return;
  const c = parseCode(text);
  if (!c || c.kind === 'unknown') { toast('Unbekannter Code'); return; }
  if (c.kind === 'workout') { prStopCam(); nav.replace('import', { workout: c.data }); return; }
  if (c.kind === 'answer') { toast('Das ist der Code eines Handys. Scanne den Code auf der Anzeige.'); return; }
  prBusy = true;
  vibrate(40);
  await prJoin(c.data);
}

async function prJoin(offer) {
  const parsed = parseCode(offer);           // nimmt ganze Adresse oder nur den Code
  if (parsed && parsed.kind === 'offer') offer = parsed.data;
  checkLna('prLna');
  $('#prScan').hidden = true; $('#prShow').hidden = false;
  $('#prQr').hidden = false;
  $('#prQr').innerHTML = '<div class="qr-wait">Code wird erstellt …</div>';
  $('#prStatus').textContent = 'Warte auf die Anzeige …';
  // Über die normale Handy-Kamera geöffnet: Kamera kurz anfordern. Erst mit Kamera-Erlaubnis
  // schreibt der Browser die echte Netzwerkadresse in den Code (sonst nur einen «.local»-Namen).
  let tmp = null;
  if (!prScanner && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    $('#prQr').innerHTML = '<div class="qr-wait">Bitte Kamera erlauben – das macht die Verbindung zuverlässig.</div>';
    try { tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); } catch (e) { tmp = null; }
    $('#prQr').innerHTML = '<div class="qr-wait">Code wird erstellt …</div>';
  }
  try {
    const ans = await link.join(offer);   // Kamera läuft noch -> lokale Adresse verfügbar
    if (tmp) tmp.getTracks().forEach(t => t.stop());
    prStopCam();
    $('#prQr').innerHTML = qrSvg(answerText(ans), { ecc: 'L' });
    clearTimeout(prSlowTimer);
    prSlowTimer = setTimeout(() => {
      if (link.status === 'connecting' && nav.currentView() === 'pair-remote' && !$('#prStatus').dataset.read) {
        $('#prStatus').textContent = 'Noch kein Piep? Code etwas näher oder weiter weg halten und den Bildschirm hell stellen.';
      }
    }, 30000);
  } catch (e) {
    if (tmp) tmp.getTracks().forEach(t => t.stop());
    prStopCam();
    prBusy = false;
    $('#prQr').innerHTML = '';
    $('#prQr').hidden = true;
    $('#prStatus').textContent = 'Dieser Code passt nicht. Öffne auf der Anzeige «Als Anzeige» neu und scanne nochmal.';
  }
  delete $('#prStatus').dataset.read;
}

function prStopCam() { prGen++; if (prScanner) prScanner.stop(); prScanner = null; }

link.on(async ev => {
  if (nav.currentView() !== 'pair-remote' || link.role !== 'remote') return;
  // Die Anzeige hat unseren Code gelesen, sobald ihre erste Anfrage hier eintrifft
  if (ev.type === 'peerseen' && link.status === 'connecting') {
    $('#prStatus').dataset.read = '1';
    $('#prStatus').textContent = 'Anzeige hat den Code gelesen. Verbinde …';
    return;
  }
  if (ev.type !== 'status') return;
  if (ev.status === 'open') {
    clearTimeout(prSlowTimer);
    toast('Verbunden. Was du jetzt startest, läuft auf der Anzeige.', { ms: 3500 });
    nav.back();
  } else if (ev.status === 'failed') {
    clearTimeout(prSlowTimer);
    await showFailure($('#prStatus'), 'prRetry', 'Nochmal scannen');
    checkLna('prLna');
    $('#prQr').hidden = true;
    $('#prRetry').onclick = () => { link.close(); prScan(); };
  }
});

$('#prAgain').addEventListener('click', () => { if (link.role === 'remote' && !link.open) link.close(); prScan(); });
$('#prNoNet').addEventListener('click', () => { prStopCam(); nav.replace('share-pick'); });
pr.addEventListener('click', e => { if (e.target.closest('[data-back]')) nav.back(); });

nav.register('pair-remote', {
  el: pr,
  show(params) {
    if (params && params.offer) { prBusy = true; prJoin(params.offer); }
    else prScan();
  },
  hide() {
    prStopCam();
    clearTimeout(prSlowTimer);
    if (link.role === 'remote' && (link.status === 'connecting' || link.status === 'failed')) link.close();
  }
});
