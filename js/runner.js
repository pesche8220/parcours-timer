// Timer-Engine: rechnet mit Zeitstempeln (Startzeit + Dauer), nicht mit Ticks.
// Dadurch driftet nichts, und nach einem eingefrorenen Tab wird sauber aufgeholt.
import { uid } from './util.js';

export class Runner {
  constructor(segs, title, hooks = {}) {
    this.rid = uid();
    this.segs = segs;
    this.title = title;
    this.hooks = hooks;
    this.idx = 0;
    this.t0 = 0;          // Start des aktuellen Abschnitts (ms)
    this.paused = false;
    this.pLeft = 0;       // Restzeit beim Pausieren (s)
    this.finished = false;
    this.began = 0;
    this.endedAt = 0;
    this.pausedMs = 0;    // Summe der Pausenzeit (für Gesamtdauer)
    this.pausedAt = 0;
    this.lastBeep = null;
  }

  get seg() { return this.segs[this.idx]; }

  start(now = Date.now()) {
    this.began = now;
    this.enter(0, now, this.segs[0].type !== 'prep');
  }

  left(now = Date.now()) {
    const s = this.seg;
    if (s.open) return Infinity;
    return this.paused ? this.pLeft : s.dur - (now - this.t0) / 1000;
  }

  /** Verstrichene Zeit im aktuellen Abschnitt (s) */
  elapsed(now = Date.now()) {
    const s = this.seg;
    if (s.open) return ((this.paused ? this.pausedAt : now) - this.t0) / 1000;
    return s.dur - this.left(now);
  }

  totalElapsed(now = Date.now()) {
    const end = this.finished ? this.endedAt : (this.paused ? this.pausedAt : now);
    return Math.max(0, (end - this.began - this.pausedMs) / 1000);
  }

  enter(i, at, sound = true, keepPaused = false) {
    const wasPaused = this.paused;
    this.idx = i;
    this.t0 = at;
    this.lastBeep = null;
    if (keepPaused && wasPaused && !this.seg.open) {
      this.pLeft = this.seg.dur;
    } else {
      if (wasPaused) this.pausedMs += at - this.pausedAt;
      this.paused = false;
    }
    this.hooks.enter && this.hooks.enter(this, sound);
  }

  tick(now = Date.now()) {
    if (this.finished || this.paused) return;
    let s = this.seg, moved = false;
    while (!s.open && now - this.t0 >= s.dur * 1000) {
      const end = this.t0 + s.dur * 1000;
      if (this.idx + 1 >= this.segs.length) { this.finish(end); return; }
      this.idx += 1; this.t0 = end; moved = true;
      s = this.seg;
    }
    if (moved) {
      this.lastBeep = s.open ? null : Math.ceil(this.left(now)) <= 3 ? Math.ceil(this.left(now)) : null;
      this.hooks.enter && this.hooks.enter(this, true);
      return;
    }
    if (!s.open) {
      const c = Math.ceil(this.left(now));
      if (c <= 3 && c >= 1 && this.lastBeep !== c) {
        this.lastBeep = c;
        this.hooks.beep && this.hooks.beep(c);
      }
    }
  }

  toggle(now = Date.now()) {
    if (this.finished) return;
    const s = this.seg;
    if (s.open) { this.skip(now); return; }
    if (this.paused) {
      this.t0 = now - (s.dur - this.pLeft) * 1000;
      this.pausedMs += now - this.pausedAt;
      this.paused = false;
    } else {
      this.pLeft = this.left(now);
      this.pausedAt = now;
      this.paused = true;
    }
    this.hooks.change && this.hooks.change(this);
  }

  skip(now = Date.now()) {
    if (this.finished) return;
    if (this.idx + 1 >= this.segs.length) { this.finish(now); return; }
    this.enter(this.idx + 1, now, true, true);
  }

  prev(now = Date.now()) {
    if (this.finished) return;
    const restart = this.elapsed(now) > 3 || this.idx === 0;
    this.enter(restart ? this.idx : this.idx - 1, now, true, true);
  }

  finish(at = Date.now()) {
    if (this.paused) { this.pausedMs += at - this.pausedAt; this.paused = false; }
    this.finished = true;
    this.endedAt = at;
    this.hooks.finish && this.hooks.finish(this);
  }

  /** Für die Fernbedienung: Zustand zum Zeitpunkt now */
  snapshot(now = Date.now()) {
    const s = this.seg;
    return {
      rid: this.rid, idx: this.idx, paused: this.paused, fin: this.finished,
      left: s.open ? null : Math.max(0, this.left(now)),
      el: this.elapsed(now), tot: this.totalElapsed(now)
    };
  }

  serialize() {
    const { rid, segs, title, idx, t0, paused, pLeft, finished, began, endedAt, pausedMs, pausedAt } = this;
    return { rid, segs, title, idx, t0, paused, pLeft, finished, began, endedAt, pausedMs, pausedAt };
  }

  static restore(data, hooks) {
    const r = new Runner(data.segs, data.title, hooks);
    Object.assign(r, {
      rid: data.rid, idx: data.idx, t0: data.t0, paused: data.paused, pLeft: data.pLeft,
      finished: data.finished, began: data.began, endedAt: data.endedAt, pausedMs: data.pausedMs || 0, pausedAt: data.pausedAt || 0
    });
    return r;
  }
}
