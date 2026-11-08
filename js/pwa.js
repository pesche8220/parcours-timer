// Installierbarkeit und Service Worker (Offline-Betrieb, Updates).
export const APP_VERSION = '1.0.1';

let deferred = null, updateReg = null, wantReload = false;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; notify(); });
window.addEventListener('appinstalled', () => { deferred = null; notify(); });

export const onInstallChange = fn => listeners.add(fn);

export function installState() {
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return 'installed';
  if (deferred) return 'available';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'other';
}

export async function promptInstall() {
  if (!deferred) return;
  deferred.prompt();
  try { await deferred.userChoice; } catch (e) { /* egal */ }
  deferred = null;
  notify();
}

export function registerSW(onUpdate) {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  // Lokale Entwicklung: ohne Cache arbeiten (Offline-Test mit ?sw=1)
  if (location.hostname === 'localhost' && !/[?&]sw=1/.test(location.search)) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
    return;
  }
  navigator.serviceWorker.register('sw.js').then(reg => {
    const check = w => {
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) { updateReg = reg; onUpdate(); }
      });
    };
    if (reg.waiting && navigator.serviceWorker.controller) { updateReg = reg; onUpdate(); }
    reg.addEventListener('updatefound', () => check(reg.installing));
    setInterval(() => { if (navigator.onLine) reg.update().catch(() => {}); }, 60 * 60 * 1000);
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (wantReload) { wantReload = false; location.reload(); }
  });
}

export function applyUpdate() {
  if (!updateReg || !updateReg.waiting) { location.reload(); return; }
  wantReload = true;
  updateReg.waiting.postMessage('skipWaiting');
}
