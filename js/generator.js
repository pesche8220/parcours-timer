// Schnelles Workout: aus Dauer, Ausrüstung und Intensität ein ausgewogenes Zirkeltraining bauen.
import { BUILTIN, builtinByName } from './library.js';
import { uid, shuffle } from './util.js';

export const DURATIONS = [10, 20, 30, 45];

export const LEVELS = [
  { id: 1, name: 'Locker', work: 30, rest: 20, rr: 60 },
  { id: 2, name: 'Mittel', work: 40, rest: 20, rr: 60 },
  { id: 3, name: 'Hart', work: 45, rest: 15, rr: 45 }
];

export const FOCUS = [
  { id: 'mix', name: 'Ganzkörper', seq: ['legs', 'push', 'core', 'cardio', 'pull', 'full', 'legs', 'core'] },
  { id: 'legs', name: 'Beine & Po', seq: ['legs', 'core', 'legs', 'cardio', 'legs', 'full', 'legs', 'core'] },
  { id: 'upper', name: 'Oberkörper', seq: ['push', 'pull', 'core', 'push', 'pull', 'full', 'push', 'core'] },
  { id: 'core', name: 'Core', seq: ['core', 'legs', 'core', 'cardio', 'core', 'push', 'core', 'full'] },
  { id: 'cardio', name: 'Cardio', seq: ['cardio', 'legs', 'cardio', 'core', 'cardio', 'full', 'cardio', 'push'] }
];

const MAIN_PATS = ['legs', 'push', 'pull', 'core', 'cardio', 'full'];
const ZIRKEL = { kb: 'Kettlebell-Zirkel', db: 'Hantel-Zirkel', band: 'Band-Zirkel', bar: 'Klimmzug-Zirkel', rope: 'Seil-Zirkel' };

