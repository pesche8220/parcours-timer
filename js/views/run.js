// Vollbild-Anzeige des Timers und Steuerung des laufenden Workouts.
// Die Anzeige ist der Chef: Sie hält das Workout und rechnet selbst, auch ohne Fernbedienung.
import { $, esc, fmt, fmtRun } from '../util.js';
import { UI, CAT_ICONS } from '../icons.js';
import { describe, segsSeconds } from '../segments.js';
import { Runner } from '../runner.js';
import { sfx, unlock } from '../sound.js';
import { keepAwake } from '../wake.js';
import { fit, arm, disarm, toast } from '../ui.js';
import { saveRun, loadRun, clearRun } from '../store.js';
import { link } from '../link.js';
import * as nav from '../nav.js';

const COLORS = { work: 'var(--work)', rest: 'var(--rest)', pause: 'var(--pause)', prep: 'var(--prep)', done: 'var(--done)' };
const el = document.getElementById('v-run');

el.innerHTML = `
  <div class="r-all" aria-hidden="true"><i id="rAll"></i></div>
  <div class="r-top">
    <span id="rPhase"></span>
    <span class="r-top-right"><span class="r-link" id="rLink" hidden title="Fernbedienung verbunden">${UI.phone}</span><span id="rInfo"></span></span>
  </div>
  <div class="r-namebox" id="nameBox"><span class="ico r-ico" id="rIco"></span><div class="fitwrap" id="nameWrap"><div class="r-name" id="rName"></div></div></div>
  <div class="r-timebox" id="timeBox"><div class="r-time" id="rTime"></div></div>
  <div class="r-nextbox" id="nextBox"><div class="r-next" id="rNext"></div></div>
  <div class="r-bar" aria-hidden="true"><i id="rBar"></i></div>
  <div class="r-ctrl" id="rCtrl">
    <button type="button" id="rPrev" aria-label="Zurück">${UI.prev}<span>Zurück</span></button>
    <button type="button" id="rMain" class="big"></button>
    <button type="button" id="rSkip" aria-label="Überspringen">${UI.next}<span>Weiter</span></button>
    <button type="button" id="rFull" aria-label="Vollbild">${UI.full}<span>Vollbild</span></button>
    <button type="button" id="rStop" class="stop">${UI.stop}<span>Ende</span></button>
  </div>`;

let runner = null, loop = null, ctrlTimer = null, timePattern = '', leaving = false, prefix = [], planned = 0, lastSync = 0;
const listeners = new Set();
export const onRunEvent = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = type => listeners.forEach(fn => fn(type, runner));

export const getRunner = () => runner;
export const isRunning = () => !!runner && !runner.finished;

/* ---------- Start / Ende ---------- */
const hooks = {
  enter(r, sound) {
    const s = r.seg;
    if (sound) { if (s.type === 'work') sfx.work(); else if (s.type !== 'prep') sfx.rest(); }
    disarm($('#rStop'));
    persist();
    setContent();
    showCtrl(false);
    broadcast(true);
  },
  beep() { sfx.count(); },
  change() { persist(); updateMain(); setContent(); showCtrl(false); broadcast(true); },
  finish() { sfx.done(); finishView(); broadcast(true); clearRun(); emit('finish'); }
};

export function startRun(segs, title) {
  if (!segs || !segs.length) return;
  unlock();
  stopLoop();
  runner = new Runner(segs, title, hooks);
  prepare();
  if (nav.currentView() !== 'run') nav.open('run');
  runner.start();
  begin();
  emit('start');
}

/** Gespeichertes, noch laufendes Workout wieder aufnehmen (Zeit lief weiter). */
export function resumeSaved() {
  const data = loadRun();
  if (!data) return false;
  unlock();
  runner = Runner.restore(data, hooks);
  prepare();
  nav.open('run');
  setContent();
  runner.tick();
  begin();
  emit('start');
  return true;
}
export function savedRunInfo() {
  const d = loadRun();
  if (!d || d.finished || !d.segs || !d.segs.length) return null;
  if (Date.now() - d.began > 4 * 3600 * 1000) { clearRun(); return null; }
  return { title: d.title, began: d.began };
}

