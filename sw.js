/*
 * IMPORTANTE: CACHE_VERSION muda a cada deploy real (o número já embutido
 * aqui evita ficar com um app.js/data.js velho ou corrompido preso no
 * cache do navegador — essa era a causa da tela travada em "Cargando
 * directorio..." depois de fechar e reabrir o app).
 *
 * Ao subir uma atualização de verdade no GitHub (trocar dados, corrigir
 * bug, etc.), basta mudar este número (ex: "v1" -> "v2") para forçar
 * todo mundo a baixar os arquivos novos automaticamente.
 */
const CACHE_VERSION = "v3";
const CACHE_NAME = "gira-" + CACHE_VERSION;

const ASSETS = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Cachea cada asset individualmente para que uma falha isolada não
      // aborte toda a instalação e deixe o SW num estado quebrado.
      return Promise.all(
        ASSETS.map(function (url) {
          return cache.add(url).catch(function () {
            // ignora falhas individuais
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      // Apaga QUALQUER cache de uma versão diferente da atual — isso é o
      // que garante que um data.js/app.js velho nunca fique "preso".
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  const url = event.request.url;
  const isCoreScript = url.indexOf("app.js") !== -1 || url.indexOf("data.js") !== -1;

  // Network-first para a navegação da página E para os scripts essenciais
  // (app.js / data.js). Esses dois arquivos são o "cérebro" do app — se
  // eles ficarem presos numa versão velha ou corrompida do cache, o app
  // trava sem nenhum aviso. Network-first garante que, sempre que houver
  // conexão, a versão mais nova e íntegra é buscada primeiro; o cache só
  // é usado como reserva se estiver realmente offline.
  if (event.request.mode === "navigate" || isCoreScript) {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
          }
          return response;
        })
        .catch(function () {
          return caches.match(event.request).then(function (cached) {
            return cached || (event.request.mode === "navigate" ? caches.match("./index.html") : undefined);
          });
        })
    );
    return;
  }

  // Cache-first para assets estáticos que raramente mudam (css/ícones),
  // com fallback para rede.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function () {
        return cached;
      });
    })
  );
});
