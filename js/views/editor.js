// Editor: Workout -> Blöcke -> Übungen. Dazu die Übungsauswahl (Archiv + eigene Übungen).
import { $, esc, uid, clampInt, fmt, secTxt, minTxt, clone } from '../util.js';
import { UI, catIcon, CAT_ICONS } from '../icons.js';
import { CATS } from '../library.js';
import { settings, getWorkout, upsertWorkout, deleteWorkout, newBlock, library, addCustom, findExercise } from '../store.js';
import { buildSegments, workoutStats } from '../segments.js';
import { launch } from '../launch.js';
import { sheet, toast, arm, disarm } from '../ui.js';
import * as nav from '../nav.js';

const el = document.getElementById('v-editor');
const pk = document.getElementById('v-picker');

let draft = null, isNew = false, openBi = -1, moreOpen = {}, dirty = false, startAfter = false, original = '';

const FIELDS = [
  { f: 'work', label: 'Übung', step: 5, min: 5, max: 3600 },
  { f: 'rest', label: 'Pause (Stationswechsel)', step: 5, min: 0, max: 3600 },
  { f: 'rounds', label: 'Runden', step: 1, min: 1, max: 50 },
  { f: 'roundRest', label: 'Rundenpause', step: 15, min: 0, max: 3600 }
];
const PRESETS = { work: [20, 30, 40, 45, 60], rest: [0, 10, 15, 20, 30], rounds: [1, 2, 3, 4, 5], roundRest: [30, 60, 90, 120, 180] };
const fieldDef = f => FIELDS.find(F => F.f === f);
const chipTxt = (f, v) => (f === 'rounds' ? String(v) : v >= 60 ? fmt(v) : v + ' s');
const bcol = bi => `var(--b${(bi % 6) + 1})`;
const markDirty = () => { dirty = JSON.stringify(draft) !== original; };

el.innerHTML = `
  <div class="page narrow editor">
    <header class="bar">
      <button type="button" class="icon-btn" id="edBack" aria-label="Zurück">${UI.back}</button>
      <span class="bar-title" id="edHead">Workout bearbeiten</span>
      <span class="bar-gap"></span>
      <span class="sum" id="edSum"></span>
    </header>
    <div class="ed-title">
      <label class="lbl" for="edName">Name</label>
      <input type="text" id="edName" class="title-in" placeholder="Name des Workouts" maxlength="60" autocomplete="off">
    </div>
    <div id="blocks" class="ed-blocks"></div>
    <button type="button" class="btn ghost wide dashed" id="addBlock">${UI.plus}<span>Block hinzufügen</span></button>
    <p class="fine">Die Pause zwischen den Übungen dient zum Stationswechsel. Die Rundenpause kommt nach jeder Runde und vor dem nächsten Block. «Offen» heisst: Es geht erst per Tipp weiter.</p>
    <button type="button" class="btn ghost danger" id="edDel">${UI.trash}<span>Workout löschen</span></button>
    <div class="sticky-bar">
      <button type="button" class="btn" id="edSave">${UI.check}<span>Speichern</span></button>
      <button type="button" class="btn cta" id="edStart" title="Speichert und startet">${UI.play}<span>Starten</span></button>
    </div>
  </div>`;

function blockMeta(b) {
  return `<b>${b.items.length}</b> Übungen · <b>${secTxt(b.work)}</b> · Pause <b>${secTxt(b.rest)}</b> · <b>${b.rounds}</b>× · Rundenpause <b>${b.roundRestOpen ? 'offen' : secTxt(b.roundRest)}</b>`;
}

