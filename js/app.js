// Start der App: Ansichten laden, Design setzen, Deep-Links auswerten, Service Worker registrieren.
import { applyTheme } from './theme.js';
import { settings, bus } from './store.js';
import { setLevel } from './sound.js';
import * as nav from './nav.js';
import { isRunning, onRunEvent } from './views/run.js';
import './views/remote.js';
import './views/home.js';
import './views/preview.js';
import './views/editor.js';
import './views/settings.js';
import './views/pair.js';
import './views/ready.js';
import './views/share.js';
import './display.js';
import { parseCode } from './codec.js';
import { registerSW, applyUpdate } from './pwa.js';
import { toast } from './ui.js';
import { link } from './link.js';
import { Scanner, qrLog } from './qr.js';

applyTheme();
setLevel(settings.volume);
bus.addEventListener('settings', () => { applyTheme(); setLevel(settings.volume); });
document.documentElement.classList.add('ready');
nav.start('home');

/* Deep-Links aus QR-Codes (Handy-Kamera): #w=… Workout, #c=… Verbindungscode der Anzeige */
function handleHash() {
  if (location.hash.length <= 3) return;
  const c = parseCode(location.hash);
  history.replaceState(history.state || { n: 1 }, '', location.pathname + location.search);
  if (!c) return;
  if (c.kind === 'workout') nav.open('import', { workout: c.data });
  else if (c.kind === 'offer') {
    if (isRunning()) { toast('Erst das laufende Workout beenden, dann verbinden.'); return; }
    nav.open('pair-remote', { offer: c.data });
  }
}
handleHash();
window.addEventListener('hashchange', handleHash);

registerSW(() => {
  const show = () => toast('Neue Version verfügbar', { action: 'Neu laden', onAction: applyUpdate, sticky: true });
  if (isRunning()) {
    const off = onRunEvent(t => { if (t === 'exit') { off(); show(); } });
  } else show();
});

window.addEventListener('beforeunload', e => {
  if (isRunning() || link.active) { e.preventDefault(); e.returnValue = ''; }
});

// Testhilfen ohne Kamera (nur Entwicklerkonsole): __pt.scan(text), __pt.qr()
window.__pt = {
  link,
  scan: text => Scanner.inject(text),
  qr: () => qrLog[qrLog.length - 1],
  nav
};
