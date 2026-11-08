// Ansichten wechseln, mit Browser-Verlauf: Die Android-Zurück-Taste führt zurück statt die App zu schliessen.
const views = {};
const stack = [];
let current = null;
const waiters = [];

export function register(id, def) { views[id] = def; }
export const currentView = () => current;
export const topIsSheet = () => stack.length && stack[stack.length - 1].type === 'sheet';

function activate(id, params) {
  const prev = current;
  if (prev && prev !== id && views[prev].hide) views[prev].hide();
  Object.keys(views).forEach(k => { views[k].el.hidden = k !== id; });
  current = id;
  document.body.dataset.view = id;
  if (prev !== id) window.scrollTo(0, 0);
  views[id].show && views[id].show(params, prev);
}

export function start(id, params) {
  stack.length = 0;
  stack.push({ type: 'view', id });
  history.replaceState({ n: 1 }, '');
  activate(id, params);
}

export function open(id, params) {
  stack.push({ type: 'view', id });
  history.pushState({ n: stack.length }, '');
  activate(id, params);
}

/** Aktuelle Ansicht ersetzen (kein neuer Verlaufseintrag) */
export function replace(id, params) {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].type === 'view') { stack[i] = { type: 'view', id }; break; }
  }
  activate(id, params);
}

/** Zur Startansicht zurück, egal wie tief */
export function home(params) {
  const depth = stack.length - 1;
  if (depth <= 0) { activate('home', params); return Promise.resolve(); }
  return new Promise(res => {
    // Overlays sauber schliessen, dann Startansicht
    stack.slice(1).forEach(e => { if (e.type === 'sheet') e.close(); });
    stack.length = 1;
    stack[0] = { type: 'view', id: 'home' };
    waiters.push(() => { activate('home', params); res(); });
    skipGuard = true;
    history.go(-depth);
  });
}

export function pushSheet(close) {
  stack.push({ type: 'sheet', close });
  history.pushState({ n: stack.length }, '');
}

/** Oberstes Element schliessen. Promise erfüllt sich, wenn es wirklich zu ist. */
export function back() {
  if (stack.length <= 1) return Promise.resolve(false);
  return new Promise(res => { waiters.push(() => res(true)); history.back(); });
}

let skipGuard = false;
window.addEventListener('popstate', () => {
  // Link aus einem QR-Code (#c=… / #w=…): das ist kein «Zurück», app.js wertet ihn per hashchange aus
  if (/^#(c|w)=/.test(location.hash)) return;
  if (waiters.length && skipGuard) {
    skipGuard = false;
    waiters.splice(0).forEach(fn => fn());
    return;
  }
  const top = stack[stack.length - 1];
  if (!top || stack.length <= 1) { waiters.splice(0).forEach(fn => fn()); return; }
  if (top.type === 'view' && views[top.id].onBack && views[top.id].onBack() === false) {
    history.pushState({ n: stack.length }, '');
    waiters.splice(0).forEach(fn => fn());
    return;
  }
  stack.pop();
  if (top.type === 'sheet') top.close();
  else {
    let prevId = 'home';
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].type === 'view') { prevId = stack[i].id; break; }
    activate(prevId);
  }
  waiters.splice(0).forEach(fn => fn());
});
