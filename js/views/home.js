// Startseite: Schnelles Workout (Generator), Meine Workouts, Timer, Grosser Bildschirm.
import { $, esc, fmt, minTxt, plural, clampInt, isWide } from '../util.js';
import { UI, MARK, CAT_ICONS } from '../icons.js';
import { EQUIPMENT } from '../library.js';
import { DURATIONS, LEVELS, FOCUS, generate } from '../generator.js';
import { settings, saveSettings, workouts, getWorkout, deleteWorkout, duplicateWorkout, moveWorkout, bus, storageOk } from '../store.js';
import { buildSegments, workoutStats, countdownSegs, intervalSegs } from '../segments.js';
import { link } from '../link.js';
import { launch, remoteReady } from '../launch.js';
import { remoteRun, onRemoteChange } from './remote.js';
import { resumeSaved, savedRunInfo } from './run.js';
import { clearRun } from '../store.js';
import { sheet, toast, arm } from '../ui.js';
import * as nav from '../nav.js';

const el = document.getElementById('v-home');
const g = settings.gen;

const SCREEN_ART = `<svg viewBox="0 0 160 96" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="44" y="8" width="108" height="72" rx="8"/>
  <path d="M66 44h64" stroke="var(--accent)" stroke-width="9"/>
  <path d="M66 26h34M66 62h48" opacity=".4"/>
  <rect x="8" y="34" width="28" height="54" rx="6" fill="var(--surface)"/>
  <path d="M18 80h8"/>
  <circle cx="22" cy="56" r="6" stroke="var(--accent)"/>
</svg>`;

el.innerHTML = `
<div class="page home">
  <header class="topbar">
    <div class="brand">${MARK}<span class="brand-name">Parcours</span><span class="brand-sub">Timer</span></div>
    <div class="topbar-right">
      <button type="button" class="link-pill" id="hLink" hidden></button>
      <button type="button" class="icon-btn" id="hSettings" aria-label="Einstellungen">${UI.sliders}</button>
    </div>
  </header>

  <div id="hBanners"></div>

  <div class="home-grid">
    <section class="hero" aria-labelledby="genH">
      <p class="eyebrow">Schnelles Workout</p>
      <h1 id="genH" class="hero-title">Wie viel Zeit hast&nbsp;du?</h1>
      <div class="dur" id="gDur" role="radiogroup" aria-label="Dauer in Minuten">
        ${DURATIONS.map(m => `<button type="button" role="radio" data-min="${m}"><b>${m}</b><span>min</span></button>`).join('')}
      </div>
      <div class="hero-field">
        <span class="lbl" id="eqL">Ausrüstung <em>Körpergewicht geht immer</em></span>
        <div class="chips" id="gEq" aria-labelledby="eqL">
          ${EQUIPMENT.map(e => `<button type="button" class="chip" data-eq="${e.id}"><span class="ico">${CAT_ICONS[e.icon]}</span>${e.name}</button>`).join('')}
        </div>
      </div>
      <div class="hero-field">
        <span class="lbl" id="lvL">Intensität</span>
        <div class="segctl" id="gLvl" role="radiogroup" aria-labelledby="lvL">
          ${LEVELS.map(l => `<button type="button" role="radio" data-lvl="${l.id}">${l.name}<small>${l.work}/${l.rest} s</small></button>`).join('')}
        </div>
      </div>
      <div class="hero-more" id="gMore" hidden>
        <div class="hero-field">
          <span class="lbl" id="foL">Fokus</span>
          <div class="chips" id="gFocus" role="radiogroup" aria-labelledby="foL">
            ${FOCUS.map(f => `<button type="button" class="chip" role="radio" data-focus="${f.id}">${f.name}</button>`).join('')}
          </div>
        </div>
        <div class="hero-field toggles">
          <label class="switch"><input type="checkbox" id="gWarm"><span class="track"></span>Warm-up <em>ab 15 min</em></label>
          <label class="switch"><input type="checkbox" id="gCool"><span class="track"></span>Cool-down <em>ab 20 min</em></label>
        </div>
      </div>
      <div class="hero-foot">
        <button type="button" class="btn-text" id="gMoreBtn" aria-expanded="false" aria-controls="gMore">Mehr Optionen ${UI.chevDown}</button>
        <button type="button" class="btn cta" id="gGo"><span>Workout erstellen</span>${UI.arrowRight}</button>
      </div>
    </section>

    <div class="home-side">
      <section class="sec" aria-labelledby="woH">
        <div class="sec-head"><h2 id="woH">Meine Workouts</h2><button type="button" class="btn small" id="hNew">${UI.plus}<span>Neu</span></button></div>
        <ul class="wo-list" id="hList"></ul>
        <p class="fine" id="hStore"></p>
      </section>

      <section class="sec" aria-labelledby="tiH">
        <h2 id="tiH">Timer</h2>
        <div class="tiles">
          <button type="button" class="tile" id="tCount"><span class="tile-ico">${UI.timer}</span><span class="tile-label">Countdown</span><b class="tile-val" id="tCountV"></b></button>
          <button type="button" class="tile" id="tInt"><span class="tile-ico">${UI.repeat}</span><span class="tile-label">Intervall</span><b class="tile-val" id="tIntV"></b></button>
        </div>
      </section>

      <section class="sec screen-card" id="hScreen" aria-labelledby="scH">
        <div class="screen-art" aria-hidden="true">${SCREEN_ART}</div>
        <div class="screen-text">
          <h2 id="scH">Grosser Bildschirm</h2>
          <p>Timer gross auf Tablet oder Laptop, dein Handy wird zur Fernbedienung. Ohne Internet, ohne Konto.</p>
        </div>
        <div class="screen-actions">
          <button type="button" class="btn" id="hAsDisplay">${UI.screen}<span>Als Anzeige</span></button>
          <button type="button" class="btn" id="hAsRemote">${UI.phone}<span>Als Fernbedienung</span></button>
        </div>
      </section>
    </div>
  </div>
</div>`;

