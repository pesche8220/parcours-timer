// Töne mit Web Audio. Keine Sprachansagen, keine Musik.
let ctx = null, out = null, level = 'normal';

export function setLevel(v) { level = v; applyGain(); }
export const getLevel = () => level;

function applyGain() {
  if (out) out.gain.value = level === 'loud' ? 1 : level === 'off' ? 0 : 0.42;
}

/** Muss einmal aus einer Benutzeraktion (Tipp) heraus aufgerufen werden. */
export function unlock() {
  try {
    if (navigator.audioSession) {
      // iOS 17+: Töne auch bei Lautlos-Schalter abspielen
      try { navigator.audioSession.type = 'playback'; } catch (e) { /* egal */ }
    }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.001; limiter.release.value = 0.05;
      out = ctx.createGain();
      out.connect(limiter); limiter.connect(ctx.destination);
      applyGain();
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch (e) { ctx = null; }
}

export const audioReady = () => !!ctx && ctx.state === 'running';

function tone(freq, dur, delay = 0) {
  if (!ctx || level === 'off') return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const t = ctx.currentTime + delay + 0.01;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.01);
    g.gain.setValueAtTime(0.85, t + dur - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* egal */ }
}

export const sfx = {
  count: () => tone(880, 0.12),
  work: () => tone(1320, 0.5),
  rest: () => { tone(660, 0.2); tone(660, 0.2, 0.28); },
  done: () => { tone(1320, 0.2); tone(1320, 0.2, 0.3); tone(1760, 0.6, 0.6); },
  test: () => { tone(880, 0.12); tone(880, 0.12, 0.35); tone(1320, 0.5, 0.7); }
};
