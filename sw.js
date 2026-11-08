// Service Worker: legt beim ersten Besuch alle Dateien ab, danach läuft die App komplett offline.
// WICHTIG: Bei jeder Änderung VERSION erhöhen (gleich wie APP_VERSION in js/pwa.js),
// sonst bekommen installierte Geräte die neue Fassung nicht.
const VERSION = '1.0.1';
const CACHE = 'parcours-' + VERSION;

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js', 'js/codec.js', 'js/display.js', 'js/generator.js', 'js/icons.js', 'js/launch.js',
  'js/library.js', 'js/link.js', 'js/nav.js', 'js/pwa.js', 'js/qr.js', 'js/qr-worker.js', 'js/runner.js',
  'js/segments.js', 'js/sound.js', 'js/store.js', 'js/theme.js', 'js/ui.js', 'js/util.js', 'js/wake.js',
  'js/views/editor.js', 'js/views/home.js', 'js/views/pair.js', 'js/views/preview.js', 'js/views/ready.js',
  'js/views/remote.js', 'js/views/run.js', 'js/views/settings.js', 'js/views/share.js',
  'vendor/qrcode.min.js', 'vendor/jsQR.min.js',
  'fonts/barlow-condensed-600.woff2', 'fonts/barlow-condensed-700.woff2', 'fonts/atkinson-400.woff2', 'fonts/atkinson-700.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('parcours-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
