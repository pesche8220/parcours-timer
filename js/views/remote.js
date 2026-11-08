// Fernbedienung (Handy): zeigt gespiegelt, was auf der Anzeige läuft, und steuert sie.
import { $, esc, fmt, fmtRun, vibrate } from '../util.js';
import { UI, CAT_ICONS } from '../icons.js';
import { describe } from '../segments.js';
import { link } from '../link.js';
import { keepAwake } from '../wake.js';
import { fit, arm, disarm, toast } from '../ui.js';
import * as nav from '../nav.js';

const COLORS = { work: 'var(--work)', rest: 'var(--rest)', pause: 'var(--pause)', prep: 'var(--prep)', done: 'var(--done)' };
const el = document.getElementById('v-remote');

el.innerHTML = `
  <div class="rm-top">
    <button type="button" class="icon-btn on-color" id="rmBack" aria-label="Zur Übersicht">${UI.back}</button>
    <span class="rm-where" id="rmWhere">${UI.screen}<span>Läuft auf der Anzeige</span></span>
    <span class="rm-info" id="rmInfo"></span>
  </div>
  <div class="rm-phase" id="rmPhase"></div>
  <div class="rm-namebox" id="rmNameBox"><div class="rm-name" id="rmName"></div></div>
  <div class="rm-timebox" id="rmTimeBox"><div class="rm-time" id="rmTime"></div></div>
  <div class="rm-next" id="rmNext"></div>
  <div class="r-bar" aria-hidden="true"><i id="rmBar"></i></div>
  <div class="rm-lost" id="rmLost" hidden>
    <p><b>Verbindung unterbrochen.</b> Die Anzeige läuft selbständig weiter.</p>
    <button type="button" class="btn small on-color" id="rmRepair">Neu verbinden</button>
  </div>
  <div class="rm-ctrl">
    <button type="button" data-c="prev" aria-label="Zurück">${UI.prev}<span>Zurück</span></button>
    <button type="button" data-c="toggle" class="big" id="rmMain"></button>
    <button type="button" data-c="skip" aria-label="Weiter">${UI.next}<span>Weiter</span></button>
  </div>
  <button type="button" class="rm-stop" id="rmStop">${UI.stop}<span>Workout beenden</span></button>`;

/* Zustand, wie ihn die Anzeige zuletzt gemeldet hat */
const R = { rid: null, segs: null, title: '', snap: null, at: 0, waitingTitle: null, waitingSince: 0 };
export const remoteRun = () => (R.rid && R.snap && R.snap.rid === R.rid ? { title: R.title, fin: R.snap.fin } : null);

let loop = null, timePattern = '';
const listeners = new Set();
export const onRemoteChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const changed = () => listeners.forEach(fn => fn());

export function expectRemoteRun(title) {
  R.waitingTitle = title;
  R.waitingSince = Date.now();
  if (nav.currentView() !== 'remote') nav.open('remote');
  render();
}

link.on(ev => {
  if (ev.type === 'status') {
    if (link.role === 'remote' || !link.role) { updateLost(); changed(); }
    if (ev.status === 'idle') { R.rid = null; R.snap = null; R.segs = null; changed(); }
    return;
  }
  if (ev.type === 'bye') { toast('Anzeige hat die Verbindung beendet'); if (nav.currentView() === 'remote') nav.back(); return; }
  if (ev.type !== 'message' || link.role !== 'remote') return;
  const m = ev.msg;
  if (m.t === 'hi') { link.send({ t: 'sync' }); }
  else if (m.t === 'run') {
    const isNew = m.rid !== R.rid;
    R.rid = m.rid; R.segs = m.segs; R.title = m.title; timePattern = '';
    R.waitingTitle = null;
    if (isNew && nav.currentView() !== 'remote' && nav.currentView() !== 'pair-remote') nav.open('remote');
    render(); changed();
  } else if (m.t === 'st') {
    if (!m.rid) { R.snap = null; render(); changed(); return; }
    if (m.rid !== R.rid) { link.send({ t: 'sync' }); return; }
    const was = R.snap;
    R.snap = m; R.at = Date.now();
    if (was && was.idx !== m.idx) vibrate(30);
    render();
    if (!was || was.fin !== m.fin) changed();
  } else if (m.t === 'end') {
    if (m.rid === R.rid) {
      R.rid = null; R.snap = null; R.segs = null;
      changed();
      if (nav.currentView() === 'remote') nav.back();
    }
  }
});

function updateLost() {
  const lost = link.role === 'remote' && link.status === 'lost';
  const gone = !link.role || link.status === 'idle' || link.status === 'failed';
  $('#rmLost').hidden = !(lost || (gone && R.rid));
  el.classList.toggle('is-lost', lost || gone);
}