function weighted(pool, weightOf) {
  const w = pool.map(weightOf), sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

function choose(pat, eq, used, level) {
  const pool = BUILTIN.filter(x =>
    (pat ? x.pat === pat : MAIN_PATS.includes(x.pat)) &&
    eq.has(x.eq) && !used.has(x.name) && (level > 1 || !x.hard));
  if (!pool.length) return null;
  // Gewählte Ausrüstung soll auch wirklich vorkommen.
  return weighted(pool, x => (x.eq !== 'none' ? 3.2 : 1) * (level === 3 && x.hard ? 1.6 : 1));
}

/** Stationen und Runden so wählen, dass die Zeit möglichst genau passt. */
function fitCircuit(budget, L, followed) {
  let best = null;
  for (let S = 4; S <= 9; S++) {
    for (let R = 1; R <= 6; R++) {
      const circuit = S * L.work + (S - 1) * L.rest;
      const dur = R * circuit + (R - 1) * L.rr + (followed ? L.rr : 0);
      let score = Math.abs(dur - budget);
      if (R === 1) score += 90;
      if (S < 6) score += (6 - S) * 20;   // lieber mehr Stationen statt mehr Runden
      if (S > 8) score += 20;
      if (R > 3) score += 25 * (R - 3);
      if (!best || score < best.score) best = { S, R, dur, score };
    }
  }
  // Rest über die Rundenpause ausgleichen (in 15-s-Schritten, 30 s bis 2 min)
  const n = (best.R - 1) + (followed ? 1 : 0);
  best.rr = L.rr;
  if (n > 0) best.rr = Math.max(30, Math.min(120, Math.round((L.rr + (budget - best.dur) / n) / 15) * 15));
  return best;
}

function pickWarm(n, eq, used) {
  const cardio = shuffle(BUILTIN.filter(x => x.warm && x.pat === 'cardio' && eq.has(x.eq)));
  const mob = shuffle(BUILTIN.filter(x => x.warm && x.pat === 'mob' && eq.has(x.eq)));
  const out = [];
  for (let i = 0; i < n; i++) {
    const src = (i % 2 === 0 ? cardio : mob).length ? (i % 2 === 0 ? cardio : mob) : (i % 2 === 0 ? mob : cardio);
    const x = src.shift();
    if (!x) break;
    used.add(x.name); out.push({ name: x.name, cat: x.cat });
  }
  return out;
}

function pickStretch(n, used) {
  return shuffle(BUILTIN.filter(x => x.pat === 'stretch' && !used.has(x.name))).slice(0, n).map(x => {
    used.add(x.name); return { name: x.name, cat: x.cat };
  });
}

function pickMain(S, focus, eq, used, level, offset) {
  const seq = (FOCUS.find(f => f.id === focus) || FOCUS[0]).seq;
  const items = [];
  for (let i = 0; i < S; i++) {
    const pat = seq[(i + offset * 3) % seq.length];
    const ex = choose(pat, eq, used, level) || choose(null, eq, used, level);
    if (!ex) break;
    used.add(ex.name);
    items.push({ name: ex.name, cat: ex.cat });
  }
  return items;
}

export function workoutName(o) {
  let base;
  if (o.focus && o.focus !== 'mix') base = (FOCUS.find(f => f.id === o.focus) || FOCUS[0]).name;
  else if (o.eq.length === 1) base = ZIRKEL[o.eq[0]] || 'Ganzkörper';
  else if (o.eq.length > 1) base = 'Ganzkörper-Mix';
  else base = 'Ganzkörper';
  return `${base} · ${o.min} min`;
}

export function generate(opts = {}) {
  const o = { min: 30, eq: [], level: 2, focus: 'mix', warm: true, cool: true, ...opts };
  const L = LEVELS.find(l => l.id === o.level) || LEVELS[1];
  const eq = new Set(['none', ...o.eq]);
  const used = new Set();
  const blocks = [];
  let budget = o.min * 60;

  const doWarm = o.warm && o.min >= 15;
  const doCool = o.cool && o.min >= 20;

  if (doWarm) {
    const n = o.min >= 30 ? 8 : 6;
    const items = pickWarm(n, eq, used);
    blocks.push({ id: uid(), name: 'Warm-up', items, work: 30, rest: 0, rounds: 1, roundRest: 30, roundRestOpen: false });
    budget -= items.length * 30 + 30;
  }
  let cool = null;
  if (doCool) {
    const n = o.min >= 45 ? 6 : 4;
    cool = { id: uid(), name: 'Cool-down', items: pickStretch(n, used), work: 40, rest: 0, rounds: 1, roundRest: 0, roundRestOpen: false };
    budget -= cool.items.length * 40;
  }
  const nMain = budget > 26 * 60 ? 2 : 1;
  for (let k = 0; k < nMain; k++) {
    const followed = k < nMain - 1 || !!cool;
    const plan = fitCircuit(budget / nMain, L, followed);
    const items = pickMain(plan.S, o.focus, eq, used, o.level, k);
    blocks.push({
      id: uid(), name: nMain > 1 ? `Zirkel ${'AB'[k]}` : 'Zirkel', items,
      work: L.work, rest: L.rest, rounds: plan.R, roundRest: plan.rr, roundRestOpen: false
    });
  }
  if (cool) blocks.push(cool);

  return { id: uid(), name: workoutName(o), blocks, gen: { min: o.min, eq: o.eq.slice(), level: o.level, focus: o.focus } };
}

/** Eine einzelne Übung gegen eine passende andere tauschen. */
export function swapItem(w, bi, ii) {
  const b = w.blocks[bi], cur = b && b.items[ii];
  if (!cur) return false;
  const meta = builtinByName(cur.name);
  const used = new Set(w.blocks.flatMap(x => x.items.map(i => i.name)));
  const eq = new Set(['none', ...((w.gen && w.gen.eq) || ['kb', 'db', 'band', 'bar', 'rope'])]);
  const level = (w.gen && w.gen.level) || 2;
  const ok = x => !used.has(x.name) && eq.has(x.eq) && (level > 1 || !x.hard);
  let pool = meta ? BUILTIN.filter(x => x.pat === meta.pat && ok(x)) : [];
  if (!pool.length && (!meta || MAIN_PATS.includes(meta.pat))) pool = BUILTIN.filter(x => MAIN_PATS.includes(x.pat) && ok(x));
  if (!pool.length) return false;
  const ex = pool[Math.floor(Math.random() * pool.length)];
  b.items[ii] = { name: ex.name, cat: ex.cat };
  return true;
}
