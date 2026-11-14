// Workout per QR-Code übergeben (offline) und empfangene Workouts übernehmen.
import { $, esc, minTxt, plural } from '../util.js';
import { UI } from '../icons.js';
import { qrSvg } from '../qr.js';
import { workoutUrl } from '../codec.js';
import { workouts, upsertWorkout, settings, findExercise, addCustom } from '../store.js';
import { workoutStats, buildSegments } from '../segments.js';
import { keepAwake } from '../wake.js';
import { toast } from '../ui.js';
import { launch } from '../launch.js';
import * as nav from '../nav.js';

/* ---------- Code zeigen ---------- */
const sh = document.getElementById('v-share');
nav.register('share', {
  el: sh,
  show(params) {
    if (!params || !params.workout) return;
    const w = params.workout, url = workoutUrl(w);
    sh.innerHTML = `
      <div class="page narrow">
        <header class="bar"><button type="button" class="icon-btn" data-back aria-label="Zurück">${UI.back}</button><h1 class="bar-title">Per Code übergeben</h1></header>
        <h2 class="share-name">${esc(w.name)}</h2>
        <div class="qr-box big">${qrSvg(url, { ecc: 'L' })}</div>
        <p class="fine center-text">Bildschirm hell stellen und den Code 20–40 cm vor die Kamera halten, bis es piept.</p>
        <ol class="howto">
          <li><b>Auf die Anzeige:</b> Dort «Als Anzeige» öffnen und den Code vor die Kamera halten. Das Workout läuft dann dort – ohne Netz, aber auch ohne Fernbedienung.</li>
          <li><b>Mit anderen teilen:</b> Mit einer normalen Handy-Kamera scannen öffnet das Workout in Parcours.</li>
        </ol>
      </div>`;
    keepAwake('share', true);
  },
  hide() { keepAwake('share', false); }
});
sh.addEventListener('click', e => { if (e.target.closest('[data-back]')) nav.back(); });

/* ---------- Workout auswählen ---------- */
const sp = document.getElementById('v-share-pick');
nav.register('share-pick', {
  el: sp,
  show() {
    sp.innerHTML = `
      <div class="page narrow">
        <header class="bar"><button type="button" class="icon-btn" data-back aria-label="Zurück">${UI.back}</button><h1 class="bar-title">Welches Workout?</h1></header>
        <p class="lead">Das Workout wird als Code angezeigt. Die Anzeige liest ihn mit ihrer Kamera.</p>
        <ul class="pick-list">${workouts.map(w => {
          const st = workoutStats(w);
          return `<li><button type="button" class="pick-item" data-id="${w.id}" ${st.playable ? '' : 'disabled'}><span class="pick-name">${esc(w.name)}</span><span class="pick-meta">${minTxt(st.sec)} · ${plural(st.exercises, 'Übung', 'Übungen')}</span>${UI.chevRight}</button></li>`;
        }).join('') || '<li class="empty">Noch keine Workouts gespeichert.</li>'}</ul>
      </div>`;
  }
});
sp.addEventListener('click', e => {
  if (e.target.closest('[data-back]')) return nav.back();
  const b = e.target.closest('[data-id]');
  if (b) { const w = workouts.find(x => x.id === b.dataset.id); if (w) nav.replace('share', { workout: w }); }
});

/* ---------- Empfangen ---------- */
const im = document.getElementById('v-import');
let incoming = null;
nav.register('import', {
  el: im,
  show(params) {
    if (params && params.workout) incoming = params.workout;
    if (!incoming) return;
    const w = incoming, st = workoutStats(w);
    im.innerHTML = `
      <div class="page narrow">
        <header class="bar"><button type="button" class="icon-btn" data-back aria-label="Zurück">${UI.back}</button><h1 class="bar-title">Workout erhalten</h1></header>
        <div class="card import-card">
          <h2>${esc(w.name)}</h2>
          <p class="muted">${minTxt(st.sec)}${st.open ? ' + offene Pausen' : ''} · ${plural(st.exercises, 'Übung', 'Übungen')} · ${plural(st.blocks, 'Block', 'Blöcke')}</p>
          ${w.blocks.filter(b => b.items.length).map((b, i) => `<p class="import-block" style="--bc:var(--b${(i % 6) + 1})"><b>${esc(b.name)}</b> ${b.items.map(it => esc(it.name)).join(' · ')}</p>`).join('')}
        </div>
        <div class="stack-actions">
          <button type="button" class="btn cta" data-act="save">${UI.check}<span>In «Meine Workouts» speichern</span></button>
          <button type="button" class="btn" data-act="start">${UI.play}<span>Gleich starten</span></button>
        </div>
      </div>`;
  }
});
im.addEventListener('click', e => {
  if (e.target.closest('[data-back]')) return nav.back();
  const b = e.target.closest('[data-act]');
  if (!b || !incoming) return;
  if (b.dataset.act === 'save') {
    incoming.blocks.forEach(bl => bl.items.forEach(it => { if (!findExercise(it.name)) addCustom(it.name, it.cat); }));
    upsertWorkout(incoming); toast('Gespeichert'); incoming = null; nav.back();
  }
  else if (b.dataset.act === 'start') launch(buildSegments(incoming, { prep: settings.prep }), incoming.name);
});
