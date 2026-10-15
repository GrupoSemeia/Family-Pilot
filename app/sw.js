/* Guarda o app no aparelho para abrir sem internet. Troque a versão ao mudar arquivos. */
const V = 'familypilot-v6';
const ARQ = ['./', 'index.html', 'css/app.css', 'js/modulo.js', 'js/auth.js', 'js/app.js', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(ARQ)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  // a API (login, conteúdo, pagamento) nunca passa pelo cache
  if (e.request.method !== 'GET' || new URL(e.request.url).pathname.startsWith('/api/')) return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
    if (new URL(e.request.url).origin === location.origin) { const cp = resp.clone(); caches.open(V).then((c) => c.put(e.request, cp)); }
    return resp;
  }).catch(() => caches.match('index.html'))));
});