/* ---------- Generator ---------- */
function renderGen() {
  el.querySelectorAll('#gDur [data-min]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.min === g.min)));
  el.querySelectorAll('#gEq [data-eq]').forEach(b => b.setAttribute('aria-pressed', String(g.eq.includes(b.dataset.eq))));
  el.querySelectorAll('#gLvl [data-lvl]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.lvl === g.level)));
  el.querySelectorAll('#gFocus [data-focus]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.focus === g.focus)));
  $('#gWarm').checked = g.warm; $('#gCool').checked = g.cool;
  const extra = g.focus !== 'mix' || !g.warm || !g.cool;
  $('#gMoreBtn').classList.toggle('has-extra', extra);
}
el.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.min) { g.min = +t.dataset.min; saveSettings(); renderGen(); }
  else if (t.dataset.eq) { const i = g.eq.indexOf(t.dataset.eq); if (i >= 0) g.eq.splice(i, 1); else g.eq.push(t.dataset.eq); saveSettings(); renderGen(); }
  else if (t.dataset.lvl) { g.level = +t.dataset.lvl; saveSettings(); renderGen(); }
  else if (t.dataset.focus) { g.focus = t.dataset.focus; saveSettings(); renderGen(); }
});
$('#gWarm').addEventListener('change', e => { g.warm = e.target.checked; saveSettings(); renderGen(); });
$('#gCool').addEventListener('change', e => { g.cool = e.target.checked; saveSettings(); renderGen(); });
$('#gMoreBtn').addEventListener('click', () => {
  const m = $('#gMore'); m.hidden = !m.hidden;
  $('#gMoreBtn').setAttribute('aria-expanded', String(!m.hidden));
});
$('#gGo').addEventListener('click', () => nav.open('preview', { workout: generate(g), generated: true }));

