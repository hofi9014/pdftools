// /llms.txt — see lib/llms-text.ts. Static: generated at build time like sitemap.xml.
import { llmsText } from '@/lib/llms-text';

export const dynamic = 'force-static';

export function GET() {
  return new Response(llmsText(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
