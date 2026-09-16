import { Buffer } from 'buffer';
import { URL } from 'url';
import { isIP, BlockList } from 'net';
import { promises as dns, type LookupAddress, type LookupOptions } from 'dns';
import * as http from 'http';
import * as https from 'https';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limit';

// Built on Node's own SSRF-prevention primitive (net.BlockList, since v15) rather
// than hand-rolled prefix checks: it normalizes IPv6 (expanded/compressed forms
// compare equal) and its CIDR matching is exercised by Node's own test suite.
const PRIVATE_BLOCKLIST = new BlockList();
PRIVATE_BLOCKLIST.addSubnet('0.0.0.0', 8, 'ipv4'); // "this network" + unspecified
PRIVATE_BLOCKLIST.addSubnet('10.0.0.0', 8, 'ipv4'); // RFC 1918
PRIVATE_BLOCKLIST.addSubnet('100.64.0.0', 10, 'ipv4'); // RFC 6598 CGNAT
PRIVATE_BLOCKLIST.addSubnet('127.0.0.0', 8, 'ipv4'); // loopback
PRIVATE_BLOCKLIST.addSubnet('169.254.0.0', 16, 'ipv4'); // link-local / cloud metadata
PRIVATE_BLOCKLIST.addSubnet('172.16.0.0', 12, 'ipv4'); // RFC 1918
PRIVATE_BLOCKLIST.addSubnet('192.168.0.0', 16, 'ipv4'); // RFC 1918
PRIVATE_BLOCKLIST.addSubnet('198.18.0.0', 15, 'ipv4'); // RFC 2544 benchmarking
PRIVATE_BLOCKLIST.addSubnet('240.0.0.0', 4, 'ipv4'); // reserved / future use
PRIVATE_BLOCKLIST.addSubnet('::1', 128, 'ipv6'); // loopback
PRIVATE_BLOCKLIST.addSubnet('::', 128, 'ipv6'); // unspecified
PRIVATE_BLOCKLIST.addSubnet('fc00::', 7, 'ipv6'); // unique local
PRIVATE_BLOCKLIST.addSubnet('fe80::', 10, 'ipv6'); // link-local

export function isPrivateOrReservedAddress(address: string): boolean {
  let ip = address.trim().toLowerCase();
  // Strip IPv6 zone id (fe80::1%eth0)
  const zoneIdx = ip.indexOf('%');
  if (zoneIdx !== -1) ip = ip.slice(0, zoneIdx);
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) — evaluate as the embedded IPv4
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice('::ffff:'.length);
  }
  const version = isIP(ip);
  if (version === 4) return PRIVATE_BLOCKLIST.check(ip, 'ipv4');
  if (version === 6) return PRIVATE_BLOCKLIST.check(ip, 'ipv6');
  return false;
}

// Builds a `lookup` function for http(s).request that ALWAYS returns the exact
// address list passed in, never performing a fresh DNS query. This is the fix
// for the DNS-rebinding TOCTOU: the caller resolves once, validates every
// address against PRIVATE_BLOCKLIST, then freezes that list here so the socket
// that actually connects is guaranteed to use an address we already checked —
// there is no second, independent resolution for an attacker's short-TTL
// record to race.
export function makeFrozenLookup(addresses: LookupAddress[]) {
  return (
    hostname: string,
    options: LookupOptions,
    callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
  ): void => {
    const wantFamily = options.family === 'IPv4' ? 4 : options.family === 'IPv6' ? 6 : (options.family ?? 0);
    const filtered = wantFamily === 4 || wantFamily === 6
      ? addresses.filter(a => a.family === wantFamily)
      : addresses;

    if (filtered.length === 0) {
      const err = new Error(`ENOTFOUND ${hostname}`) as NodeJS.ErrnoException;
      err.code = 'ENOTFOUND';
      callback(err, '', 0);
      return;
    }

    if (options.all) {
      callback(null, filtered);
    } else {
      callback(null, filtered[0].address, filtered[0].family);
    }
  };
}

type FetchOutcome =
  | { kind: 'ok'; body: string }
  | { kind: 'redirect' }
  | { kind: 'bad-status' }
  | { kind: 'too-large' };

