import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limit';

const LOCALES = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'] as const;
const DEFAULT_LOCALE = 'en';

const LEGACY_PATHS = new Set([
  '', 'merge', 'split', 'compress', 'pdf-to-word', 'word-to-pdf',
  'jpg-to-pdf', 'protect-pdf', 'unlock-pdf', 'rotate-pdf', 'page-numbers',
  'watermark-pdf', 'ocr-pdf', 'extract-pages', 'delete-pages', 'reorder-pages',
  'crop-pdf', 'add-page', 'edit-pdf', 'metadata', 'openoffice-to-pdf', 'sign-pdf',
  'pdf-to-openoffice', 'pdf-to-excel', 'ai-chat', 'ai-summary', 'privacy',
  'pdf-to-powerpoint', 'compare-pdf', 'excel-to-pdf', 'pdf-to-txt',
  'html-to-pdf', 'url-to-pdf', 'pdf-to-html', 'flatten-pdf',
  'pdf-to-svg', 'redact-pdf', 'pdf-to-epub', 'ai-translate', 'fill-form',
  'pdf-to-images', 'to-pdfa', 'faq', 'help', 'guide', 'rodo',
  'wsparcie', 'nasze-zasady', 'security', 'terms',
]);

const MAX_FILE_SIZE_BYTES = MAX_UPLOAD_BYTES;
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ALLOWED_ORIGINS = [
  'https://optimapdf.com',
  'https://www.optimapdf.com',
  'http://localhost:3000',
];
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const rateMap = new Map<string, { count: number; resetAt: number }>();
// rateMap is only ever written to, never swept — on a warm instance (this module persists
// across requests) an IP that sends one request and never returns leaves its entry here
// forever, growing unboundedly under sustained traffic from many distinct IPs. Swept
// opportunistically (on request volume, not a background timer, whose firing isn't
// guaranteed across every runtime this proxy might execute in) rather than on every call,
// to keep the O(map size) sweep cost off the hot path.
export const RATE_LIMIT_SWEEP_INTERVAL = 500;
let requestsSinceSweep = 0;
export function getRateMapForTesting(): Map<string, { count: number; resetAt: number }> {
  return rateMap;
}
export function resetRateLimitSweepStateForTesting(): void {
  rateMap.clear();
  requestsSinceSweep = 0;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

// Exported so tests/proxy-rate-limit-sweep.mts can directly observe rateMap's actual size
// after a sweep, rather than only inferring it indirectly through proxy()'s allow/deny output
// (which can't tell "no cleanup, still allowed because it's a fresh IP" apart from "cleanup
// happened correctly").
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  requestsSinceSweep++;
  if (requestsSinceSweep >= RATE_LIMIT_SWEEP_INTERVAL) {
    requestsSinceSweep = 0;
    for (const [key, val] of rateMap) {
      if (now > val.resetAt) rateMap.delete(key);
    }
  }
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_REQUESTS;
}

function detectLocale(request: NextRequest): string {
  const cookie = request.cookies.get('x-detected-locale');
  if (cookie?.value && (LOCALES as readonly string[]).includes(cookie.value)) {
    return cookie.value;
  }
  const acceptLang = request.headers.get('Accept-Language');
  if (acceptLang) {
    for (const part of acceptLang.split(',')) {
      // Safe: String.split always returns a non-empty array, so [0] always exists.
      const lang = part.trim().split(';')[0]!.split('-')[0]!.toLowerCase();
      if (lang && (LOCALES as readonly string[]).includes(lang)) {
        return lang;
      }
    }
  }
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const method = request.method;

  if (pathname.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${method} ${pathname} ip=${ip}`);
    if (!checkRateLimit(ip)) {
      console.warn(`[RATE LIMIT] ${method} ${pathname} ip=${ip}`);
      return NextResponse.json(
        { error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    if (STATE_CHANGING_METHODS.includes(request.method)) {
      const originHeader = request.headers.get('origin') || request.headers.get('referer');
      // Parse into a real origin and check exact set membership — a substring/prefix
      // check here (origin.startsWith(allowed)) would let an attacker-controlled domain
      // like "https://optimapdf.com.evil.com" through, since it starts with an allowed
      // origin too. new URL(...).origin normalizes both a bare Origin header and a full
      // Referer URL (which carries a path) to the same comparable form.
      let originIsAllowed = false;
      if (originHeader) {
        try {
          originIsAllowed = ALLOWED_ORIGINS.includes(new URL(originHeader).origin);
        } catch {
          originIsAllowed = false;
        }
      }
      if (!originIsAllowed) {
        const reportedOrigin = originHeader || '<none>';
        console.warn(`[CSRF] ${method} ${pathname} origin=${reportedOrigin} ip=${ip}`);
        return NextResponse.json(
          { error: 'Nieautoryzowane źródło żądania.' },
          { status: 403 }
        );
      }
    }
    if (request.method === 'POST') {
      const contentLength = request.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (!isNaN(size) && size > MAX_FILE_SIZE_BYTES) {
          console.warn(`[FILE TOO LARGE] ${method} ${pathname} size=${size} ip=${ip}`);
          return NextResponse.json(
            { error: `Plik jest za duży. Maksymalny rozmiar: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.` },
            { status: 413 }
          );
        }
      }
    }
    return NextResponse.next();
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && (LOCALES as readonly string[]).includes(segments[0]!)) {
    return NextResponse.next();
  }

  const slug = segments[0] ?? '';
  if (!LEGACY_PATHS.has(slug)) {
    return NextResponse.next();
  }

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = slug ? `/${locale}/${slug}` : `/${locale}`;

  return NextResponse.redirect(url, 307);
}

export const config = {
  // The page matcher skips anything that ends in a file extension: every legacy path this proxy
  // redirects is extension-less, while public/ holds hundreds of static files (pdf.js CMaps and
  // fonts, the OCR WASM and language data, the service worker, the OAuth helper pages) that
  // would otherwise each invoke the proxy for nothing.
  //
  // It also skips every path that already starts with a locale ("/pl", "/pl/merge"): proxy()
  // does nothing for those, but matching them put a function invocation in front of every
  // canonical page and every <Link> prefetch — measured on production, ~100 ms server wait
  // instead of ~50 ms straight from the CDN. The matcher must be a literal (it is analysed at
  // build time), so the locale list is repeated here; tests/vercelignore-keeps-app-files.mts
  // fails if it drifts from LOCALES.
  matcher: [
    '/api/:path*',
    '/((?!api|_next/static|_next/image|_next/data|favicon\\.ico|sitemap\\.xml|robots\\.txt|icon|guides|(?:ar|de|en|es|fa|fr|hi|is|it|ja|no|pl|pt|sv|tr|zh)(?:/|$)|.*\\.[a-zA-Z0-9]+$).*)',
  ],
};
