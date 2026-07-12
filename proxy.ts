import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const method = request.method;

  const response = NextResponse.next();

  // API handling
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
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
