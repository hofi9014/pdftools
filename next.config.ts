import type { NextConfig } from "next";
import { GUIDES_HUB_SEGMENTS } from "./lib/guides-hub-segments";
import { GUIDE_CATEGORY_SLUGS } from "./lib/guide-category-slugs";
import { GUIDE_ARTICLE_SLUGS } from "./lib/guide-article-slugs";

// Kept as tight as the app's actual runtime behavior allows — every origin listed here must be
// one the browser can genuinely reach from some real code path. `unpkg.com` (only ever used by
// an orphaned, unlinked public/icon-demo.html, now deleted), `fonts.googleapis.com`/
// `fonts.gstatic.com` (edit-pdf's fonts are self-hosted now, see lib/pdf/fonts.ts), and
// `openrouter.ai` in connect-src (the browser never calls it directly — only our own
// /api/ai server route does) were removed: none of them were reachable from the browser, so
// they only widened where an XSS could exfiltrate data to, with no functional upside.
// 'unsafe-eval' only for `next dev` (its hot reload evaluates code). The built site needs none:
// the one thing that compiles code is WebAssembly (OCR, tesseract.js), which 'wasm-unsafe-eval'
// allows without letting a script turn strings into code — measured with e2e/csp-no-eval.mts.
const evalSource = process.env.NODE_ENV === 'production' ? "'wasm-unsafe-eval'" : "'unsafe-eval' 'wasm-unsafe-eval'";

// Pages a sign-in popup returns to: they hand the token to the window that opened them through
// window.opener, which a Cross-Origin-Opener-Policy on them would cut (the popup has just been on
// the provider's site). Every other page sends same-origin-allow-popups: no other site's window
// can reach this one, and the popups this page opens keep their link back to it.
const OAUTH_RETURN_PAGES = ['/dropbox-oauth.html', '/onedrive-oauth.html', '/onedrive-picker-oauth.html', '/sharepoint-oauth.html'];

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${evalSource} https://www.googletagmanager.com https://*.google-analytics.com https://apis.google.com https://accounts.google.com https://www.dropbox.com https://js.live.net`,
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // https://www.googletagmanager.com here (not just in script-src/connect-src) is required for
  // GA4's own image-beacon fallback ping (gtag.js's consent/init signal) — pre-existing gap
  // found live: after a visitor accepts cookies, that beacon was silently CSP-blocked, so
  // consented analytics never actually reached Google. Found while verifying the
  // load-GA-only-after-consent fix (components/CookieConsent.tsx), not introduced by it.
  "img-src 'self' data: blob: https://www.google.com https://www.googletagmanager.com https://www.dropbox.com https://p.sfx.ms https://*.microsoftpersonalcontent.com https://*.sharepoint.com",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com https://apis.google.com https://accounts.google.com https://www.googleapis.com https://content.dropboxapi.com https://*.dropboxusercontent.com https://api.onedrive.com https://graph.microsoft.com https://my.microsoftpersonalcontent.com https://*.microsoftpersonalcontent.com https://*.sharepoint.com",
  "frame-src https://onedrive.live.com https://docs.google.com https://www.dropbox.com https://*.dropboxusercontent.com https://login.microsoftonline.com https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

// The language prefixes; tests/vercelignore-keeps-app-files.mts fails if this drifts from lib/i18n.ts.
const LOCALE_SEGMENTS = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'id', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];

