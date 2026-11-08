// Speicherung im Browser (localStorage). Schlüssel kompatibel mit Prototyp v4.
import { BUILTIN, builtinByName, CATS } from './library.js';
import { uid, clampInt, clone } from './util.js';

const KEY = 'parcours.workouts.v1';
const CKEY = 'parcours.custom.v1';
const QKEY = 'parcours.quick.v1';      // alt: nur Countdown-Sekunden
const SKEY = 'parcours.settings.v1';
const RKEY = 'parcours.run.v1';

export const bus = new EventTarget();
export const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));

export let storageOk = true;
function load(k) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; }
  catch (e) { storageOk = false; return null; }
}
function store(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) { storageOk = false; return false; }
}
function drop(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } }

/* ---------- Einstellungen ---------- */
const DEFAULTS = {
  theme: 'auto',            // auto | light | dark
  volume: 'normal',         // off | normal | loud
  prep: 10,                 // Sekunden «Bereit machen»
  countdown: 300,
  interval: { work: 40, rest: 20, rounds: 8 },
  gen: { min: 30, eq: [], level: 2, focus: 'mix', warm: true, cool: true }
};
export const settings = Object.assign(clone(DEFAULTS), load(SKEY) || {});
settings.interval = Object.assign(clone(DEFAULTS.interval), settings.interval);
settings.gen = Object.assign(clone(DEFAULTS.gen), settings.gen);
{
  const q = load(QKEY);
  if (q != null && !load(SKEY)) settings.countdown = clampInt(q, 5, 5999);
}
export function saveSettings() { store(SKEY, settings); emit('settings'); }

/* ---------- Eigene Übungen ---------- */
export let custom = load(CKEY);
if (!Array.isArray(custom)) custom = [];
custom = custom.filter(x => x && x.name).map(x => ({ name: String(x.name).slice(0, 40), cat: CATS.some(c => c.id === x.cat) ? x.cat : 'body' }));
export function saveCustom() { store(CKEY, custom); emit('custom'); }

/** Alle Übungen (Archiv + eigene) für die Auswahl */
export function library() {
  return [
    ...BUILTIN.map(x => ({ name: x.name, cat: x.cat, own: false })),
    ...custom.map(x => ({ name: x.name, cat: x.cat, own: true }))
  ];
}
export function findExercise(name) {
  const n = String(name).trim().toLowerCase();
  const b = builtinByName(n);
  if (b) return { name: b.name, cat: b.cat, own: false };
  const c = custom.find(x => x.name.toLowerCase() === n);
  return c ? { name: c.name, cat: c.cat, own: true } : null;
}
export function addCustom(name, cat) {
  name = String(name).trim().slice(0, 40);
  if (!name) return null;
  const ex = findExercise(name);
  if (ex) return ex;
  custom.push({ name, cat });
  saveCustom();
  return { name, cat, own: true };
}
export function updateCustom(oldName, name, cat) {
  const c = custom.find(x => x.name === oldName);
  if (!c) return false;
  name = String(name).trim().slice(0, 40);
  if (!name) return false;
  if (name.toLowerCase() !== oldName.toLowerCase() && findExercise(name)) return false;
  c.name = name; c.cat = cat;
  // Workouts mitziehen
  workouts.forEach(w => w.blocks.forEach(b => b.items.forEach(it => {
    if (it.name === oldName) { it.name = name; it.cat = cat; }
  })));
  saveCustom(); saveWorkouts();
  return true;
}
export function deleteCustom(name) {
  custom = custom.filter(x => x.name !== name);
  saveCustom();
}
export const customUsage = name => workouts.reduce((n, w) => n + w.blocks.reduce((m, b) => m + b.items.filter(it => it.name === name).length, 0), 0);

/* ---------- Workouts ---------- */
export function newBlock(name) {
  return { id: uid(), name, items: [], work: 40, rest: 15, rounds: 3, roundRest: 90, roundRestOpen: false };
}
export function normalizeWorkout(w) {
  const out = { id: w.id || uid(), name: String(w.name || '').slice(0, 60), blocks: [] };
  if (w.gen) out.gen = w.gen;
  (Array.isArray(w.blocks) ? w.blocks : []).forEach(b => {
    let items = b.items;
    if (!Array.isArray(items)) {
      items = String(b.exercises || '').split('\n').map(s => s.trim()).filter(Boolean).map(n => ({ name: n }));
    }
    out.blocks.push({
      id: b.id || uid(),
      name: String(b.name || '').slice(0, 40),
      items: items.filter(it => it && it.name).map(it => ({
        name: String(it.name).slice(0, 40),
        cat: it.cat || (findExercise(it.name) || {}).cat || 'body'
      })),
      work: clampInt(b.work ?? 40, 5, 3600),
      rest: clampInt(b.rest ?? 15, 0, 3600),
      rounds: clampInt(b.rounds ?? 1, 1, 50),
      roundRest: clampInt(b.roundRest ?? 60, 0, 3600),
      roundRestOpen: !!b.roundRestOpen
    });
  });
  return out;
}

