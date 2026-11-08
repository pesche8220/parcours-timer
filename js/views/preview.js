// Workout-Übersicht: für generierte (noch nicht gespeicherte) und gespeicherte Workouts.
import { $, esc, minTxt, plural, secTxt, clone } from '../util.js';
import { UI, catIcon } from '../icons.js';
import { generate, swapItem, LEVELS } from '../generator.js';
import { settings, upsertWorkout, getWorkout, bus } from '../store.js';
import { buildSegments, workoutStats } from '../segments.js';
import { launch, remoteReady } from '../launch.js';
import { link } from '../link.js';
import { toast } from '../ui.js';
import * as nav from '../nav.js';

const el = document.getElementById('v-preview');
let w = null, generated = false;

const blockSec = b => b.items.length
  ? b.rounds * (b.items.length * b.work + (b.items.length - 1) * b.rest) + (b.rounds - 1) * (b.roundRestOpen ? 0 : b.roundRest)
  : 0;

function render() {
  if (!w) return;
  const st = workoutStats(w);
  const remote = remoteReady();
  const lvl = w.gen ? (LEVELS.find(l => l.id === w.gen.level) || {}).name : null;
  el.innerHTML = `
  <div class="page narrow pv">
    <header class="bar">
      <button type="button" class="icon-btn" data-a="back" aria-label="Zurück">${UI.back}</button>
      <span class="bar-title">${generated ? 'Vorschlag' : 'Workout'}</span>
      <span class="bar-gap"></span>
      ${generated ? `<button type="button" class="btn small" data-a="shuffle">${UI.shuffle}<span>Neu mischen</span></button>` : `<button type="button" class="icon-btn" data-a="share" aria-label="Per Code übergeben">${UI.qr}</button>`}
    </header>
    <div class="pv-head">
      <h1 class="pv-name">${esc(w.name)}</h1>
      <p class="pv-meta"><b>${minTxt(st.sec)}</b>${st.open ? ' + offene Pausen' : ''} · ${plural(st.exercises, 'Übung', 'Übungen')} · ${plural(st.blocks, 'Block', 'Blöcke')}${lvl ? ' · ' + lvl : ''}</p>
      ${generated ? '<p class="fine">Gefällt dir eine Übung nicht? Tippe auf das Tausch-Symbol daneben.</p>' : ''}
    </div>
    <div class="pv-blocks">
      ${w.blocks.filter(b => b.items.length).map((b, bi) => `
        <section class="pv-block" style="--bc:var(--b${(w.blocks.indexOf(b) % 6) + 1})">
          <header><h2>${esc(b.name || 'Block ' + (bi + 1))}</h2><span class="pv-dur">${minTxt(blockSec(b))}</span></header>
          <p class="pv-bmeta">${b.rounds > 1 ? `<b>${b.rounds}</b> Runden · ` : ''}<b>${secTxt(b.work)}</b> Übung${b.rest ? ` · <b>${secTxt(b.rest)}</b> Pause` : ' · ohne Pause'}${b.rounds > 1 ? ` · Rundenpause <b>${b.roundRestOpen ? 'offen' : secTxt(b.roundRest)}</b>` : ''}</p>
          <ol class="pv-items">${b.items.map((it, ii) => `
            <li>${catIcon(it.cat)}<span class="nm">${esc(it.name)}</span>
              ${generated ? `<button type="button" class="icon-btn sm" data-swap="${w.blocks.indexOf(b)}:${ii}" aria-label="${esc(it.name)} tauschen">${UI.swap}</button>` : ''}</li>`).join('')}
          </ol>
        </section>`).join('')}
    </div>
    <div class="pv-actions">
      <div class="pv-secondary">
        ${generated
          ? `<button type="button" class="btn" data-a="save">${UI.check}<span>Speichern</span></button>
             <button type="button" class="btn" data-a="edit">${UI.edit}<span>Anpassen</span></button>`
          : `<button type="button" class="btn" data-a="edit">${UI.edit}<span>Bearbeiten</span></button>
             <button type="button" class="btn" data-a="share">${UI.qr}<span>Per Code</span></button>`}
      </div>
      <button type="button" class="btn cta xl" data-a="start" ${st.playable ? '' : 'disabled'}>${remote ? UI.screen : UI.play}<span>${remote ? 'Auf Anzeige starten' : 'Start'}</span></button>
      ${remote ? `<button type="button" class="btn-text center" data-a="local">Lieber auf diesem Handy starten</button>` : ''}
    </div>
  </div>`;
}

el.addEventListener('click', e => {
  const sw = e.target.closest('[data-swap]');
  if (sw) {
    const [bi, ii] = sw.dataset.swap.split(':').map(Number);
    if (swapItem(w, bi, ii)) {
      render();
      const again = el.querySelector(`[data-swap="${bi}:${ii}"]`);
      if (again) { again.focus(); again.closest('li').classList.add('flash'); }
    } else toast('Keine passende Alternative mehr');
    return;
  }
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const a = b.dataset.a;
  if (a === 'back') nav.back();
  else if (a === 'shuffle') { w = generate(w.gen || settings.gen); render(); el.querySelector('.pv-blocks').classList.add('fade-in'); }
  else if (a === 'save') { w = upsertWorkout(w); generated = false; render(); toast('In «Meine Workouts» gespeichert'); }
  else if (a === 'edit') nav.open('editor', generated ? { draft: clone(w) } : { id: w.id });
  else if (a === 'share') nav.open('share', { workout: w });
  else if (a === 'start') launch(buildSegments(w, { prep: settings.prep }), w.name);
  else if (a === 'local') launch(buildSegments(w, { prep: settings.prep }), w.name, { local: true });
});

bus.addEventListener('workouts', () => {
  if (!w || generated || nav.currentView() !== 'preview') return;
  const fresh = getWorkout(w.id);
  if (fresh) { w = fresh; render(); }
});
link.on(ev => { if (ev.type === 'status' && nav.currentView() === 'preview') render(); });

nav.register('preview', {
  el,
  show(params) {
    if (params && params.workout) { w = params.workout; generated = !!params.generated; }
    else if (w) {   // zurück aus dem Editor: gespeicherte Fassung zeigen
      const fresh = getWorkout(w.id);
      if (fresh) { w = fresh; generated = false; }
    }
    render();
  }
});