function renderBlocks() {
  $('#blocks').innerHTML = draft.blocks.map((b, bi) => bi !== openBi ? `
    <button type="button" class="ed-block closed" style="--bc:${bcol(bi)}" data-open="${bi}">
      <span class="eb-head"><span class="eb-name">${esc(b.name || 'Block ' + (bi + 1))}</span><span class="eb-edit">${UI.edit}</span></span>
      <span class="eb-meta">${blockMeta(b)}</span>
      ${b.items.length ? `<span class="pills">${b.items.map(it => `<span class="pill">${catIcon(it.cat)}${esc(it.name)}</span>`).join('')}</span>` : '<span class="eb-meta">Noch keine Übungen.</span>'}
    </button>` : `
    <section class="ed-block open" style="--bc:${bcol(bi)}" aria-label="Block ${bi + 1}">
      <div class="eb-head">
        <input type="text" class="title-in block-in" data-bi="${bi}" data-f="name" value="${esc(b.name)}" placeholder="Name des Blocks" aria-label="Name von Block ${bi + 1}" maxlength="40">
        <button type="button" class="btn small" data-close="1">Fertig ${UI.chevUp}</button>
      </div>
      <div>
        <span class="lbl">Übungen in dieser Reihenfolge</span>
        ${b.items.length ? `<ol class="sel">${b.items.map((it, i) => `<li>${catIcon(it.cat)}<span class="nm">${esc(it.name)}</span>
          <button type="button" data-mv="-1" data-bi="${bi}" data-i="${i}" aria-label="${esc(it.name)} nach oben" ${i === 0 ? 'disabled' : ''}>${UI.chevUp}</button>
          <button type="button" data-mv="1" data-bi="${bi}" data-i="${i}" aria-label="${esc(it.name)} nach unten" ${i === b.items.length - 1 ? 'disabled' : ''}>${UI.chevDown}</button>
          <button type="button" data-rm="${i}" data-bi="${bi}" aria-label="${esc(it.name)} entfernen">${UI.close}</button></li>`).join('')}</ol>`
          : '<div class="sel-empty">Noch keine Übungen ausgewählt.</div>'}
        <button type="button" class="btn pickbtn" data-pick="${bi}">${UI.plus}<span>Übungen auswählen</span></button>
      </div>
      <div class="tset">
        ${FIELDS.map(F => {
          const key = bi + '-' + F.f, isOpenRR = F.f === 'roundRest' && b.roundRestOpen;
          const pres = PRESETS[F.f], val = b[F.f], inPres = pres.includes(val);
          const chips = pres.map(v => `<button type="button" data-set="${v}" data-bi="${bi}" data-f="${F.f}" aria-pressed="${!isOpenRR && v === val}">${chipTxt(F.f, v)}</button>`).join('')
            + (!inPres && !isOpenRR ? `<button type="button" data-set="${val}" data-bi="${bi}" data-f="${F.f}" aria-pressed="true">${chipTxt(F.f, val)}</button>` : '')
            + (F.f === 'roundRest' ? `<button type="button" class="word" data-rropen="${bi}" aria-pressed="${isOpenRR}">offen</button>` : '')
            + `<button type="button" class="more" data-more="${key}" aria-expanded="${!!moreOpen[key]}">Andere …</button>`;
          return `<div><span class="lbl">${F.label}${isOpenRR ? ' · weiter erst mit Tipp' : ''}</span><div class="seg">${chips}</div>
            ${moreOpen[key] ? `<div class="stepper inline"><button type="button" data-bump="-${F.step}" data-bi="${bi}" data-f="${F.f}" aria-label="${F.label} verringern">${UI.minus}</button>
            <input type="number" inputmode="numeric" id="${F.f}-${b.id}" data-bi="${bi}" data-f="${F.f}" value="${val}" min="${F.min}" max="${F.max}" aria-label="${F.label}">
            <span class="unit">${F.f === 'rounds' ? '×' : 's'}</span>
            <button type="button" data-bump="${F.step}" data-bi="${bi}" data-f="${F.f}" aria-label="${F.label} erhöhen">${UI.plus}</button></div>` : ''}</div>`;
        }).join('')}
      </div>
      ${draft.blocks.length > 1 ? `<div class="eb-foot">
        ${bi > 0 ? `<button type="button" class="btn small ghost" data-bmv="-1" data-bi="${bi}">${UI.chevUp}<span>Block nach oben</span></button>` : ''}
        ${bi < draft.blocks.length - 1 ? `<button type="button" class="btn small ghost" data-bmv="1" data-bi="${bi}">${UI.chevDown}<span>Block nach unten</span></button>` : ''}
        <button type="button" class="btn small ghost danger" data-delblock="${bi}">${UI.trash}<span>Block entfernen</span></button></div>` : ''}
    </section>`).join('');
  updateSum();
}

function updateSum() {
  const st = workoutStats(draft);
  $('#edSum').textContent = `${minTxt(st.sec)}${st.open ? ' + offen' : ''}`;
  markDirty();
}

function openEditor(params = {}) {
  if (params.draft) { draft = params.draft; isNew = true; }
  else if (params.id) { const src = getWorkout(params.id); draft = src ? clone(src) : null; isNew = !src; }
  if (!draft) { draft = { id: uid(), name: '', blocks: [newBlock('Warm-up'), newBlock('Parcours')] }; isNew = true; }
  original = params.draft ? '' : JSON.stringify(draft);
  dirty = !!params.draft;
  openBi = isNew && !params.draft ? 0 : -1;
  moreOpen = {};
  $('#edName').value = draft.name;
  $('#edHead').textContent = isNew ? 'Neues Workout' : 'Workout bearbeiten';
  $('#edDel').hidden = isNew;
  disarm($('#edDel'));
  renderBlocks();
  if (isNew && !params.draft) setTimeout(() => $('#edName').focus(), 50);
}

