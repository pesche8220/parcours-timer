// Koppeln: «Als Anzeige» (Tablet/Laptop) und «Als Fernbedienung» (Handy).
import { $, esc } from '../util.js';
import { UI } from '../icons.js';
import { link } from '../link.js';
import { qrSvg, Scanner } from '../qr.js';
import { parseCode, offerUrl, answerText } from '../codec.js';
import { keepAwake } from '../wake.js';
import { unlock } from '../sound.js';
import { toast } from '../ui.js';
import * as nav from '../nav.js';

const camHelp = err => (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError'))
  ? 'Kamera nicht erlaubt. Erlaube den Kamerazugriff in den Browser-Einstellungen und versuche es nochmal.'
  : 'Keine Kamera gefunden.';

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
    <div class="pair-grid">
      <section class="card pair-step">
        <div class="step-head"><span class="step-num">1</span><p>Am Handy <b>Parcours</b> öffnen, <b>Als Fernbedienung</b> tippen und diesen Code scannen.</p></div>
        <div class="qr-box" id="pdQr"><div class="qr-wait">Code wird erstellt …</div></div>
      </section>
      <section class="card pair-step">
        <div class="step-head"><span class="step-num">2</span><p>Das Handy zeigt dann einen Code. Halte ihn vor die Kamera dieses Geräts.</p></div>
        <div class="cam-box mirror"><video id="pdVid" muted playsinline></video><div class="cam-msg" id="pdCamMsg">Kamera wird gestartet …</div></div>
        <p class="fine">Die Kamera liest nur den Code. Es wird nichts gespeichert oder gesendet.</p>
      </section>
    </div>
    <p class="pair-status" id="pdStatus" role="status"></p>
    <details class="help">
      <summary>Ohne WLAN im Garten?</summary>
      <p>Beide Geräte brauchen ein gemeinsames Netz. Am einfachsten: Handy-Hotspot einschalten und dieses Gerät damit verbinden – Internet ist nicht nötig.</p>
      <p>Ganz ohne Netz geht es auch: Am Handy beim Workout <b>Per Code übergeben</b> wählen und den Code hier vor die Kamera halten. Dann läuft das Workout hier, nur ohne Fernbedienung.</p>
    </details>
  </div>`;

let pdScanner = null, pdBusy = false, pdGen = 0;

async function pdStart() {
  const gen = ++pdGen;
  pdBusy = false;
  $('#pdStatus').textContent = '';
  $('#pdQr').innerHTML = '<div class="qr-wait">Code wird erstellt …</div>';
  // Kamera zuerst: Mit erlaubter Kamera gibt der Browser die lokale Adresse frei (stabilere Verbindung).
  pdScanner = new Scanner($('#pdVid'), pdOnCode, { facing: 'user' });
  try { await pdScanner.start(); $('#pdCamMsg').hidden = true; }
  catch (e) { $('#pdCamMsg').hidden = false; $('#pdCamMsg').textContent = camHelp(e); }
  if (gen !== pdGen) return;
  try {
    const code = await link.host();
    if (gen !== pdGen) return;
    $('#pdQr').innerHTML = qrSvg(offerUrl(code), { ecc: 'L' });
  } catch (e) {
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
    toast('Workout übernommen');
    nav.replace('ready', { workout: c.data });
    return;
  }
  if (c.kind === 'answer') {
    pdBusy = true;
    $('#pdStatus').textContent = 'Code gelesen. Verbinde …';
    try { await link.accept(c.data); }
    catch (e) { pdBusy = false; $('#pdStatus').textContent = 'Dieser Code passt nicht. Bitte am Handy neu scannen.'; }
  }
}

function pdStop() {
  pdGen++;
  if (pdScanner) pdScanner.stop();
  pdScanner = null;
}

link.on(ev => {
  if (ev.type !== 'status' || nav.currentView() !== 'pair-display') return;
  if (ev.status === 'open') {
    pdStop();
    toast('Handy verbunden');
    nav.replace('ready');
  } else if (ev.status === 'failed') {
    pdBusy = false;
    $('#pdStatus').innerHTML = `Keine Verbindung. Sind beide Geräte im selben WLAN oder Hotspot? <button type="button" class="btn small" id="pdRetry">Nochmal</button>`;
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
    <div id="prScan">
      <p class="lead">Scanne den Code auf dem Tablet oder Laptop.</p>
      <div class="cam-box scan"><video id="prVid" muted playsinline></video><div class="scan-frame" aria-hidden="true"></div><div class="cam-msg" id="prCamMsg">Kamera wird gestartet …</div></div>
      <p class="fine">Auf dem grossen Gerät: Parcours öffnen und <b>Als Anzeige</b> tippen.</p>
      <button type="button" class="btn ghost wide" id="prNoNet">${UI.qr}<span>Kein gemeinsames Netz? Workout per Code übergeben</span></button>
    </div>
    <div id="prShow" hidden>
      <p class="lead">Fast fertig: Halte jetzt den Bildschirm deines Handys vor die Kamera der Anzeige.</p>
      <div class="qr-box big" id="prQr"></div>
      <p class="pair-status" id="prStatus" role="status">Warte auf die Anzeige …</p>
      <button type="button" class="btn ghost wide" id="prAgain">${UI.camera}<span>Nochmal scannen</span></button>
    </div>
  </div>`;

let prScanner = null, prBusy = false, prGen = 0;

async function prScan() {
  const gen = ++prGen;
  prBusy = false;
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
  await prJoin(c.data);
}

async function prJoin(offer) {
  $('#prScan').hidden = true; $('#prShow').hidden = false;
  $('#prQr').innerHTML = '<div class="qr-wait">Code wird erstellt …</div>';
  $('#prStatus').textContent = 'Warte auf die Anzeige …';
  try {
    const ans = await link.join(offer);   // Kamera läuft noch -> lokale Adresse verfügbar
    prStopCam();
    $('#prQr').innerHTML = qrSvg(answerText(ans), { ecc: 'L' });
  } catch (e) {
    prStopCam();
    prBusy = false;
    $('#prQr').innerHTML = '';
    $('#prStatus').textContent = 'Dieser Code passt nicht. Erstelle auf der Anzeige einen neuen und scanne nochmal.';
  }
}

function prStopCam() { prGen++; if (prScanner) prScanner.stop(); prScanner = null; }

link.on(ev => {
  if (ev.type !== 'status' || nav.currentView() !== 'pair-remote') return;
  if (ev.status === 'open') {
    toast('Verbunden. Was du jetzt startest, läuft auf der Anzeige.', { ms: 3500 });
    nav.back();
  } else if (ev.status === 'failed') {
    $('#prStatus').innerHTML = 'Keine Verbindung. Beide Geräte müssen im selben WLAN oder Handy-Hotspot sein. Hat die Anzeige den Code gelesen?';
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
    if (link.role === 'remote' && (link.status === 'connecting' || link.status === 'failed')) link.close();
  }
});
