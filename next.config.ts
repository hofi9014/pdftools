import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.google-analytics.com https://unpkg.com https://apis.google.com https://www.dropbox.com https://js.live.net",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "style-src-elem 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
  "font-src 'self' https://unpkg.com https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://www.google.com",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "connect-src 'self' https://openrouter.ai https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com https://apis.google.com https://www.googleapis.com https://content.dropboxapi.com https://api.onedrive.com https://graph.microsoft.com",
  "frame-src https://onedrive.live.com https://docs.google.com https://www.dropbox.com",
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
      {
        source: '/guide/:path*',
        destination: '/guides/guide/:path*',
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