// Until 2026-11-14 every language used the English guide category and article ids
// (/guides/przewodnik/compress-pdf/how-to-compress-pdf-online); since then each language has its
// own (lib/guide-urls.ts). Old addresses answer 308 here — a page can only redirect with a status
// before it starts streaming, a config redirect always does. Destinations are percent-encoded
// (the Location header must be ASCII); sources are given both as written and percent-encoded.
const enc = (path: string) => path.split('/').map((s) => encodeURIComponent(s)).join('/');
// The languages that had guides before 2026-11-14 — only their old addresses exist. (A language
// added later never had English-id addresses, and the list keeps the redirect count bounded.)
const LEGACY_GUIDE_LOCALES = ['ar', 'de', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];
function legacyGuideRedirects() {
  const out: { source: string; destination: string; permanent: true }[] = [];
  const add = (from: string, to: string) => {
    for (const source of new Set([from, enc(from)])) out.push({ source, destination: enc(to), permanent: true });
  };
  for (const locale of LEGACY_GUIDE_LOCALES) {
    const hub = GUIDES_HUB_SEGMENTS[locale as keyof typeof GUIDES_HUB_SEGMENTS];
    for (const [category, catNames] of Object.entries(GUIDE_CATEGORY_SLUGS)) {
      const cat = catNames[locale] ?? category;
      if (cat !== category) add(`/guides/${hub}/${category}`, `/guides/${hub}/${cat}`);
      for (const [slug, names] of Object.entries(GUIDE_ARTICLE_SLUGS[category] ?? {})) {
        const art = names[locale] ?? slug;
        if (cat !== category || art !== slug) add(`/guides/${hub}/${category}/${slug}`, `/guides/${hub}/${cat}/${art}`);
      }
    }
  }
  return out;
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  poweredByHeader: false,
  // app/global-not-found.tsx: with several root layouts there is no single layout for a 404.
  experimental: {
    globalNotFound: true,
  },
  async redirects() {
    // all locale segments EXCEPT 'guide' which conflicts with /guide static page
    const segments: string[] = Object.values(GUIDES_HUB_SEGMENTS).filter((s) => s !== 'guide');
    return [
      {
        source: '/pdf-to-jpg',
        destination: '/pdf-to-images',
        permanent: true,
      },
      // KSeF XML to PDF exists only in Polish.
      { source: '/ksef-xml-na-pdf', destination: '/pl/ksef-xml-na-pdf', permanent: true },
      // exact match dla wszystkich segmentów (root → /guides/{segment})
      ...segments.map((segment) => ({
        source: `/${segment}`,
        destination: `/guides/${segment}`,
        permanent: true,
      })),
      // wildcard catch-all dla segmentów które nie są prefiksem /guides/
      ...segments.filter((s) => s !== 'guides').map((segment) => ({
        source: `/${segment}/:path*`,
        destination: `/guides/${segment}/:path*`,
        permanent: true,
      })),
      // backward compat for Italian guide paths (/guide/xxx → /guides/guide/xxx)
      // Must use :path+ (one-or-more) to NOT redirect /guide itself (which is a real page)
      {
        source: '/guide/:path+',
        destination: '/guides/guide/:path+',
        permanent: true,
      },
      ...legacyGuideRedirects(),
    ];
  },
  async rewrites() {
    return {
      // An address whose first segment is no language, no route and no file (/xx, /xx/merge,
      // /index.html, /.env) would otherwise reach app/[locale] with that segment as its locale.
      // Next 16.3 answered it with the site's 404 page only under `dynamicParams = false`, which
      // Next 16.4 turns into HTTP 500 (NoFallbackError) — and without it both render a bare 404
      // with no header. afterFiles rewrites run after public files and static pages (the legacy
      // unprefixed pages, sitemap.xml, robots.txt, icon.png are served first) and before dynamic
      // routes, so only such addresses get here; under a real language a missing page is the
      // site's 404 page in both versions. The address in the browser stays as typed.
      afterFiles: [
        {
          // `(?![^/])`, not `$`: the excluded word must end the SEGMENT — `$` here is the end of the
          // whole address, so `pl$` would let /pl/merge through to the 404 page.
          source: `/:first((?!(?:${LOCALE_SEGMENTS.join('|')}|guides|api|_next)(?![^/]))[^/]+)/:rest*`,
          destination: '/en/__not-found',
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), usb=(), payment=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },

          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          // Vercel's CDN otherwise adds "Access-Control-Allow-Origin: *" to every response. No other
          // site needs to read our pages or files from a browser, so only our own origin is named.
          { key: 'Access-Control-Allow-Origin', value: 'https://optimapdf.com' },
        ],
      },
      // Later entries win for the same header (Next docs): the sign-in return pages opt out.
      ...OAUTH_RETURN_PAGES.map((source) => ({
        source,
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' }],
      })),
    ];
  },
};

export default nextConfig;
