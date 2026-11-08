// Aus einem Workout wird eine flache Abfolge von Abschnitten (Segmenten).
// type: prep | work | rest | pause   ·   open: Rundenpause ohne Zeit (weiter per Tipp)

export function buildSegments(w, { prep = 10 } = {}) {
  const segs = [];
  const blocks = (w.blocks || []).filter(b => b.rounds > 0 && b.items.length);
  blocks.forEach((b, bi) => {
    for (let r = 1; r <= b.rounds; r++) {
      b.items.forEach((ex, i) => {
        segs.push({ type: 'work', label: ex.name, cat: ex.cat, dur: b.work, block: b.name, round: r, rounds: b.rounds, st: i + 1, sn: b.items.length });
        if (i < b.items.length - 1 && b.rest > 0) segs.push({ type: 'rest', dur: b.rest, block: b.name, round: r, rounds: b.rounds });
      });
      const lastOverall = bi === blocks.length - 1 && r === b.rounds;
      if (!lastOverall && (b.roundRestOpen || b.roundRest > 0)) {
        segs.push({ type: 'pause', label: r < b.rounds ? 'Rundenpause' : 'Blockpause', dur: b.roundRestOpen ? 0 : b.roundRest, open: !!b.roundRestOpen, block: b.name, round: r, rounds: b.rounds });
      }
    }
  });
  if (segs.length && prep > 0) segs.unshift({ type: 'prep', dur: prep, block: blocks[0].name, round: 1, rounds: blocks[0].rounds });
  return number(segs);
}

/** Übungen durchnummerieren (für «Übung 5 von 18»). */
function number(segs) {
  const n = segs.filter(s => s.type === 'work').length;
  let k = 0;
  segs.forEach(s => { if (s.type === 'work') { s.wi = ++k; s.wn = n; } });
  return segs;
}

export function countdownSegs(sec, prep = 5) {
  return number([
    ...(prep > 0 ? [{ type: 'prep', dur: prep, block: 'Countdown', round: 1, rounds: 1, solo: true }] : []),
    { type: 'work', label: 'Countdown', dur: sec, block: 'Countdown', round: 1, rounds: 1, noIcon: true, solo: true }
  ]);
}

export function intervalSegs({ work, rest, rounds }, prep = 10) {
  const segs = [];
  if (prep > 0) segs.push({ type: 'prep', dur: prep, block: 'Intervall', round: 1, rounds, solo: true });
  for (let r = 1; r <= rounds; r++) {
    segs.push({ type: 'work', label: `Runde ${r} von ${rounds}`, dur: work, block: 'Intervall', round: r, rounds, noIcon: true, solo: true });
    if (r < rounds && rest > 0) segs.push({ type: 'rest', dur: rest, block: 'Intervall', round: r, rounds, solo: true });
  }
  return number(segs);
}

export const segsSeconds = segs => segs.reduce((a, s) => a + (s.open ? 0 : s.dur), 0);

export function workoutStats(w) {
  const segs = buildSegments(w, { prep: 0 });
  const blocks = (w.blocks || []).filter(b => b.items.length);
  return {
    sec: segsSeconds(segs),
    exercises: (w.blocks || []).reduce((a, b) => a + b.items.length, 0),
    blocks: blocks.length,
    open: (w.blocks || []).some(b => b.roundRestOpen && b.items.length),
    playable: segs.length > 0
  };
}

export function nextWorkIndex(segs, from) {
  for (let i = from + 1; i < segs.length; i++) if (segs[i].type === 'work') return i;
  return -1;
}

/**
 * Was zeigt die Anzeige gerade? Gemeinsam für Timer-Ansicht und Fernbedienung.
 * Oben steht immer, was du jetzt machst oder gleich machst.
 */
export function describe(segs, idx) {
  const s = segs[idx];
  const ni = nextWorkIndex(segs, idx), nx = ni >= 0 ? segs[ni] : null;
  const info = s.solo
    ? (s.rounds > 1 ? `Runde ${s.round}/${s.rounds}` : s.block)
    : (s.rounds > 1 ? `${s.block} · Runde ${s.round}/${s.rounds}` : s.block);
  let phase, main, cat = null, next = null;
  if (s.type === 'work') {
    phase = s.solo ? (s.block === 'Intervall' ? 'Arbeit' : 'Countdown') : (s.wn > 1 ? `Übung ${s.wi} / ${s.wn}` : 'Übung');
    main = s.label; cat = s.noIcon ? null : s.cat;
    next = nx ? { pre: 'Danach', label: nx.label, cat: nx.noIcon ? null : nx.cat } : { pre: 'Letzte Übung' };
  } else if (s.type === 'rest') {
    phase = s.solo ? 'Pause' : 'Pause · Station wechseln';
    main = nx ? nx.label : 'Pause'; cat = nx && !nx.noIcon ? nx.cat : null;
    const ai = nx ? nextWorkIndex(segs, ni) : -1, after = ai >= 0 ? segs[ai] : null;
    next = after ? { pre: 'Danach', label: after.label, cat: after.noIcon ? null : after.cat } : { pre: 'Letzte Übung' };
  } else if (s.type === 'pause') {
    phase = s.open ? `${s.label} · weiter mit Tipp` : s.label;
    main = s.label;
    next = nx ? { pre: 'Gleich', label: nx.label, cat: nx.noIcon ? null : nx.cat } : null;
  } else {
    phase = 'Bereit machen';
    main = nx ? nx.label : 'Los geht’s'; cat = nx && !nx.noIcon ? nx.cat : null;
    next = { pre: 'Startet gleich' };
  }
  return { phase, info, main, cat, next, type: s.type, open: !!s.open, preview: s.type === 'rest' || s.type === 'prep' };
}