$('#blocks').addEventListener('input', e => {
  const t = e.target, bi = t.dataset.bi, f = t.dataset.f;
  if (bi == null || !f) return;
  const b = draft.blocks[bi];
  if (f === 'name') b.name = t.value;
  else { const F = fieldDef(f); if (t.value !== '') b[f] = clampInt(t.value, F.min, F.max); }
  updateSum();
});
$('#blocks').addEventListener('change', e => {
  const t = e.target, F = t.dataset.f && fieldDef(t.dataset.f);
  if (F) { const b = draft.blocks[t.dataset.bi]; b[F.f] = clampInt(t.value, F.min, F.max); if (F.f === 'roundRest') b.roundRestOpen = false; renderBlocks(); }
});
$('#blocks').addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  const b = t.dataset.bi != null ? draft.blocks[t.dataset.bi] : null;
  if (t.dataset.open != null) {
    openBi = +t.dataset.open; renderBlocks();
    const n = $('#blocks').children[openBi];
    if (n) n.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return;
  }
  if (t.dataset.close) { openBi = -1; renderBlocks(); return; }
  if (t.dataset.set != null) {
    const F = fieldDef(t.dataset.f); b[F.f] = clampInt(t.dataset.set, F.min, F.max);
    if (F.f === 'roundRest') b.roundRestOpen = false;
    renderBlocks(); return;
  }
  if (t.dataset.rropen != null) { b.roundRestOpen = true; renderBlocks(); return; }
  if (t.dataset.more) { moreOpen[t.dataset.more] = !moreOpen[t.dataset.more]; renderBlocks(); return; }
  if (t.dataset.bump) {
    const F = fieldDef(t.dataset.f);
    b[F.f] = clampInt(b[F.f] + parseInt(t.dataset.bump, 10), F.min, F.max);
    if (F.f === 'roundRest') b.roundRestOpen = false;
    const id = t.dataset.f + '-' + b.id; renderBlocks();
    const inp = document.getElementById(id);
    if (inp) inp.parentElement.querySelector(`[data-bump="${t.dataset.bump}"]`).focus();
    return;
  }
  if (t.dataset.delblock != null) {
    arm(t, 'Wirklich entfernen?', () => { draft.blocks.splice(+t.dataset.delblock, 1); openBi = -1; renderBlocks(); });
    return;
  }
  if (t.dataset.bmv) {
    const i = +t.dataset.bi, j = i + +t.dataset.bmv;
    [draft.blocks[i], draft.blocks[j]] = [draft.blocks[j], draft.blocks[i]];
    openBi = j; renderBlocks(); return;
  }
  if (t.dataset.mv) {
    const i = +t.dataset.i, j = i + +t.dataset.mv;
    if (j >= 0 && j < b.items.length) { [b.items[i], b.items[j]] = [b.items[j], b.items[i]]; renderBlocks(); }
    const again = $('#blocks').querySelector(`[data-mv="${t.dataset.mv}"][data-i="${j}"]`);
    if (again && !again.disabled) again.focus();
    return;
  }
  if (t.dataset.rm != null) { b.items.splice(+t.dataset.rm, 1); renderBlocks(); return; }
  if (t.dataset.pick != null) openPicker(+t.dataset.pick);
});
$('#edName').addEventListener('input', e => { draft.name = e.target.value; markDirty(); });
$('#edName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
$('#addBlock').addEventListener('click', () => {
  draft.blocks.push(newBlock('Block ' + (draft.blocks.length + 1)));
  openBi = draft.blocks.length - 1; renderBlocks();
  const n = $('#blocks').children[openBi]; if (n) n.scrollIntoView({ block: 'start', behavior: 'smooth' });
});

function commit() {
  const saved = upsertWorkout(draft);
  draft = clone(saved);
  original = JSON.stringify(draft);
  dirty = false; isNew = false;
  return saved;
}
$('#edSave').addEventListener('click', () => { commit(); toast('Gespeichert'); nav.back(); });
$('#edStart').addEventListener('click', () => {
  const w = commit();
  const segs = buildSegments(w, { prep: settings.prep });
  if (!segs.length) { toast('Füge zuerst Übungen hinzu.'); return; }
  toast('Gespeichert');
  nav.back().then(() => launch(segs, w.name));
});
$('#edBack').addEventListener('click', () => nav.back());
$('#edDel').addEventListener('click', e => arm(e.currentTarget, 'Wirklich löschen?', () => {
  deleteWorkout(draft.id); dirty = false; toast('Gelöscht');
  nav.home();
}));

function askSave() {
  sheet({
    title: 'Änderungen speichern?',
    body: `<p class="muted">Du hast an «${esc(draft.name || 'Neues Workout')}» etwas geändert.</p>
      <div class="stack-actions">
        <button type="button" class="btn cta" data-a="save">${UI.check}<span>Speichern</span></button>
        <button type="button" class="btn ghost danger" data-a="drop">Verwerfen</button>
      </div>`,
    onMount(api) {
      api.el.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'save') commit(); else dirty = false;
        api.close().then(() => nav.back());
      });
    }
  });
}

