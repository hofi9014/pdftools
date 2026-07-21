import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ALLOWED_ORIGINS = [
  'https://optimapdf.com',
  'https://www.optimapdf.com',
  'http://localhost:3000',
];
const rateMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
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
      const lang = part.trim().split(';')[0].split('-')[0].toLowerCase();
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
    if (request.method === 'POST') {
      const origin = request.headers.get('origin') || request.headers.get('referer') || '';
      if (origin) {
        const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
        if (!isAllowed) {
          console.warn(`[CSRF] ${method} ${pathname} origin=${origin} ip=${ip}`);
          return NextResponse.json(
            { error: 'Nieautoryzowane źródło żądania.' },
            { status: 403 }
          );
        }
      }
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
  if (segments.length > 0 && (LOCALES as readonly string[]).includes(segments[0])) {
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
  matcher: [
    '/api/:path*',
    '/((?!api|_next/static|_next/image|_next/data|favicon\\.ico|sitemap\\.xml|robots\\.txt|icon|guides).*)',
  ],
};
