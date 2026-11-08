// Einstellungen: Design, Ton, Ablauf, eigene Übungen, Backup, App-Infos.
import { $, esc } from '../util.js';
import { UI, catIcon } from '../icons.js';
import { CATS } from '../library.js';
import { settings, saveSettings, custom, updateCustom, deleteCustom, customUsage, exportData, importData, workouts } from '../store.js';
import { sfx, unlock, setLevel } from '../sound.js';
import { sheet, toast, arm, download } from '../ui.js';
import { applyTheme } from '../theme.js';
import { APP_VERSION, installState, promptInstall, onInstallChange } from '../pwa.js';
import * as nav from '../nav.js';

const el = document.getElementById('v-settings');

const seg = (name, value, opts) => `<div class="segctl" role="radiogroup" data-set="${name}">${opts.map(([v, l]) =>
  `<button type="button" role="radio" data-v="${v}" aria-checked="${String(v) === String(value)}">${l}</button>`).join('')}</div>`;

function render() {
  const inst = installState();
  el.innerHTML = `
  <div class="page narrow settings">
    <header class="bar"><button type="button" class="icon-btn" data-back aria-label="Zurück">${UI.back}</button><h1 class="bar-title">Einstellungen</h1></header>

    <section class="set-group">
      <h2>Ton</h2>
      ${seg('volume', settings.volume, [['off', 'Aus'], ['normal', 'Normal'], ['loud', 'Laut']])}
      <button type="button" class="btn small" id="sTest">${UI.sound}<span>Ton testen</span></button>
      <p class="fine">Draussen ist der Tablet-Lautsprecher oft zu leise: «Laut» wählen oder einen Bluetooth-Lautsprecher verbinden. Auf iPhone/iPad den Lautlos-Schalter prüfen.</p>
    </section>

    <section class="set-group">
      <h2>Ablauf</h2>
      <span class="lbl">Bereit machen vor dem Start</span>
      ${seg('prep', settings.prep, [[0, 'Aus'], [5, '5 s'], [10, '10 s'], [15, '15 s'], [20, '20 s']])}
    </section>

    <section class="set-group">
      <h2>Darstellung</h2>
      ${seg('theme', settings.theme, [['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']])}
    </section>

    <section class="set-group">
      <h2>Eigene Übungen</h2>
      ${custom.length ? `<ul class="own-list">${custom.map((c, i) => `<li>${catIcon(c.cat)}<span class="nm">${esc(c.name)}</span>
        <button type="button" class="icon-btn sm" data-ced="${i}" aria-label="${esc(c.name)} bearbeiten">${UI.edit}</button></li>`).join('')}</ul>`
        : '<p class="muted">Noch keine. Eigene Übungen legst du in der Übungsauswahl an: einfach den Namen ins Suchfeld tippen.</p>'}
    </section>

    <section class="set-group">
      <h2>Daten</h2>
      <p class="muted">Alles bleibt auf diesem Gerät. Ein Backup sichert ${workouts.length} ${workouts.length === 1 ? 'Workout' : 'Workouts'} und deine eigenen Übungen als Datei.</p>
      <div class="row">
        <button type="button" class="btn" id="sExport">${UI.download}<span>Backup speichern</span></button>
        <label class="btn" for="sImport">${UI.upload}<span>Backup laden</span></label>
        <input type="file" id="sImport" accept="application/json,.json" hidden>
      </div>
    </section>

    <section class="set-group">
      <h2>App</h2>
      <ul class="facts">
        <li>${UI.offline}<span id="sOffline">${navigator.serviceWorker && navigator.serviceWorker.controller ? 'Offline bereit – läuft ohne Internet.' : 'Wird für offline vorbereitet … (einmal mit Internet öffnen)'}</span></li>
        <li>${UI.install}<span>${inst === 'installed' ? 'Als App installiert.' : inst === 'available' ? 'Kann als App installiert werden.' : inst === 'ios' ? 'iPhone/iPad: In Safari auf «Teilen» und dann «Zum Home-Bildschirm».' : 'Im Browser-Menü «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.'}</span></li>
      </ul>
      ${inst === 'available' ? `<button type="button" class="btn cta small" id="sInstall">${UI.install}<span>App installieren</span></button>` : ''}
      <p class="fine">Parcours Timer ${APP_VERSION} · Schriften: Barlow Condensed, Atkinson Hyperlegible (SIL OFL) · QR: qrcode-generator (MIT), jsQR (Apache 2.0)</p>
    </section>
  </div>`;
}

