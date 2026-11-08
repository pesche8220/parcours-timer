// Workouts kompakt für QR-Codes kodieren, und gescannte Codes erkennen.
// Archiv-Übungen werden als Index übertragen (darum ist BUILTIN append-only).
import { BUILTIN, BUILTIN_INDEX, CATS } from './library.js';
import { b64urlFromText, textFromB64url, appBase, uid } from './util.js';
import { normalizeWorkout } from './store.js';

const CAT_IDS = CATS.map(c => c.id);

export function encodeWorkout(w) {
  const arr = [1, w.name, w.blocks.filter(b => b.items.length).map(b => [
    b.name, b.work, b.rest, b.rounds, b.roundRestOpen ? -1 : b.roundRest,
    b.items.map(it => {
      const i = BUILTIN_INDEX.get(it.name.toLowerCase());
      return i != null && BUILTIN[i].name === it.name ? i : [it.name, Math.max(0, CAT_IDS.indexOf(it.cat))];
    })
  ])];
  return b64urlFromText(JSON.stringify(arr));
}

export function decodeWorkout(code) {
  const arr = JSON.parse(textFromB64url(code));
  if (!Array.isArray(arr) || arr[0] !== 1) throw new Error('Unbekanntes Format');
  return normalizeWorkout({
    id: uid(), name: arr[1],
    blocks: arr[2].map(b => ({
      id: uid(), name: b[0], work: b[1], rest: b[2], rounds: b[3],
      roundRest: b[4] < 0 ? 60 : b[4], roundRestOpen: b[4] < 0,
      items: b[5].map(x => typeof x === 'number'
        ? { name: BUILTIN[x] ? BUILTIN[x].name : 'Übung', cat: BUILTIN[x] ? BUILTIN[x].cat : 'body' }
        : { name: String(x[0]), cat: CAT_IDS[x[1]] || 'body' })
    }))
  });
}

export const workoutUrl = w => appBase() + '#w=' + encodeWorkout(w);
export const offerUrl = payload => appBase() + '#c=' + payload;
export const answerText = payload => 'PT1:' + payload;

/**
 * Gescannter Text oder URL-Hash -> { kind: 'offer'|'answer'|'workout', data }
 */
export function parseCode(text) {
  if (!text) return null;
  text = String(text).trim();
  if (text.startsWith('PT1:')) {
    const p = text.slice(4);
    return { kind: /^a[~.]/.test(p) ? 'answer' : p.startsWith('o~') ? 'offer' : 'unknown', data: p };
  }
  const h = text.indexOf('#');
  const frag = h >= 0 ? text.slice(h + 1) : text;
  if (frag.startsWith('c=')) {
    const p = decodeURIComponent(frag.slice(2));
    return { kind: p.startsWith('o~') ? 'offer' : /^a[~.]/.test(p) ? 'answer' : 'unknown', data: p };
  }
  if (frag.startsWith('w=')) {
    try { return { kind: 'workout', data: decodeWorkout(frag.slice(2)) }; }
    catch (e) { return { kind: 'unknown' }; }
  }
  return { kind: 'unknown' };
}
