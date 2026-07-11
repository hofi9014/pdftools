const CACHE_NAME = 'optimapdf-v1';
const OFFLINE_URL = '/offline.html';
const STATIC_PATTERNS = [
  '/_next/static/',
  '/tesseract/worker.min.js',
  '/tesseract/tesseract-core-',
  '/icons/',
  '/favicon.ico',
  '/logo.png',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && !k.startsWith('tesseract-lang-'))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return STATIC_PATTERNS.some(p => url.pathname.startsWith(p)) ||
         url.pathname.endsWith('.css') && !url.pathname.startsWith('/api/') ||
         url.pathname.endsWith('.js') && !url.pathname.startsWith('/api/');
}

function cacheFirst(request) {
  return caches.open(CACHE_NAME).then(cache =>
    cache.match(request).then(match =>
      match || fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    )
  );
}

function networkFirstWithFallback(request) {
  return fetch(request).then(response => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
    }
    return response;
  }).catch(() =>
    caches.match(request).then(match => match || caches.match(OFFLINE_URL))
  );
}

function networkOnly(request) {
  return fetch(request);
}

function tesseractLangStrategy(request, lang) {
  const langCache = 'tesseract-lang-' + lang;
  return caches.open(langCache).then(cache =>
    cache.match(request).then(match =>
      match || fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
    )
  );
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Early return for external domains — let them pass through untouched
  if (url.origin !== self.location.origin) return;

  // Tesseract language data — on-demand cache per language
  const langMatch = url.pathname.match(/^\/tesseract\/lang-data\/([\w-]+)\.traineddata(\.gz)?$/);
  if (langMatch) {
    event.respondWith(tesseractLangStrategy(event.request, langMatch[1]));
    return;
  }

  // API calls — network only (no offline fallback, APIs need backend)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(event.request));
    return;
  }

  // Static assets — cache first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Navigation — network first with offline.html fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(event.request));
    return;
  }

  // Default: network first with cached fallback
  event.respondWith(networkFirstWithFallback(event.request));
});