function prepare() {
  prefix = []; let acc = 0;
  runner.segs.forEach(s => { prefix.push(acc); acc += s.open ? 0 : s.dur; });
  planned = acc || 1;
  timePattern = '';
  el.classList.remove('is-done', 'is-paused');
  $('#rCtrl').hidden = false;
}

function begin() {
  keepAwake('run', true);
  loop = setInterval(tick, 100);
  updateLink();
  layout();
}

function stopLoop() { clearInterval(loop); loop = null; clearTimeout(ctrlTimer); }

function tick() {
  if (!runner) return;
  runner.tick();
  drawTime();
  if (Date.now() - lastSync > 1000) broadcast(false);
}

export function exitRun({ fromBack = false } = {}) {
  if (!runner) { if (!fromBack && nav.currentView() === 'run') { leaving = true; nav.back(); } return; }
  const rid = runner.rid;
  stopLoop();
  runner = null;
  clearRun();
  keepAwake('run', false);
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* egal */ }
  if (link.role === 'display') link.send({ t: 'end', rid });
  emit('exit');
  if (!fromBack && nav.currentView() === 'run') { leaving = true; nav.back(); }
}

/** Befehl von Knopf, Taste oder Fernbedienung */
export function command(c) {
  if (!runner) return;
  unlock();
  if (c === 'toggle') { if (runner.finished) return exitRun(); runner.toggle(); }
  else if (c === 'skip') runner.skip();
  else if (c === 'prev') runner.prev();
  else if (c === 'stop') exitRun();
  drawTime();
}

function persist() { if (runner && !runner.finished) saveRun(runner.serialize()); }

/* ---------- Fernbedienung informieren ---------- */
export function runMessage() {
  return runner ? { t: 'run', rid: runner.rid, title: runner.title, segs: runner.segs } : null;
}
export function stateMessage() {
  return runner ? { t: 'st', ...runner.snapshot() } : { t: 'st', rid: null };
}
function broadcast() {
  lastSync = Date.now();
  if (link.role !== 'display' || !link.open || !runner) return;
  link.send(stateMessage());
}
export function updateLink() {
  const on = link.role === 'display' && link.active;
  $('#rLink').hidden = !on;
  $('#rLink').classList.toggle('weak', link.status === 'lost');
}

/* ---------- Darstellung ---------- */
function setContent() {
  if (!runner) return;
  if (runner.finished) return finishView();
  const d = describe(runner.segs, runner.idx);
  const paused = runner.paused;
  $('#rPhase').textContent = paused ? d.phase + ' · pausiert' : d.phase;
  $('#rInfo').textContent = d.info;
  $('#rName').textContent = d.main;
  $('#rIco').innerHTML = d.cat ? CAT_ICONS[d.cat] || '' : '';
  $('#rIco').hidden = !d.cat;
  const n = d.next;
  $('#rNext').innerHTML = n
    ? `<span class="pre">${esc(n.pre)}${n.label ? ':' : ''}</span>${n.cat ? `<span class="ico">${CAT_ICONS[n.cat]}</span>` : ''}${n.label ? `<span>${esc(n.label)}</span>` : ''}`
    : '';
  el.style.setProperty('--seg', COLORS[d.type]);
  el.classList.toggle('is-paused', paused);
  el.classList.toggle('is-preview', d.preview);
  updateMain();
  layout();
}

function finishView() {
  if (!runner) return;
  stopLoop();
  keepAwake('run', false);
  el.style.setProperty('--seg', COLORS.done);
  el.classList.remove('is-paused', 'is-preview');
  $('#rPhase').textContent = 'Workout beendet';
  $('#rInfo').textContent = runner.title || '';
  $('#rName').textContent = 'Geschafft!';
  $('#rIco').hidden = true;
  $('#rNext').innerHTML = '<span class="pre">Gesamtdauer</span>';
  $('#rBar').style.width = '100%';
  $('#rAll').style.width = '100%';
  $('#rCtrl').hidden = false;
  el.classList.add('is-done');
  updateMain();
  layout();
  drawTime();
}

function layout() {
  if (!runner || el.hidden) return;
  const nb = $('#nameBox'), ico = $('#rIco');
  if (!ico.hidden) { const sz = Math.min(nb.clientHeight * 0.9, nb.clientWidth * 0.22); ico.style.width = ico.style.height = sz + 'px'; }
  fit($('#rName'), $('#nameWrap'));
  fit($('#rNext'), $('#nextBox'));
  timePattern = '';
  drawTime();
}

