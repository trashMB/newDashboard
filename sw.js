// Service worker : garde une copie des fichiers pour ouvrir l'application sans connexion (EX-DON-08).
// Stratégie « réseau d'abord » : en ligne, on prend toujours la version la plus récente et on met la copie à jour ;
// hors ligne, on sert la dernière copie.
const CACHE = "portefeuille-v2";
const FICHIERS = [
  "./",
  "index.html",
  "css/style.css",
  "js/marches.js",
  "js/coffre.js",
  "js/app.js",
  "donnees/marches.js",
  "manifest.webmanifest",
  "icones/icone-192.png",
  "icones/icone-512.png",
];

self.addEventListener("install", evenement => {
  evenement.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FICHIERS)));
  self.skipWaiting();
});

// Supprime les copies des anciennes versions.
self.addEventListener("activate", evenement => {
  evenement.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(nom => nom !== CACHE).map(nom => caches.delete(nom))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", evenement => {
  const requete = evenement.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== location.origin) return;
  evenement.respondWith(
    fetch(requete)
      .then(reponse => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE).then(cache => cache.put(requete, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(requete, { ignoreSearch: true })),
  );
});
