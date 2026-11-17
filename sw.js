// GAMIFY — modo offline. Guarda o app no aparelho: abre sem internet. Os DADOS não passam por aqui.
const V = 'gamify-v5-12';
// as outras artes do PRIMO (animações, acessórios, cenários) são guardadas na primeira vez que aparecem na tela
// os arquivos são guardados um por um: se um faltar, os outros ficam guardados mesmo assim
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(V).then((c) => Promise.all(['./', 'index.html', 'manifest.json', 'css/app.css', 'js/actions.js', 'js/app.js', 'js/audio.js', 'js/backup.js', 'js/claude.js', 'js/drive.js', 'js/falas.js', 'js/fx.js', 'js/icons.js', 'js/interiors.js', 'js/kingdom.js', 'js/pacc.js', 'js/pdraw.js', 'js/pnew.js', 'js/primo.js', 'js/pstate.js', 'js/review.js', 'js/rules.js', 'js/saber.js', 'js/sky.js', 'js/store.js', 'js/trip.js', 'js/ui.js', 'js/util.js', 'js/v3.js', 'js/v35.js', 'js/v4.js', 'js/views/agenda.js', 'js/views/extras.js', 'js/views/filtro.js', 'js/views/quests.js', 'js/views/rotina.js', 'js/views/shop.js', 'js/views/survival.js', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/dungeon.png', 'assets/town.png', 'assets/pets/piglet.png', 'assets/pets/piglet.json', 'assets/primo/primo.json', 'assets/primo/parado.webp', 'assets/primo/rostos.webp', 'assets/primo/faisca.webp'].map((u) => c.add(u).catch(() => {}))))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // fontes e banco ficam de fora
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); } return res; }).catch(() => caches.match(r).then((m) => m || caches.match('index.html'))));
});
