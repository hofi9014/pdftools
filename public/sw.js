const CACHE = 'pdftools-v5';
const TOOL_PAGES = [
  '/', '/merge', '/split', '/compress', '/pdf-to-word', '/word-to-pdf',
  '/pdf-to-jpg', '/jpg-to-pdf', '/protect-pdf', '/unlock-pdf', '/rotate-pdf',
  '/page-numbers', '/watermark-pdf', '/ocr-pdf', '/extract-pages', '/delete-pages',
  '/reorder-pages', '/crop-pdf', '/add-page', '/edit-pdf', '/metadata',
  '/openoffice-to-pdf', '/pdf-to-openoffice', '/pdf-to-excel', '/excel-to-pdf',
  '/pdf-to-txt', '/pdf-to-svg', '/redact-pdf', '/pdf-to-epub',
  '/ai-chat', '/ai-summary', '/ai-translate', '/pdf-to-powerpoint', '/compare-pdf',
  '/html-to-pdf', '/url-to-pdf', '/pdf-to-html', '/flatten-pdf',
  '/sign-pdf', '/privacy',
  '/fill-form', '/pdf-to-images', '/to-pdfa',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => {
      return c.addAll([
        '/',
        '/manifest.webmanifest',
        '/icon.svg',
        '/icon-192.svg',
        '/icon-512.svg',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => { if (k !== CACHE) return caches.delete(k); }))
    )
  );
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Tool pages: stale-while-revalidate for instant offline
  if (TOOL_PAGES.includes(path)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): cache-first
  if (path.match(/\.(js|css|woff2?|ttf|png|svg|ico|json)$/)) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return response;
        })
      )
    );
    return;
  }

  // API routes: network-only, NEVER cache
  if (path.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Default: network-first with cache fallback
  e.respondWith(
    fetch(e.request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE).then((c) => c.put(e.request, clone));
      return response;
    }).catch(() => caches.match(e.request))
  );
});
