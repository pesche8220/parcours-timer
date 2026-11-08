// Kleine Helfer, die überall gebraucht werden.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const uid = () => Math.random().toString(36).slice(2, 10);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function clampInt(v, min, max) {
  v = parseInt(v, 10);
  if (isNaN(v)) v = min;
  return clamp(v, min, max);
}

/** 125 -> "2:05" */
export function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

/** Countdown-Anzeige: unter einer Minute nur Sekunden, sonst m:ss. */
export function fmtRun(sec) {
  const c = Math.max(0, Math.ceil(sec - 0.0005));
  return c >= 60 ? fmt(c) : String(c);
}

/** 45 -> "45 s", 90 -> "1:30 min" */
export const secTxt = s => (s >= 60 ? fmt(s) + ' min' : s + ' s');

/** Gesamtdauer in ganzen Minuten, mindestens 1. */
export const minTxt = sec => Math.max(1, Math.round(sec / 60)) + ' min';

export const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clone = o => JSON.parse(JSON.stringify(o));

export const isWide = () => Math.min(screen.width, screen.height) >= 600;

export function b64urlFromBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function bytesFromB64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export const b64urlFromText = t => b64urlFromBytes(new TextEncoder().encode(t));
export const textFromB64url = s => new TextDecoder().decode(bytesFromB64url(s));

/** Basis-URL der App (für QR-Links), ohne index.html und ohne Hash. */
export function appBase() {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

export function vibrate(ms) {
  try {
    // Nur nach einem echten Tipp erlaubt – sonst meckert der Browser in der Konsole
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms);
  } catch (e) { /* egal */ }
}
