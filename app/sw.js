/* Guarda o app no aparelho para abrir sem internet. Troque a versão ao mudar arquivos.
   A página inicial ("/") nunca é guardada: ela muda conforme o login (app ou página de vendas). */
const V = 'familypilot-v10';
const ARQ = ['/entrar', '/css/app.css', '/js/app.js', '/js/modulo.js', '/js/auth.js', '/icon.svg', '/manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(ARQ)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // a API (login, conteúdo, pagamento) nunca passa pelo cache
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // páginas: sempre da rede; sem internet, abre o app guardado
  if (e.request.mode === 'navigate') { e.respondWith(fetch(e.request).catch(() => caches.match('/entrar'))); return; }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
    const cp = resp.clone(); caches.open(V).then((c) => c.put(e.request, cp));
    return resp;
  })));
});