/* ---------- Meine Workouts ---------- */
function renderList() {
  const list = $('#hList');
  if (!workouts.length) {
    list.innerHTML = `<li class="empty">Noch keine eigenen Workouts. Erstelle oben eines und speichere es – oder lege mit «Neu» selbst eines an.</li>`;
  } else {
    list.innerHTML = workouts.map(w => {
      const st = workoutStats(w);
      return `<li class="wo">
        <button type="button" class="wo-main" data-open="${w.id}">
          <span class="wo-name">${esc(w.name || 'Ohne Namen')}</span>
          <span class="wo-meta">${minTxt(st.sec)}${st.open ? ' + offene Pausen' : ''} · ${plural(st.exercises, 'Übung', 'Übungen')} · ${plural(st.blocks, 'Block', 'Blöcke')}</span>
        </button>
        <button type="button" class="icon-btn" data-menu="${w.id}" aria-label="Mehr zu ${esc(w.name)}">${UI.more}</button>
        <button type="button" class="play" data-start="${w.id}" aria-label="${esc(w.name)} starten" ${st.playable ? '' : 'disabled'}>${UI.play}</button>
      </li>`;
    }).join('');
  }
  $('#hStore').textContent = storageOk
    ? 'Gespeichert auf diesem Gerät. Mit «Per Code übergeben» kommt ein Workout aufs Tablet oder zu anderen.'
    : 'Dieser Browser erlaubt gerade kein Speichern. Änderungen gehen beim Schliessen verloren.';
}
$('#hList').addEventListener('click', e => {
  const s = e.target.closest('[data-start]'), o = e.target.closest('[data-open]'), m = e.target.closest('[data-menu]');
  if (s) { const w = getWorkout(s.dataset.start); if (w) launch(buildSegments(w, { prep: settings.prep }), w.name); }
  else if (o) { const w = getWorkout(o.dataset.open); if (w) nav.open('preview', { workout: w }); }
  else if (m) workoutMenu(m.dataset.menu);
});
$('#hNew').addEventListener('click', () => nav.open('editor', { id: null }));

function workoutMenu(id) {
  const w = getWorkout(id);
  if (!w) return;
  const idx = workouts.indexOf(w);
  const sh = sheet({
    title: w.name,
    body: `<div class="menu">
      <button type="button" data-a="edit">${UI.edit}<span>Bearbeiten</span></button>
      <button type="button" data-a="share">${UI.qr}<span>Per Code übergeben</span></button>
      <button type="button" data-a="dup">${UI.copy}<span>Duplizieren</span></button>
      ${idx > 0 ? `<button type="button" data-a="up">${UI.chevUp}<span>Nach oben</span></button>` : ''}
      ${idx < workouts.length - 1 ? `<button type="button" data-a="down">${UI.chevDown}<span>Nach unten</span></button>` : ''}
      ${remoteReady() ? `<button type="button" data-a="local">${UI.phone}<span>Auf diesem Handy starten</span></button>` : ''}
      <button type="button" data-a="del" class="danger">${UI.trash}<span>Löschen</span></button>
    </div>`,
    onMount(api) {
      api.el.addEventListener('click', e => {
        const b = e.target.closest('[data-a]');
        if (!b) return;
        const a = b.dataset.a;
        if (a === 'del') { arm(b, 'Wirklich löschen?', () => { deleteWorkout(id); api.close(); toast('Gelöscht'); }); return; }
        api.close().then(() => {
          if (a === 'edit') nav.open('editor', { id });
          else if (a === 'share') nav.open('share', { workout: w });
          else if (a === 'dup') { duplicateWorkout(id); toast('Kopie erstellt'); }
          else if (a === 'up') moveWorkout(id, -1);
          else if (a === 'down') moveWorkout(id, 1);
          else if (a === 'local') launch(buildSegments(w, { prep: settings.prep }), w.name, { local: true });
        });
      });
    }
  });
}

/* ---------- Timer ---------- */
function renderTimers() {
  $('#tCountV').textContent = fmt(settings.countdown);
  const iv = settings.interval;
  $('#tIntV').textContent = `${iv.work}/${iv.rest} × ${iv.rounds}`;
}

function stepper(id, label, value, unit) {
  return `<div class="stepper-row"><span class="lbl">${label}</span>
    <div class="stepper" data-field="${id}">
      <button type="button" data-d="-1" aria-label="${label} verringern">${UI.minus}</button>
      <output id="st-${id}">${value}</output><span class="unit">${unit}</span>
      <button type="button" data-d="1" aria-label="${label} erhöhen">${UI.plus}</button>
    </div></div>`;
}

