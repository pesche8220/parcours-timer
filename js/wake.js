// Bildschirm wach halten (Screen Wake Lock). Mehrere Stellen können es anfordern.
const wants = new Set();
let lock = null;

async function acquire() {
  if (lock || !('wakeLock' in navigator) || document.hidden) return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch (e) { lock = null; }
}
function release() {
  try { lock && lock.release(); } catch (e) { /* egal */ }
  lock = null;
}

export function keepAwake(key, on) {
  if (on) wants.add(key); else wants.delete(key);
  if (wants.size) acquire(); else release();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && wants.size) acquire();
});
