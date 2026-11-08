// Symbole als Inline-SVG. UI-Symbole: 24er-Raster, Kategorie-Symbole: 48er-Raster (aus Prototyp v4).

const U = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const svg = (body, attrs = U) => `<svg viewBox="0 0 24 24" ${attrs} aria-hidden="true" focusable="false">${body}</svg>`;

export const UI = {
  play: svg('<path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l11-6.8a.8.8 0 0 0 0-1.4l-11-6.8A.8.8 0 0 0 8 5.2z" fill="currentColor" stroke="none"/>'),
  pause: svg('<rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>'),
  next: svg('<path d="M5 6.2v11.6a.7.7 0 0 0 1.1.6l8.6-5.8a.7.7 0 0 0 0-1.2L6.1 5.6A.7.7 0 0 0 5 6.2z" fill="currentColor" stroke="none"/><path d="M18.5 5.5v13" stroke-width="2.6"/>'),
  prev: svg('<path d="M19 6.2v11.6a.7.7 0 0 1-1.1.6l-8.6-5.8a.7.7 0 0 1 0-1.2l8.6-5.8a.7.7 0 0 1 1.1.6z" fill="currentColor" stroke="none"/><path d="M5.5 5.5v13" stroke-width="2.6"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  chevDown: svg('<path d="M6 9l6 6 6-6"/>'),
  chevUp: svg('<path d="M6 15l6-6 6 6"/>'),
  chevRight: svg('<path d="M9 6l6 6-6 6"/>'),
  arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  sliders: svg('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  more: svg('<circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
  shuffle: svg('<path d="M3 7h3.5c4.5 0 6.5 10 11 10H20M3 17h3.5c1.6 0 2.9-1.3 4-3M13.5 10c1.1-1.7 2.4-3 4-3H20"/><path d="M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/>'),
  swap: svg('<path d="M7 4L4 7l3 3M4 7h12a4 4 0 0 1 4 4M17 20l3-3-3-3M20 17H8a4 4 0 0 1-4-4"/>'),
  edit: svg('<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14 7l3 3"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7M9 7V4.5h6V7"/>'),
  copy: svg('<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>'),
  qr: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/>'),
  screen: svg('<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8.5 20.5h7M12 17v3.5"/>'),
  phone: svg('<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.2h2"/>'),
  camera: svg('<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>'),
  full: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  sound: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  mute: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  timer: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M18.5 6.5l1.5-1.5"/>'),
  repeat: svg('<path d="M17 3l3 3-3 3M20 6H8a4 4 0 0 0-4 4v1M7 21l-3-3 3-3M4 18h12a4 4 0 0 0 4-4v-1"/>'),
  download: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  upload: svg('<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>'),
  link: svg('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
  unlink: svg('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1M3 3l18 18"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>'),
  wifi: svg('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.3a9.5 9.5 0 0 1 13 0M8.6 15.6a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/>'),
  offline: svg('<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/><path d="M8 12.5l2.7 2.7L16 9.8"/>'),
  bolt: svg('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  install: svg('<rect x="6" y="2.5" width="12" height="19" rx="2.2"/><path d="M12 7.5v7M9 11.5l3 3 3-3"/>')
};

/* Kategorie-Symbole (Strichstärke für 48er-Raster) */
const S = 'fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
export const CAT_ICONS = {
  body: `<svg viewBox="0 0 48 48" ${S}><circle cx="24" cy="9" r="5"/><path d="M24 14v16M12 20h24M24 30l-8 14M24 30l8 14"/></svg>`,
  core: `<svg viewBox="0 0 48 48" ${S}><circle cx="8" cy="21" r="4.5"/><path d="M13 24l29 9M14 24.5V37M42 33l2 4M4 40h40"/></svg>`,
  kettlebell: `<svg viewBox="0 0 48 48" ${S}><path d="M16 21v-6a8 8 0 0 1 16 0v6"/><circle cx="24" cy="31" r="12"/></svg>`,
  dumbbell: `<svg viewBox="0 0 48 48" ${S}><path d="M15 24h18"/><rect x="8" y="14" width="7" height="20" rx="2"/><rect x="33" y="14" width="7" height="20" rx="2"/><path d="M4 19v10M44 19v10"/></svg>`,
  band: `<svg viewBox="0 0 48 48" ${S}><path d="M6 9h10M32 9h10"/><path d="M11 9q0 32 13 32t13-32"/></svg>`,
  pullup: `<svg viewBox="0 0 48 48" ${S}><path d="M4 5h40M16 5l3 16M32 5l-3 16M19 21h10M24 21v14M24 35l-4 9M24 35l4 9"/><circle cx="24" cy="14" r="4"/></svg>`,
  cardio: `<svg viewBox="0 0 48 48" ${S}><circle cx="31" cy="8" r="4.5"/><path d="M28 14l-6 14M27 17l8 6M27 17l-10 1M22 28l8 7-2 9M22 28l-8 6-6-2"/></svg>`,
  mobility: `<svg viewBox="0 0 48 48" ${S}><circle cx="24" cy="10" r="4.5"/><path d="M24 16v16M24 20L13 9M24 20l11-11M24 32l-6 12M24 32l6 12"/><path d="M8 30a16 16 0 0 0 6 8M40 30a16 16 0 0 1-6 8"/></svg>`,
  rope: `<svg viewBox="0 0 48 48" ${S}><rect x="5" y="31" width="8" height="13" rx="3"/><rect x="35" y="31" width="8" height="13" rx="3"/><path d="M9 31C9 1 39 1 39 31"/></svg>`
};

/** <span class="ico">…</span> für Kategorie */
export const catIcon = (cat, cls = '') => `<span class="ico ${cls}" aria-hidden="true">${CAT_ICONS[cat] || CAT_ICONS.body}</span>`;
export const ui = (name, cls = '') => `<span class="ui-ico ${cls}" aria-hidden="true">${UI[name] || ''}</span>`;

/** Markenzeichen: Stoppuhr-Segment */
export const MARK = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--accent)"/><path d="M16 7a9 9 0 1 1-9 9" fill="none" stroke="var(--on-accent)" stroke-width="3.2" stroke-linecap="round"/><path d="M16 16l3.4-3.4" stroke="var(--on-accent)" stroke-width="3.2" stroke-linecap="round"/><circle cx="16" cy="16" r="2.2" fill="var(--on-accent)"/></svg>`;