$('#tCount').addEventListener('click', () => {
  let sec = settings.countdown;
  const PRE = [60, 180, 300, 600, 900, 1200];
  const sh = sheet({
    title: 'Countdown',
    body: `<div class="big-time" id="cdT">${fmt(sec)}</div>
      <div class="chips center" id="cdPre">${PRE.map(p => `<button type="button" class="chip" data-p="${p}">${p / 60} min</button>`).join('')}</div>
      <div class="stepper-pair">
        <div class="stepper"><button type="button" data-d="-60" aria-label="Eine Minute weniger">${UI.minus}</button><output>Min</output><button type="button" data-d="60" aria-label="Eine Minute mehr">${UI.plus}</button></div>
        <div class="stepper"><button type="button" data-d="-5" aria-label="5 Sekunden weniger">${UI.minus}</button><output>5 s</output><button type="button" data-d="5" aria-label="5 Sekunden mehr">${UI.plus}</button></div>
      </div>
      <button type="button" class="btn cta wide" id="cdGo">${UI.play}<span>${remoteReady() ? 'Auf Anzeige starten' : 'Start'}</span></button>`,
    onMount(api) {
      const upd = () => {
        $('#cdT', api.el).textContent = fmt(sec);
        api.el.querySelectorAll('[data-p]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.p === sec)));
      };
      upd();
      api.el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.p) sec = +b.dataset.p;
        else if (b.dataset.d) sec = clampInt(sec + +b.dataset.d, 5, 5999);
        else if (b.id === 'cdGo') {
          settings.countdown = sec; saveSettings(); renderTimers();
          api.close().then(() => launch(countdownSegs(sec, Math.min(settings.prep, 5)), 'Countdown'));
          return;
        } else return;
        upd();
      });
    }
  });
});

$('#tInt').addEventListener('click', () => {
  const iv = { ...settings.interval };
  const PRE = [{ n: 'Tabata', work: 20, rest: 10, rounds: 8 }, { n: '30/30', work: 30, rest: 30, rounds: 10 }, { n: '40/20', work: 40, rest: 20, rounds: 8 }, { n: '45/15', work: 45, rest: 15, rounds: 10 }];
  const LIM = { work: [5, 600, 5], rest: [0, 600, 5], rounds: [1, 99, 1] };
  sheet({
    title: 'Intervall',
    body: `<div class="chips center" id="ivPre">${PRE.map((p, i) => `<button type="button" class="chip" data-pi="${i}">${p.n}</button>`).join('')}</div>
      ${stepper('work', 'Arbeit', iv.work, 's')}
      ${stepper('rest', 'Pause', iv.rest, 's')}
      ${stepper('rounds', 'Runden', iv.rounds, '×')}
      <p class="sum" id="ivSum"></p>
      <button type="button" class="btn cta wide" id="ivGo">${UI.play}<span>${remoteReady() ? 'Auf Anzeige starten' : 'Start'}</span></button>`,
    onMount(api) {
      const upd = () => {
        ['work', 'rest', 'rounds'].forEach(k => { $('#st-' + k, api.el).textContent = iv[k]; });
        api.el.querySelectorAll('[data-pi]').forEach(b => { const p = PRE[+b.dataset.pi]; b.setAttribute('aria-pressed', String(p.work === iv.work && p.rest === iv.rest && p.rounds === iv.rounds)); });
        $('#ivSum', api.el).textContent = 'Dauer ' + fmt(iv.work * iv.rounds + iv.rest * (iv.rounds - 1)) + ' min';
      };
      upd();
      api.el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.pi) Object.assign(iv, PRE[+b.dataset.pi], { n: undefined });
        else if (b.dataset.d) {
          const f = b.closest('[data-field]').dataset.field, [mn, mx, st] = LIM[f];
          iv[f] = clampInt(iv[f] + st * +b.dataset.d, mn, mx);
        } else if (b.id === 'ivGo') {
          settings.interval = { work: iv.work, rest: iv.rest, rounds: iv.rounds }; saveSettings(); renderTimers();
          api.close().then(() => launch(intervalSegs(settings.interval, settings.prep), 'Intervall'));
          return;
        } else return;
        delete iv.n;
        upd();
      });
    }
  });
});