el.addEventListener('click', e => {
  if (e.target.closest('[data-back]')) return nav.back();
  const opt = e.target.closest('[data-v]');
  if (opt) {
    const key = opt.closest('[data-set]').dataset.set;
    const v = key === 'prep' ? +opt.dataset.v : opt.dataset.v;
    settings[key] = v; saveSettings();
    if (key === 'volume') { setLevel(v); unlock(); if (v !== 'off') sfx.test(); }
    if (key === 'theme') applyTheme();
    render();
    return;
  }
  if (e.target.closest('#sTest')) { unlock(); sfx.test(); return; }
  if (e.target.closest('#sExport')) {
    download(`parcours-backup-${new Date().toISOString().slice(0, 10)}.json`, exportData());
    toast('Backup gespeichert (Downloads)');
    return;
  }
  if (e.target.closest('#sInstall')) { promptInstall(); return; }
  const ced = e.target.closest('[data-ced]');
  if (ced) editCustom(+ced.dataset.ced);
});

$('#v-settings').addEventListener('change', async e => {
  if (e.target.id !== 'sImport' || !e.target.files.length) return;
  try {
    const text = await e.target.files[0].text();
    const r = importData(text);
    toast(`Backup geladen: ${r.added} neu, ${r.updated} aktualisiert${r.ex ? `, ${r.ex} eigene Übungen` : ''}`, { ms: 4000 });
    render();
  } catch (err) { toast(err.message || 'Backup konnte nicht geladen werden', { ms: 4000 }); }
  e.target.value = '';
});

function editCustom(i) {
  const c = custom[i];
  if (!c) return;
  let cat = c.cat;
  const used = customUsage(c.name);
  sheet({
    title: 'Eigene Übung',
    body: `<label class="lbl" for="ceName">Name</label>
      <input type="text" id="ceName" class="text-in" value="${esc(c.name)}" maxlength="40" autocomplete="off">
      <span class="lbl">Symbol</span>
      <div class="catpick" role="radiogroup" aria-label="Symbol">${CATS.map(k => `<button type="button" role="radio" data-cc="${k.id}" aria-checked="${k.id === cat}">${catIcon(k.id)}${k.name}</button>`).join('')}</div>
      <p class="err" id="ceErr" hidden></p>
      <div class="stack-actions">
        <button type="button" class="btn cta" data-a="save">${UI.check}<span>Speichern</span></button>
        <button type="button" class="btn ghost danger" data-a="del">${UI.trash}<span>Löschen${used ? ` (in ${used} Workout-Stationen verwendet – bleibt dort erhalten)` : ''}</span></button>
      </div>`,
    onMount(api) {
      api.el.addEventListener('click', ev => {
        const k = ev.target.closest('[data-cc]');
        if (k) { cat = k.dataset.cc; api.el.querySelectorAll('[data-cc]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.cc === cat))); return; }
        const b = ev.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'save') {
          const ok = updateCustom(c.name, $('#ceName', api.el).value, cat);
          if (!ok) { const er = $('#ceErr', api.el); er.hidden = false; er.textContent = 'Dieser Name ist leer oder schon vergeben.'; return; }
          api.close().then(render);
        } else if (b.dataset.a === 'del') {
          arm(b, 'Wirklich löschen?', () => { deleteCustom(c.name); api.close().then(render); });
        }
      });
    }
  });
}

onInstallChange(() => { if (nav.currentView() === 'settings') render(); });

nav.register('settings', { el, show: render });
