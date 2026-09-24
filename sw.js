/* Service Worker — Silêncio Também É Direito (Poluição Sonora Infantil)
   Guarda o folder inteiro no aparelho no primeiro acesso com internet,
   para que os acessos seguintes funcionem mesmo offline.
   Para publicar uma atualização, troque a versão do CACHE (ex.: poluicao-sonora-infantil-v2). */

const CACHE = 'poluicao-sonora-infantil-v1';

/* Tudo que o folder precisa para abrir sem internet.
   Caminhos relativos: funcionam em qualquer subpasta do GitHub Pages. */
const ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

/* Instalação: baixa e guarda os recursos essenciais (sem usar cópias antigas do navegador). */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ESSENCIAIS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

/* Ativação: remove versões antigas do cache. */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.map(n => n === CACHE ? null : caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Mensagem da página para forçar atualização imediata. */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Só interessa GET do próprio site.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navegação (abrir o folder): tenta a rede, cai para o cache quando offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copia));
          }
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })
          .then(r => r || caches.match('./')))
    );
    return;
  }

  // Demais recursos: cache primeiro (resposta instantânea e offline garantido).
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cacheado => {
      if (cacheado) return cacheado;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      });
    })
  );
});
