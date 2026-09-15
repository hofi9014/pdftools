import { Buffer } from 'buffer';
import { URL } from 'url';
import { isIP } from 'net';
import { promises as dns } from 'dns';

const BLOCKED_HOSTS = [
  'localhost', '127.0.0.1', '::1', '0.0.0.0',
  '10.', '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
  '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
  '172.30.', '172.31.', '192.168.', '169.254.',
  'metadata.google.internal', '100.100.100.204',
  '100.100.100.205', '100.100.100.206',
];

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  // Resolve to IP if it's a hostname
  if (BLOCKED_HOSTS.some(h => lower === h || lower.startsWith(h))) return true;
  return false;
}

function isPrivateOrReservedAddress(address: string): boolean {
  let ip = address.trim().toLowerCase();
  // Strip IPv6 zone id (fe80::1%eth0)
  const zoneIdx = ip.indexOf('%');
  if (zoneIdx !== -1) ip = ip.slice(0, zoneIdx);
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) — evaluate as the embedded IPv4
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice('::ffff:'.length);
  }
  const version = isIP(ip);
  if (version === 4) {
    if (ip === '0.0.0.0') return true;
    if (ip.startsWith('127.')) return true; // loopback
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    if (ip.startsWith('169.254.')) return true; // link-local / metadata
    const octets = ip.split('.');
    if (octets[0] === '172') {
      const second = parseInt(octets[1] || '0', 10);
      if (second >= 16 && second <= 31) return true;
    }
    return false;
  }
  if (version === 6) {
    if (ip === '::' || ip === '::1') return true; // unspecified / loopback
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // fc00::/7 unique local
    if (
      ip.startsWith('fe8') || ip.startsWith('fe9') ||
      ip.startsWith('fea') || ip.startsWith('feb')
    ) return true; // fe80::/10 link-local
    return false;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'Nie przesłano adresu URL.' }, { status: 400 });
    }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    let parsed: URL;
    try {
      parsed = new URL(normalizedUrl);
    } catch {
      return Response.json({ error: 'Nieprawidłowy adres URL.' }, { status: 400 });
    }

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return Response.json({ error: 'Dozwolone tylko protokoły HTTP/HTTPS.' }, { status: 400 });
    }

    // Block internal/private IPs
    if (isBlockedHost(parsed.hostname)) {
      return Response.json({ error: 'Adres URL jest zablokowany.' }, { status: 403 });
    }

    // Block if hostname resolves to an IP
    if (isIP(parsed.hostname)) {
      const ip = parsed.hostname;
      if (
        ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0' ||
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') || ip.startsWith('172.21.') || ip.startsWith('172.22.') || ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') || ip.startsWith('172.25.') || ip.startsWith('172.26.') || ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') || ip.startsWith('172.29.') || ip.startsWith('172.30.') || ip.startsWith('172.31.') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('169.254.')
      ) {
        return Response.json({ error: 'Adres URL jest zablokowany.' }, { status: 403 });
      }
    }

    // Restrict to port 80 and 443 only
    if (parsed.port && parsed.port !== '' && parsed.port !== '80' && parsed.port !== '443') {
      return Response.json({ error: 'Dozwolone tylko porty 80 i 443.' }, { status: 400 });
    }

    // DNS rebinding guard: verify the actual addresses the hostname resolves to,
    // not just its textual name. Rejects private/loopback/link-local IPv4 and IPv6.
    try {
      if (isIP(parsed.hostname)) {
        if (isPrivateOrReservedAddress(parsed.hostname)) {
          return Response.json({ error: 'Adres URL jest zablokowany.' }, { status: 403 });
        }
      } else {
        const addresses = await dns.lookup(parsed.hostname, { all: true });
        if (addresses.length === 0) {
          return Response.json({ error: 'Nie udało się rozwiązać adresu URL.' }, { status: 400 });
        }
        for (const { address } of addresses) {
          if (isPrivateOrReservedAddress(address)) {
            return Response.json({ error: 'Adres URL jest zablokowany.' }, { status: 403 });
          }
        }
      }
    } catch {
      return Response.json({ error: 'Nie udało się rozwiązać adresu URL.' }, { status: 400 });
    }

    const response = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OptimaPDF/1.0)' },
      signal: AbortSignal.timeout(15000),
      redirect: 'manual',
    });

    // Don't follow redirects that could lead to internal resources
    if (response.status >= 300 && response.status < 400) {
      return Response.json({ error: 'Przekierowania nie są obsługiwane.' }, { status: 400 });
    }

    if (!response.ok) throw new Error('Nie udało się pobrać strony');

    const html = await response.text();
    const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;
    const lineHeight = fontSize * 1.5;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const maxWidth = pageWidth - margin * 2;

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    const lines = text.match(/.{1,100}(?:\s|$)/g) || [text];

    for (const line of lines) {
      if (y < margin + 20) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line.trim(), { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }

    const result = Buffer.from(await pdf.save());
    return new Response(new Uint8Array(result), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="strona.pdf"` },
    });
  } catch (err) {
    return Response.json({ error: 'Wystąpił błąd podczas przetwarzania URL.' }, { status: 500 });
  }
}