/* ---------- Grosser Bildschirm & Verbindung ---------- */
$('#hAsDisplay').addEventListener('click', () => {
  if (link.role === 'display' && link.active) nav.open('ready', {});
  else nav.open('pair-display');
});
$('#hAsRemote').addEventListener('click', () => {
  if (link.role === 'remote' && link.active) linkSheet();
  else nav.open('pair-remote');
});
$('#hSettings').addEventListener('click', () => nav.open('settings'));
$('#hLink').addEventListener('click', () => {
  if (link.role === 'display') nav.open('ready', {});
  else linkSheet();
});

function linkSheet() {
  const run = remoteRun();
  sheet({
    title: link.status === 'lost' ? 'Verbindung unterbrochen' : 'Mit Anzeige verbunden',
    body: `<p class="muted">${link.status === 'lost'
      ? 'Die Anzeige ist gerade nicht erreichbar. Ein laufendes Workout läuft dort selbständig weiter.'
      : 'Was du startest, läuft auf der Anzeige. Dieses Handy ist die Fernbedienung.'}</p>
      <div class="menu">
        ${run ? `<button type="button" data-a="remote">${UI.sliders}<span>Fernbedienung öffnen</span></button>` : ''}
        ${link.status === 'lost' ? `<button type="button" data-a="repair">${UI.link}<span>Neu verbinden</span></button>` : ''}
        <button type="button" data-a="close" class="danger">${UI.unlink}<span>Trennen</span></button>
      </div>`,
    onMount(api) {
      api.el.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        api.close().then(() => {
          if (b.dataset.a === 'remote') nav.open('remote');
          else if (b.dataset.a === 'repair') { link.close(); nav.open('pair-remote'); }
          else if (b.dataset.a === 'close') { link.close(); toast('Getrennt'); }
        });
      });
    }
  });
}

function renderLink() {
  const p = $('#hLink');
  const active = link.active;
  p.hidden = !active;
  if (active) {
    const lost = link.status === 'lost';
    p.className = 'link-pill ' + (lost ? 'warn' : 'ok');
    p.innerHTML = `<i></i>${link.role === 'display' ? (lost ? 'Handy getrennt' : 'Handy verbunden') : (lost ? 'Anzeige getrennt' : 'Anzeige verbunden')}`;
  }
  $('#hAsRemote span').textContent = link.role === 'remote' && active ? 'Verbunden' : 'Als Fernbedienung';
  $('#hAsDisplay span').textContent = link.role === 'display' && active ? 'Anzeige offen' : 'Als Anzeige';
  renderBanners();
}

function renderBanners() {
  const out = [];
  const saved = savedRunInfo();
  if (saved) out.push(`<div class="banner"><span>${UI.timer}</span><p><b>Workout läuft noch:</b> ${esc(saved.title)}</p>
    <button type="button" class="btn small primary" data-b="resume">Fortsetzen</button><button type="button" class="btn small ghost" data-b="discard">Verwerfen</button></div>`);
  const rr = link.role === 'remote' ? remoteRun() : null;
  if (rr && !rr.fin) out.push(`<div class="banner accent"><span>${UI.screen}</span><p><b>Läuft auf der Anzeige:</b> ${esc(rr.title)}</p>
    <button type="button" class="btn small primary" data-b="remote">Fernbedienung</button></div>`);
  $('#hBanners').innerHTML = out.join('');
}
$('#hBanners').addEventListener('click', e => {
  const b = e.target.closest('[data-b]'); if (!b) return;
  if (b.dataset.b === 'resume') resumeSaved();
  else if (b.dataset.b === 'discard') { clearRun(); renderBanners(); }
  else if (b.dataset.b === 'remote') nav.open('remote');
});

function layoutClass() { el.classList.toggle('is-wide', isWide()); }

bus.addEventListener('workouts', () => { renderList(); });
bus.addEventListener('settings', () => { if (nav.currentView() === 'home') { renderGen(); renderTimers(); } });
link.on(ev => { if (ev.type === 'status') renderLink(); });
onRemoteChange(() => renderLink());

nav.register('home', {
  el,
  show() { layoutClass(); renderGen(); renderList(); renderTimers(); renderLink(); }
});