function sample() {
  const it = names => names.map(n => ({ name: n, cat: (findExercise(n) || {}).cat || 'body' }));
  return [{
    id: uid(), name: 'Bootcamp Garten (Beispiel)', blocks: [
      { id: uid(), name: 'Warm-up', items: it(['Hampelmann', 'Armkreisen', 'Kniehebelauf', 'Ausfallschritte', 'Hüftkreisen', 'Inchworm', 'Skipping', 'Schulter-Taps']), work: 30, rest: 10, rounds: 2, roundRest: 60, roundRestOpen: false },
      { id: uid(), name: 'Parcours', items: it(['Kniebeugen', 'KB Swing', 'Burpees', 'Klimmzüge', 'Band Rudern', 'Plank']), work: 40, rest: 15, rounds: 3, roundRest: 120, roundRestOpen: true }
    ]
  }];
}

export let workouts = load(KEY);
if (!Array.isArray(workouts)) { workouts = sample(); store(KEY, workouts); }
else { workouts = workouts.map(normalizeWorkout); store(KEY, workouts); }

export function saveWorkouts() { store(KEY, workouts); emit('workouts'); }
export const getWorkout = id => workouts.find(w => w.id === id) || null;

export function upsertWorkout(w) {
  const clean = normalizeWorkout(w);
  if (!clean.name.trim()) clean.name = 'Workout ' + new Date().toLocaleDateString('de-CH');
  const i = workouts.findIndex(x => x.id === clean.id);
  if (i >= 0) workouts[i] = clean; else workouts.unshift(clean);
  saveWorkouts();
  return clean;
}
export function deleteWorkout(id) {
  workouts = workouts.filter(w => w.id !== id);
  saveWorkouts();
}
export function duplicateWorkout(id) {
  const src = getWorkout(id);
  if (!src) return null;
  const copy = clone(src);
  copy.id = uid();
  copy.name = (src.name + ' (Kopie)').slice(0, 60);
  copy.blocks.forEach(b => { b.id = uid(); });
  delete copy.gen;
  const i = workouts.findIndex(w => w.id === id);
  workouts.splice(i + 1, 0, copy);
  saveWorkouts();
  return copy;
}
export function moveWorkout(id, dir) {
  const i = workouts.findIndex(w => w.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= workouts.length) return;
  [workouts[i], workouts[j]] = [workouts[j], workouts[i]];
  saveWorkouts();
}

/* Andere Fenster/Tabs derselben App haben gespeichert -> übernehmen, damit nichts überschrieben wird */
window.addEventListener('storage', e => {
  if (e.key === KEY) {
    const v = load(KEY);
    if (Array.isArray(v)) { workouts = v.map(normalizeWorkout); emit('workouts'); }
  } else if (e.key === CKEY) {
    const v = load(CKEY);
    if (Array.isArray(v)) { custom = v; emit('custom'); }
  } else if (e.key === SKEY) {
    const v = load(SKEY);
    if (v) {
      const { gen, interval, ...rest } = v;
      Object.assign(settings, rest);
      if (gen) Object.assign(settings.gen, gen);
      if (interval) Object.assign(settings.interval, interval);
      emit('settings');
    }
  }
});

/* ---------- Laufendes Workout (für Fortsetzen nach Absturz/Neuladen) ---------- */
export const saveRun = data => store(RKEY, data);
export const loadRun = () => load(RKEY);
export const clearRun = () => drop(RKEY);

/* ---------- Backup ---------- */
export function exportData() {
  return JSON.stringify({ app: 'parcours-timer', v: 1, exported: new Date().toISOString(), workouts, custom, settings }, null, 2);
}
export function importData(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('Die Datei ist kein gültiges Backup.'); }
  if (!data || data.app !== 'parcours-timer' || !Array.isArray(data.workouts)) throw new Error('Die Datei ist kein Parcours-Timer-Backup.');
  let added = 0, updated = 0, ex = 0;
  (data.custom || []).forEach(c => {
    if (c && c.name && !findExercise(c.name)) { custom.push({ name: String(c.name).slice(0, 40), cat: CATS.some(k => k.id === c.cat) ? c.cat : 'body' }); ex++; }
  });
  data.workouts.forEach(w => {
    const clean = normalizeWorkout(w);
    const i = workouts.findIndex(x => x.id === clean.id);
    if (i >= 0) { workouts[i] = clean; updated++; } else { workouts.push(clean); added++; }
  });
  saveCustom(); saveWorkouts();
  return { added, updated, ex };
}
