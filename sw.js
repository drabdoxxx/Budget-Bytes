const CACHE_NAME = 'budget-bytes-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// الصفحة نفسها: نجرب الإنترنت الأول عشان الأسعار تيجي محدّثة من الشيت، ولو مفيش نت نرجع للنسخة المحفوظة
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // أي طلب برّه نفس الموقع (Google Sheets, واتساب, الخطوط...) ما نتدخلش فيه خالص
  if (new URL(req.url).origin !== self.location.origin) return;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate' || req.url.includes('index.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // باقي الملفات (الأيقونات، المانيفست): من الكاش الأول وأسرع، وبعدين نحدّثها في الخلفية
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
