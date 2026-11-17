// Which online "compress PDF" tools send the file to a server — the measurement behind the page
// /{locale}/where-your-file-goes (content/pages/upload-comparison.ts). Run by hand, not in CI: it
// visits other companies' sites. First run 2026-11-17. (Adobe Acrobat online was tried too: it
// answers automated browsers with "Access Denied", so it cannot be measured this way.)
//
// Method. A synthetic PDF (~300 kB) carries a random marker followed by random data, so it is
// recognisable anywhere it goes and cannot be anyone's real document. For each service the
// browser opens the compress tool, chooses the file and starts compression. Chrome writes a
// net-log of every byte it sends to the network, in plaintext after TLS (QUIC is turned off so
// all traffic goes through TLS sockets). The file left the browser if the marker — or a form part
// named after it, which catches tools that zip the file before sending it — appears in those
// bytes; the server it went to is the socket's connection group. No account is created and no
// cookie banner is accepted. A control run sends the same file on purpose from OptimaPDF to a
// path that does not exist: the measurement must report it, or it proves nothing.
//
// Run: npx tsx scripts/measure-upload-comparison.mts      (writes test-output/upload-comparison.json)
import { chromium, type Page } from 'playwright';
import { PDFDocument, PDFName, StandardFonts, PDFRawStream, type PDFDict } from 'pdf-lib';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITES: Array<{ name: string; url: string }> = [
  { name: 'OptimaPDF', url: 'https://optimapdf.com/en/compress' },
  { name: 'iLovePDF', url: 'https://www.ilovepdf.com/compress_pdf' },
  { name: 'Smallpdf', url: 'https://smallpdf.com/compress-pdf' },
  { name: 'PDF24', url: 'https://tools.pdf24.org/en/compress-pdf' },
  { name: 'Sejda', url: 'https://www.sejda.com/compress-pdf' },
  { name: 'OptaPDF', url: 'https://optapdf.com/compress-pdf' },
];

const MARKER = 'OPTIMAPROBE' + randomBytes(4).toString('hex').toUpperCase();
const doc = await PDFDocument.create();
doc.addPage([595, 842]).drawText('Synthetic test file for an upload measurement.', { x: 50, y: 780, size: 14, font: await doc.embedFont(StandardFonts.Helvetica) });
const noise = doc.context.register(PDFRawStream.of(doc.context.obj({}) as PDFDict, Buffer.concat([Buffer.from(MARKER), randomBytes(300_000)])));
doc.catalog.set(PDFName.of('OptimaProbe'), noise);
const pdf = Buffer.from(await doc.save({ useObjectStreams: false }));
if (!pdf.includes(MARKER)) throw new Error('the marker is not in the plain bytes of the file');
console.log(`marker ${MARKER}, file ${pdf.length} B\n`);

/** Servers the file reached, from the bytes Chrome wrote to its sockets. */
function verdict(path: string) {
  const raw = readFileSync(path, 'utf8').trim();
  let log;
  try { log = JSON.parse(raw); } catch { log = JSON.parse(raw.replace(/,?\s*$/, '') + ']}'); }
  const types: Record<string, number> = log.constants.logEventTypes;
  const sentTypes = new Set([types.SSL_SOCKET_BYTES_SENT, types.SOCKET_BYTES_SENT]);
  const group = new Map<number, string>();
  const dep = new Map<number, number>();
  const sent = new Map<number, Buffer[]>();
  for (const e of log.events) {
    const id = e.source?.id; const pr = e.params || {};
    if (pr.group_id) group.set(id, String(pr.group_id));
    if (pr.host && !group.has(id)) group.set(id, String(pr.host));
    if (pr.source_dependency?.id != null) { dep.set(id, pr.source_dependency.id); if (!dep.has(pr.source_dependency.id)) dep.set(pr.source_dependency.id, id); }
    if (sentTypes.has(e.type) && pr.bytes) { const l = sent.get(id) ?? []; l.push(Buffer.from(pr.bytes, 'base64')); sent.set(id, l); }
  }
  const hostOf = (id: number) => {
    let cur: number | undefined = id;
    for (let i = 0; i < 6 && cur != null; i++) {
      if (group.has(cur)) return group.get(cur)!.replace(/^(ssl|pm)\//, '').replace(/^https?:\/\//, '').replace(/:443$/, '');
      cur = dep.get(cur);
    }
    return '?';
  };
  const to = new Set<string>(); let bytesSent = 0;
  for (const [id, parts] of sent) {
    const b = Buffer.concat(parts); bytesSent += b.length;
    if (b.includes(MARKER) || b.includes(`filename="${MARKER}.pdf"`)) to.add(hostOf(id));
  }
  return { fileLeftBrowser: to.size > 0, sentTo: [...to], bytesSent };
}

async function startCompression(p: Page) {
  // A start button where the tool needs one; never a consent "accept" button.
  const btn = p.locator('button, a[role="button"], input[type="submit"]').filter({ hasText: /^\s*compress( pdf)?\s*$/i }).first();
  if (await btn.count()) await btn.click({ timeout: 5000 }).catch(() => {});
}

async function measure(site: { name: string; url: string }, control = false) {
  const dir = mkdtempSync(join(tmpdir(), 'netlog-'));
  const logPath = join(dir, 'netlog.json');
  const browser = await chromium.launch({ headless: true, args: ['--disable-quic', `--log-net-log=${logPath}`, '--net-log-capture-mode=Everything'] });
  const ctx = await browser.newContext({ locale: 'en-US', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });
  const p = await ctx.newPage();
  let note = '';
  try {
    await p.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(4000);
    const input = p.locator('input[type="file"]').first();
    if (!(await input.count())) note = `no file input (page title: ${await p.title()})`;
    else {
      await input.setInputFiles({ name: `${MARKER}.pdf`, mimeType: 'application/pdf', buffer: pdf });
      await p.waitForTimeout(6000);
      await startCompression(p);
      await p.waitForTimeout(20000);
      if (control) {
        await p.evaluate(async (b64) => {
          const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          await fetch('/__upload-measurement-control', { method: 'POST', body: new Blob([bin]) }).catch(() => null);
        }, pdf.toString('base64'));
        await p.waitForTimeout(3000);
      }
    }
  } catch (e) { note = String((e as Error).message).split('\n')[0]!.slice(0, 120); }
  await ctx.close();
  await browser.close();
  const r = { site: control ? `${site.name} (control)` : site.name, url: site.url, ...verdict(logPath), note };
  rmSync(dir, { recursive: true, force: true });
  console.log(JSON.stringify(r));
  return r;
}

const results = [];
for (const s of SITES) results.push(await measure(s));
const control = await measure(SITES[0]!, true);
if (!control.fileLeftBrowser) { console.error('\nCONTROL FAILED: a deliberate upload was not seen — the results above prove nothing.'); process.exitCode = 1; }
mkdirSync('test-output', { recursive: true });
writeFileSync('test-output/upload-comparison.json', JSON.stringify({ when: new Date().toISOString(), fileBytes: pdf.length, results, control }, null, 2));
