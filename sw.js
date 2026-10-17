/* Cache exclusivo da aplicação. Os objetos do usuário não passam por este cache. */
const CACHE = 'casa-em-ordem-static-v3';
const FILES = ['./', './index.html', './styles.css', './src/app.js', './src/domain.js', './src/storage.js', './src/pdf.js', './vendor/pdf-lib.esm.min.js', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('casa-em-ordem-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.hash = '';
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const known = FILES.some(file => new URL(file, self.registration.scope).href === url.href);
  if (!known) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); }
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    return cached || new Response('Conteúdo indisponível offline. Conecte-se à internet para abrir pela primeira vez.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
