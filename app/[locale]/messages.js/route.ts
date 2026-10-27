import { locales, type Locale } from '@/lib/i18n';
import { messagesScript } from '@/lib/i18n-asset';

// One dictionary per language, built once at build time (see lib/i18n-asset.ts).
export const dynamic = 'force-static';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) return new Response('Not found', { status: 404 });
  return new Response(messagesScript(locale as Locale), {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      // The page asks for /<locale>/messages.js?v=<content hash>: a new dictionary is a new address.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
