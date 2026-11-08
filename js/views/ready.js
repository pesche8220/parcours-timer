// Anzeige wartet: verbunden mit dem Handy oder mit einem per Code übernommenen Workout.
import { $, esc, minTxt, plural } from '../util.js';
import { UI, catIcon } from '../icons.js';
import { link } from '../link.js';
import { buildSegments, workoutStats } from '../segments.js';
import { settings, upsertWorkout } from '../store.js';
import { startRun, onRunEvent } from './run.js';
import { keepAwake } from '../wake.js';
import { unlock } from '../sound.js';
import { toast } from '../ui.js';
import * as nav from '../nav.js';

const el = document.getElementById('v-ready');
let loaded = null;

function render() {
  const connected = link.role === 'display' && link.active;
  const lost = link.role === 'display' && link.status === 'lost';
  const w = loaded, st = w ? workoutStats(w) : null;
  el.innerHTML = `
  <div class="page ready-page">
    <header class="bar">
      <button type="button" class="icon-btn" data-act="home" aria-label="Zur Übersicht">${UI.back}</button>
      <span class="status-pill ${connected ? (lost ? 'warn' : 'ok') : ''}">${connected ? (lost ? 'Verbindung unterbrochen' : 'Handy verbunden') : 'Ohne Fernbedienung'}</span>
    </header>
    <div class="ready-main">
      ${w ? `
        <p class="eyebrow">Bereit auf diesem Gerät</p>
        <h1 class="ready-title">${esc(w.name)}</h1>
        <p class="ready-meta">${minTxt(st.sec)}${st.open ? ' + offene Pausen' : ''} · ${plural(st.exercises, 'Übung', 'Übungen')} · ${plural(st.blocks, 'Block', 'Blöcke')}</p>
        <div class="ready-blocks">${w.blocks.filter(b => b.items.length).map((b, i) => `
          <div class="ready-block" style="--bc:var(--b${(i % 6) + 1})"><b>${esc(b.name || 'Block ' + (i + 1))}</b>
          <span>${b.items.map(it => esc(it.name)).join(' · ')}</span></div>`).join('')}
        </div>
        <div class="ready-actions">
          <button type="button" class="btn cta xl" data-act="start">${UI.play}<span>Start</span></button>
          <button type="button" class="btn" data-act="save">Speichern</button>
        </div>` : `
        <div class="ready-art" aria-hidden="true">${ART}</div>
        <h1 class="ready-title">${lost ? 'Kurz getrennt' : 'Bereit.'}</h1>
        <p class="ready-lead">${lost
          ? 'Das Handy ist gerade nicht erreichbar. Sobald es wieder da ist, geht es weiter.'
          : 'Wähle am Handy ein Workout und tippe auf <b>Start</b>. Der Timer läuft dann hier.'}</p>`}
    </div>
    <div class="ready-foot">
      ${connected ? `<button type="button" class="btn ghost" data-act="disconnect">${UI.unlink}<span>Trennen</span></button>`
        : `<button type="button" class="btn ghost" data-act="pair">${UI.link}<span>Mit Handy verbinden</span></button>`}
      ${lost ? `<button type="button" class="btn ghost" data-act="pair">${UI.link}<span>Neu verbinden</span></button>` : ''}
    </div>
  </div>`;
}

el.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'home') nav.back();
  else if (a === 'start' && loaded) { unlock(); startRun(buildSegments(loaded, { prep: settings.prep }), loaded.name); }
  else if (a === 'save' && loaded) { upsertWorkout(loaded); toast('In «Meine Workouts» gespeichert'); b.disabled = true; }
  else if (a === 'disconnect') { link.close(); loaded = null; nav.back(); }
  else if (a === 'pair') { link.close(); nav.replace('pair-display'); }
});

link.on(ev => { if (ev.type === 'status' && nav.currentView() === 'ready') render(); });
onRunEvent(type => { if (type === 'exit' && loaded && nav.currentView() !== 'run') render(); });

nav.register('ready', {
  el,
  show(params) {
    if (params && params.workout) loaded = params.workout;
    else if (params) loaded = null;
    unlock();
    keepAwake('ready', true);
    render();
  },
  hide() { keepAwake('ready', false); }
});

const ART = `<svg viewBox="0 0 240 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <rect x="70" y="14" width="150" height="96" rx="10"/><path d="M100 62h90" stroke="var(--accent)" stroke-width="10"/>
  <path d="M100 40h50M100 84h70" opacity=".45"/>
  <rect x="16" y="44" width="38" height="66" rx="7"/><path d="M30 100h10"/>
  <path d="M58 70c4-6 8-6 12 0" stroke="var(--accent)" stroke-dasharray="2 6"/>
</svg>`;