function drawTime() {
  if (!runner) return;
  const s = runner.seg, now = Date.now();
  let txt;
  if (runner.finished) txt = fmt(runner.totalElapsed());
  else if (s.open) { txt = fmt(runner.elapsed(now)); $('#rBar').style.width = '0%'; }
  else {
    const l = runner.left(now);
    txt = fmtRun(l);
    $('#rBar').style.width = Math.min(100, Math.max(0, (1 - l / s.dur) * 100)) + '%';
  }
  if (!runner.finished) {
    const done = prefix[runner.idx] + (s.open ? 0 : Math.min(s.dur, runner.elapsed(now)));
    $('#rAll').style.width = Math.min(100, (done / planned) * 100) + '%';
  }
  const t = $('#rTime');
  if (t.textContent !== txt) t.textContent = txt;
  const pat = txt.replace(/\d/g, '8');
  if (pat !== timePattern) { timePattern = pat; t.textContent = pat; fit(t, $('#timeBox')); t.textContent = txt; }
}

function updateMain() {
  const m = $('#rMain');
  if (!runner) return;
  if (runner.finished) m.innerHTML = `${UI.check}<span>Fertig</span>`;
  else if (runner.seg.open || runner.paused) m.innerHTML = `${UI.play}<span>Weiter</span>`;
  else m.innerHTML = `${UI.pause}<span>Pause</span>`;
  m.setAttribute('aria-label', m.textContent);
}

/* Steuerung blendet sich während des Laufens aus; ein Tipp holt sie zurück. */
const canHide = () => runner && !runner.finished && !runner.paused && !runner.seg.open;
function showCtrl(sticky) {
  clearTimeout(ctrlTimer);
  const c = $('#rCtrl'), wasHidden = c.hidden;
  c.hidden = false;
  if (wasHidden) layout();
  if (!sticky && canHide()) ctrlTimer = setTimeout(hideCtrl, 4000);
}
function hideCtrl() { if (!canHide()) return; $('#rCtrl').hidden = true; layout(); }

el.addEventListener('click', e => {
  if (!runner || e.target.closest('#rCtrl')) return;
  if ($('#rCtrl').hidden) showCtrl(false); else hideCtrl();
});
$('#rCtrl').addEventListener('click', () => { if (runner && !$('#rCtrl').hidden) showCtrl(false); });
$('#rMain').addEventListener('click', () => command('toggle'));
$('#rSkip').addEventListener('click', () => command('skip'));
$('#rPrev').addEventListener('click', () => command('prev'));
$('#rStop').addEventListener('click', e => {
  if (runner && runner.finished) return exitRun();
  arm(e.currentTarget, 'Sicher?', () => exitRun());
});
$('#rFull').addEventListener('click', toggleFullscreen);

export function toggleFullscreen() {
  const b = $('#rFull');
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else {
      const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      if (p) p.catch(() => { b.disabled = true; });
      else b.disabled = true;
    }
  } catch (e) { b.disabled = true; }
}
if (!document.documentElement.requestFullscreen) $('#rFull').hidden = true;

document.addEventListener('keydown', e => {
  if (nav.currentView() !== 'run' || !runner || e.target.matches('input, textarea')) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); command('toggle'); }
  else if (e.code === 'ArrowRight') command('skip');
  else if (e.code === 'ArrowLeft') command('prev');
  else if (e.key === 'f') toggleFullscreen();
});

let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });
document.addEventListener('fullscreenchange', () => setTimeout(layout, 150));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout());

nav.register('run', {
  el,
  show() { el.classList.remove('is-done'); setTimeout(layout, 30); },
  hide() { el.classList.remove('is-done'); },
  onBack() {
    if (leaving) { leaving = false; return true; }
    if (!runner || runner.finished) { exitRun({ fromBack: true }); return true; }
    const stop = $('#rStop');
    if (stop.classList.contains('armed')) { exitRun({ fromBack: true }); return true; }
    showCtrl(true);
    arm(stop, 'Sicher?', () => exitRun());
    toast('Nochmal «Zurück» zum Beenden');
    return false;
  }
});