// Replaces the previous fetch()-based request. Node's global fetch (undici)
// offers no supported way to pin the connection to a pre-validated address, so
// this uses the stdlib http(s).request with the frozen `lookup` above. `host`/
// `servername` stay the real hostname (not an IP), so the Host header, virtual
// hosting and TLS certificate validation (SNI) all behave exactly as they
// would for a normal request — only the socket's address is pinned.
export function fetchViaValidatedAddresses(parsed: URL, addresses: LookupAddress[]): Promise<FetchOutcome> {
  return new Promise((resolve, reject) => {
    const isHttps = parsed.protocol === 'https:';
    const mod = isHttps ? https : http;
    const port = parsed.port ? Number(parsed.port) : (isHttps ? 443 : 80);
    const requestOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OptimaPDF/1.0)' },
      lookup: makeFrozenLookup(addresses),
      timeout: 15000,
      ...(isHttps ? { servername: parsed.hostname } : {}),
    };

    const req = mod.request(requestOptions, (res) => {
      const status = res.statusCode ?? 0;
      // Don't follow redirects that could lead to internal resources, and
      // don't buffer the body of a blocked/erroring response.
      if (status >= 300 && status < 400) {
        res.resume();
        resolve({ kind: 'redirect' });
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        resolve({ kind: 'bad-status' });
        return;
      }
      const chunks: Buffer[] = [];
      let receivedBytes = 0;
      let tooLarge = false;
      res.on('data', (chunk: Buffer) => {
        if (tooLarge) return;
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_UPLOAD_BYTES) {
          // `timeout` above only guards socket IDLE time, not total response size — a
          // server streaming data continuously (or just serving a huge file) would
          // otherwise buffer unbounded bytes into memory. Stop reading and tear down
          // the request as soon as the cap is exceeded.
          tooLarge = true;
          req.destroy();
          resolve({ kind: 'too-large' });
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        if (tooLarge) return;
        resolve({ kind: 'ok', body: Buffer.concat(chunks).toString('utf-8') });
      });
      res.on('error', (err) => {
        if (tooLarge) return;
        reject(err);
      });
    });

    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
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

    // Restrict to port 80 and 443 only
    if (parsed.port && parsed.port !== '' && parsed.port !== '80' && parsed.port !== '443') {
      return Response.json({ error: 'Dozwolone tylko porty 80 i 443.' }, { status: 400 });
    }

    // DNS rebinding guard: resolve the hostname exactly once, validate every
    // returned address, then freeze that list for the connection below. This
    // is the fix for SEC-003b — previously dns.lookup() here validated one
    // resolution while fetch() performed a second, independent one, leaving a
    // window for a short-TTL DNS answer to swap a public IP for a private one
    // between the check and the connect.
    let validatedAddresses: LookupAddress[];
    if (isIP(parsed.hostname)) {
      const family = isIP(parsed.hostname);
      if (isPrivateOrReservedAddress(parsed.hostname)) {
        return Response.json({ error: 'Adres URL jest zablokowany.' }, { status: 403 });
      }
      validatedAddresses = [{ address: parsed.hostname, family }];
    } else {
      let addresses: LookupAddress[];
      try {
        addresses = await dns.lookup(parsed.hostname, { all: true });
      } catch {
        return Response.json({ error: 'Nie udało się rozwiązać adresu URL.' }, { status: 400 });
      }
      if (addresses.length === 0) {
        return Response.json({ error: 'Nie udało się rozwiązać adresu URL.' }, { status: 400 });
      }
      for (const { address } of addresses) {
        if (isPrivateOrReservedAddress(address)) {
          return Response.json({ error: 'Adres URL jest zablokowany.' }, { status: 403 });
        }
      }
      validatedAddresses = addresses;
    }

    const outcome = await fetchViaValidatedAddresses(parsed, validatedAddresses);

    // Don't follow redirects that could lead to internal resources
    if (outcome.kind === 'redirect') {
      return Response.json({ error: 'Przekierowania nie są obsługiwane.' }, { status: 400 });
    }

    if (outcome.kind === 'bad-status') throw new Error('Nie udało się pobrać strony');

    if (outcome.kind === 'too-large') {
      return Response.json(
        { error: `Strona jest za duża. Maksymalny rozmiar: ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    const html = outcome.body;
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
