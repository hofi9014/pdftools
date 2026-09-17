import type { NextConfig } from "next";

// Kept as tight as the app's actual runtime behavior allows — every origin listed here must be
// one the browser can genuinely reach from some real code path. `unpkg.com` (only ever used by
// an orphaned, unlinked public/icon-demo.html, now deleted), `fonts.googleapis.com`/
// `fonts.gstatic.com` (edit-pdf's fonts are self-hosted now, see lib/pdf/fonts.ts), and
// `openrouter.ai` in connect-src (the browser never calls it directly — only our own
// /api/ai server route does) were removed: none of them were reachable from the browser, so
// they only widened where an XSS could exfiltrate data to, with no functional upside.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.google-analytics.com https://apis.google.com https://accounts.google.com https://www.dropbox.com https://js.live.net",
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

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  poweredByHeader: false,
  async redirects() {
    // all locale segments EXCEPT 'guide' which conflicts with /guide static page
    const segments = ['przewodnik', 'guides', 'guides-fr', 'anleitungen', 'guias', 'guias-pt', 'guider', 'guider-no', 'handbaekur', 'rehber', 'دليل', 'راهنما', 'गाइड', 'ガイド', '指南'];
    return [
      {
        source: '/pdf-to-jpg',
        destination: '/pdf-to-images',
        permanent: true,
      },
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
    ];
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
        ],
      },
    ];
  },
};

export default nextConfig;
