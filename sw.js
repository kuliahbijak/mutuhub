/* MutuHub service worker — cangkang aplikasi offline + pembaruan cepat.
 * API Apps Script (script.google.com / googleusercontent.com) TIDAK PERNAH di-cache:
 * data selalu langsung dari server (cache data ada di localStorage per pengguna).
 * Saat merilis versi baru: naikkan VERSI di sini dan ?v= di index.html. */
const VERSI = 'mutuhub-1.0.0';
const CANGKANG = ['./', 'index.html', 'manifest.json', 'css/style.css?v=1.0.0', 'js/config.js?v=1.0.0', 'js/qr.js?v=1.0.0', 'js/core.js?v=1.0.0', 'js/ui.js?v=1.0.0', 'js/app.js?v=1.0.0', 'js/hal-umum.js?v=1.0.0', 'js/hal-mutu.js?v=1.0.0', 'js/hal-ami.js?v=1.0.0', 'js/hal-akreditasi.js?v=1.0.0', 'js/hal-layanan.js?v=1.0.0', 'js/hal-sistem.js?v=1.0.0', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(CANGKANG)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI && k !== 'mutuhub-font').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (/(^|\.)script\.google\.com$|googleusercontent\.com$|accounts\.google\.com$|docs\.google\.com$|drive\.google\.com$/.test(url.hostname)) return;
  if (/fonts\.(googleapis|gstatic)\.com$|cdn\.sheetjs\.com$/.test(url.hostname)) {
    e.respondWith(caches.open('mutuhub-font').then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/js/config.js')) { e.respondWith(fetch(req).then(r => { const k = r.clone(); caches.open(VERSI).then(c => c.put(req, k)); return r; }).catch(() => caches.match(req))); return; }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const k = r.clone(); caches.open(VERSI).then(c => c.put('index.html', k)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.open(VERSI).then(c => c.match(req).then(hit => {
    const segar = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || segar;
  })));
});