function render() {
  if (el.hidden) return;
  const has = R.segs && R.snap && R.snap.rid === R.rid;
  if (!has) {
    el.style.setProperty('--seg', COLORS.prep);
    $('#rmPhase').textContent = R.waitingTitle ? 'Wird gestartet …' : 'Nichts läuft';
    $('#rmInfo').textContent = '';
    $('#rmName').textContent = R.waitingTitle || 'Wähle ein Workout';
    $('#rmNext').innerHTML = '';
    $('#rmTime').textContent = '';
    $('#rmMain').innerHTML = `${UI.play}<span>Start</span>`;
    $('#rmMain').disabled = true;
    layout();
    return;
  }
  $('#rmMain').disabled = false;
  const s = R.snap;
  if (s.fin) {
    el.style.setProperty('--seg', COLORS.done);
    $('#rmPhase').textContent = 'Workout beendet';
    $('#rmInfo').textContent = R.title;
    $('#rmName').textContent = 'Geschafft!';
    $('#rmNext').innerHTML = '<span class="pre">Gesamtdauer</span>';
    $('#rmMain').innerHTML = `${UI.check}<span>Fertig</span>`;
    el.classList.add('is-done');
  } else {
    el.classList.remove('is-done');
    const d = describe(R.segs, s.idx);
    el.style.setProperty('--seg', COLORS[d.type]);
    $('#rmPhase').textContent = s.paused ? d.phase + ' · pausiert' : d.phase;
    $('#rmInfo').textContent = d.info;
    $('#rmName').innerHTML = (d.cat ? `<span class="ico">${CAT_ICONS[d.cat]}</span>` : '') + `<span>${esc(d.main)}</span>`;
    const n = d.next;
    $('#rmNext').innerHTML = n ? `<span class="pre">${esc(n.pre)}${n.label ? ':' : ''}</span> ${n.label ? esc(n.label) : ''}` : '';
    $('#rmMain').innerHTML = (d.open || s.paused) ? `${UI.play}<span>Weiter</span>` : `${UI.pause}<span>Pause</span>`;
  }
  el.classList.toggle('is-paused', !!s.paused);
  layout();
  drawTime();
}

function layout() {
  fit($('#rmName'), $('#rmNameBox'), 120);
  timePattern = '';
  drawTime();
}

function drawTime() {
  const s = R.snap;
  if (!s || !R.segs || s.rid !== R.rid) return;
  const seg = R.segs[s.idx], dt = (Date.now() - R.at) / 1000;
  let txt;
  if (s.fin) txt = fmt(s.tot);
  else if (seg.open) { txt = fmt(s.el + dt); $('#rmBar').style.width = '0%'; }
  else {
    const l = s.paused ? s.left : Math.max(0, s.left - dt);
    txt = fmtRun(l);
    $('#rmBar').style.width = Math.min(100, Math.max(0, (1 - l / seg.dur) * 100)) + '%';
  }
  const t = $('#rmTime');
  if (t.textContent !== txt) t.textContent = txt;
  const pat = txt.replace(/\d/g, '8');
  if (pat !== timePattern) { timePattern = pat; t.textContent = pat; fit(t, $('#rmTimeBox')); t.textContent = txt; }
}

el.addEventListener('click', e => {
  const b = e.target.closest('[data-c]');
  if (!b || b.disabled) return;
  vibrate(15);
  if (R.snap && R.snap.fin && b.dataset.c === 'toggle') { link.send({ t: 'cmd', c: 'stop' }); return; }
  link.send({ t: 'cmd', c: b.dataset.c });
});
$('#rmStop').addEventListener('click', e => arm(e.currentTarget, 'Wirklich beenden?', () => link.send({ t: 'cmd', c: 'stop' })));
$('#rmBack').addEventListener('click', () => nav.back());
$('#rmRepair').addEventListener('click', () => { nav.replace('pair-remote'); });

let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!el.hidden) layout(); }, 120); });

nav.register('remote', {
  el,
  show() {
    keepAwake('remote', true);
    disarm($('#rmStop'));
    updateLost();
    clearInterval(loop);
    loop = setInterval(() => {
      drawTime();
      if (R.waitingTitle && Date.now() - R.waitingSince > 6000 && !(R.snap && R.snap.rid === R.rid)) {
        R.waitingTitle = null; render();
        toast('Die Anzeige antwortet nicht.');
      }
    }, 200);
    setTimeout(render, 20);
  },
  hide() { clearInterval(loop); keepAwake('remote', false); }
});
