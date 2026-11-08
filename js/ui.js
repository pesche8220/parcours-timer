// Gemeinsame Oberflächen-Bausteine: Blätter (Bottom Sheets), Hinweise, Doppeltipp-Bestätigung.
import * as nav from './nav.js';
import { esc } from './util.js';
import { UI } from './icons.js';

export function sheet({ title = '', body = '', cls = '', onMount, onClose, label } = {}) {
  const root = document.createElement('div');
  root.className = 'sheet-wrap';
  root.innerHTML = `<div class="sheet-backdrop"></div>
    <div class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label || title)}" tabindex="-1">
      <div class="sheet-grip" aria-hidden="true"></div>
      ${title ? `<div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Schliessen">${UI.close}</button></div>` : ''}
      <div class="sheet-body">${body}</div>
    </div>`;
  document.body.appendChild(root);
  const el = root.querySelector('.sheet');
  let closed = false;
  const api = {
    el, root,
    get closed() { return closed; },
    close: () => (closed ? Promise.resolve() : nav.back())
  };
  const doClose = () => {
    if (closed) return;
    closed = true;
    root.classList.remove('in');
    root.classList.add('out');
    setTimeout(() => root.remove(), 240);
    onClose && onClose();
  };
  nav.pushSheet(doClose);
  root.querySelector('.sheet-backdrop').addEventListener('click', () => api.close());
  root.addEventListener('click', e => { if (e.target.closest('[data-close]')) api.close(); });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') api.close(); });
  requestAnimationFrame(() => { root.classList.add('in'); el.focus({ preventScroll: true }); });
  onMount && onMount(api);
  return api;
}

let toastTimer = null;
export function toast(msg, { ms = 2600, action, onAction } = {}) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { hide(); onAction && onAction(); };
  t.classList.add('show');
  clearTimeout(toastTimer);
  const hide = () => t.classList.remove('show');
  toastTimer = setTimeout(hide, action ? Math.max(ms, 6000) : ms);
}

/** Erster Tipp schärft den Knopf («Sicher?»), zweiter führt aus. */
export function arm(btn, label, action) {
  if (btn.classList.contains('armed')) { disarm(btn); action(); return; }
  if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
  btn.classList.add('armed');
  btn.innerHTML = esc(label);
  clearTimeout(btn._armT);
  btn._armT = setTimeout(() => disarm(btn), 3000);
}
export function disarm(btn) {
  if (!btn) return;
  btn.classList.remove('armed');
  if (btn.dataset.orig) { btn.innerHTML = btn.dataset.orig; delete btn.dataset.orig; }
  clearTimeout(btn._armT);
}

/** Text so gross wie möglich in seine Box einpassen (Binärsuche). */
export function fit(el, box, maxPx) {
  const W = box.clientWidth, H = box.clientHeight;
  if (!W || !H) return;
  let lo = 8, hi = Math.max(10, Math.min(maxPx || 4000, H * 1.3));
  for (let k = 0; k < 22 && hi - lo > 1; k++) {
    const m = Math.floor((lo + hi) / 2);
    el.style.fontSize = m + 'px';
    if (el.scrollWidth <= W + 1 && el.offsetHeight <= H + 1) lo = m; else hi = m;
  }
  el.style.fontSize = lo + 'px';
}

/** Datei herunterladen (Backup) */
export function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
