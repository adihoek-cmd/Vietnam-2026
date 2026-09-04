/* Việt Nam 2026 · service worker
   Network-first for the page so edits land immediately when online.
   Cache-first for assets. Full offline fallback either way. */
const V = 'vn26-20260904-1353';
const CORE = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window'}))
      .then(cs => cs.forEach(c => c.postMessage({type:'sw-updated', v:V})))
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isDoc = req.mode === 'navigate' || req.destination === 'document';

  if (isDoc) {
    // always try the network first; fall back to the saved copy offline
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // assets: serve fast from cache, refresh in the background
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put(req, copy));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