nav.register('editor', {
  el,
  show(params) { if (params) openEditor(params); else renderBlocks(); },
  onBack() {
    if (dirty && draft && draft.blocks.some(b => b.items.length)) { setTimeout(askSave, 0); return false; }
    return true;
  }
});

/* =====================================================================
   Übungsauswahl
   ===================================================================== */
let pickBi = 0, newCat = 'body', query = '';

pk.innerHTML = `
  <div class="pk-head">
    <div class="pk-titles"><p class="eyebrow" id="pkCount"></p><h1 id="pkTitle">Übungen wählen</h1></div>
    <button type="button" class="btn cta small" id="pkDone">${UI.check}<span>Fertig</span></button>
  </div>
  <div class="pk-search"><span class="ui-ico">${UI.search}</span><input type="search" id="pkQ" placeholder="Übung suchen oder neue eingeben" autocomplete="off" enterkeyhint="done"></div>
  <div class="pk-body"><div class="pk-inner">
    <div id="pkNew"></div>
    <div id="pkCats"></div>
  </div></div>`;

function openPicker(bi) {
  pickBi = bi; query = '';
  $('#pkQ').value = '';
  nav.open('picker');
}

function renderPicker() {
  const b = draft.blocks[pickBi];
  $('#pkTitle').textContent = 'Übungen für ' + (b.name || 'Block ' + (pickBi + 1));
  $('#pkCount').textContent = b.items.length ? `${b.items.length} ausgewählt` : 'Antippen zum Hinzufügen';
  const q = query.trim().toLowerCase();
  const lib = library().filter(x => !q || x.name.toLowerCase().includes(q));
  const exact = q && findExercise(q);
  $('#pkNew').innerHTML = q && !exact ? `
    <section class="card newex">
      <p><b>«${esc(query.trim())}»</b> gibt es noch nicht. Als eigene Übung anlegen?</p>
      <div class="catpick" role="radiogroup" aria-label="Symbol">${CATS.map(c => `<button type="button" role="radio" data-ncat="${c.id}" aria-checked="${c.id === newCat}">${catIcon(c.id)}${c.name}</button>`).join('')}</div>
      <button type="button" class="btn cta small" id="neAdd">${UI.plus}<span>Anlegen &amp; hinzufügen</span></button>
    </section>` : '';
  $('#pkCats').innerHTML = CATS.map(c => {
    const ex = lib.filter(x => x.cat === c.id);
    if (!ex.length) return '';
    return `<section class="cat"><h2>${catIcon(c.id)}${c.name}</h2><div class="chips">${ex.map(x => {
      const pos = b.items.findIndex(it => it.name === x.name);
      return `<button type="button" class="chip ex${pos >= 0 ? ' on' : ''}" data-ex="${esc(x.name)}" data-cat="${x.cat}" aria-pressed="${pos >= 0}">
        ${pos >= 0 ? `<span class="num">${pos + 1}</span>` : catIcon(x.cat)}${esc(x.name)}${x.own ? '<span class="own">eigen</span>' : ''}</button>`;
    }).join('')}</div></section>`;
  }).join('') || (q ? '' : '<p class="muted">Keine Übungen.</p>');
}

$('#pkCats').addEventListener('click', e => {
  const c = e.target.closest('[data-ex]'); if (!c) return;
  const b = draft.blocks[pickBi], name = c.dataset.ex;
  const pos = b.items.findIndex(it => it.name === name);
  if (pos >= 0) b.items.splice(pos, 1); else b.items.push({ name, cat: c.dataset.cat });
  const body = $('.pk-body', pk), y = body.scrollTop;
  renderPicker(); body.scrollTop = y;
});
$('#pkNew').addEventListener('click', e => {
  const c = e.target.closest('[data-ncat]');
  if (c) { newCat = c.dataset.ncat; renderPicker(); return; }
  if (e.target.closest('#neAdd')) {
    const ex = addCustom(query, newCat);
    if (ex) {
      const b = draft.blocks[pickBi];
      if (!b.items.some(it => it.name === ex.name)) b.items.push({ name: ex.name, cat: ex.cat });
      toast(`«${ex.name}» angelegt`);
    }
    query = ''; $('#pkQ').value = ''; renderPicker();
  }
});
$('#pkQ').addEventListener('input', e => { query = e.target.value; renderPicker(); });
$('#pkQ').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
$('#pkDone').addEventListener('click', () => nav.back());

nav.register('picker', {
  el: pk,
  show() { renderPicker(); $('.pk-body', pk).scrollTop = 0; },
  hide() { renderBlocks(); }
});
