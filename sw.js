// Service worker mínimo: guarda só a casca do app; dados sempre vêm do Supabase.
const CASCA = "utarget-casca-v41";
const ARQS = ["./", "index.html", "app.js?v=41", "app.css?v=41", "logo-azul.svg", "logo-claro.svg", "manifest.webmanifest", "icon.svg", "supabase.min.js", "modulos.js?v=41"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CASCA).then((c) => c.addAll(ARQS))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CASCA).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CASCA).then((k) => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
