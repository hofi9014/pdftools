// End-to-end through the real /verify-pdf-signature page (plan 2.9, 2026-11-28). The signed files
// were made by pyhanko (scripts/build-signature-fixtures.py); the page must reach the same
// verdicts in the browser (Web Crypto there, not Node's): a valid signature with its chain and
// timestamp, a document changed after signing (and the download of the version that was signed),
// a signature broken on purpose, two signatures, a file without signatures, no request carrying
// the file, the English page, axe (WCAG 2.2 AA) in both themes and the phone width.
// Run: npm run test:e2e-verify-pdf-signature (needs a running server, E2E_BASE_URL).
import { chromium, type Page, type Request } from 'playwright';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const { t } = await import('../lib/i18n.ts');
const { verifyPdfSignatures } = await import('../lib/pdf/verifySignatures.ts');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const fixture = (n: string) => readFileSync(join(ROOT, 'test-fixtures/signatures', n));

const chain = fixture('rsa-chain-timestamp.pdf');
const changed = fixture('changed-after-signing.pdf');
const two = fixture('two-signatures.pdf');
const tampered = Buffer.from(chain);
tampered[tampered.indexOf('Umowa testowa nr 17') + 3] ^= 0x01;
const plainDoc = await PDFDocument.create();
plainDoc.addPage([595, 842]).drawText('Bez podpisu', { x: 50, y: 760, size: 14, font: await plainDoc.embedFont(StandardFonts.Helvetica) });
const unsigned = Buffer.from(await plainDoc.save());

const browser = await chromium.launch();
async function open(locale: string, theme: 'light' | 'dark' = 'light', width = 1280): Promise<{ page: Page; sent: Request[] }> {
  const ctx = await browser.newContext({ locale: locale === 'pl' ? 'pl-PL' : 'en-US', colorScheme: theme, serviceWorkers: 'block', acceptDownloads: true, viewport: { width, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${locale}/verify-pdf-signature`, { waitUntil: 'networkidle' });
  if (theme === 'dark') await p.evaluate(() => document.documentElement.classList.add('dark'));
  const sent: Request[] = [];
  p.on('request', (r) => sent.push(r));
  return { page: p, sent };
}
async function verify(p: Page, name: string, buffer: Buffer) {
  await p.setInputFiles('#fileInput', { name, mimeType: 'application/pdf', buffer });
  await p.locator('[data-testid="verify-summary"]').waitFor({ timeout: 30_000 });
  return p.evaluate(() => Array.from(document.querySelectorAll('[data-testid="verify-signature"]')).map((li) => ({
    status: li.querySelector('[data-testid="verify-status"]')?.getAttribute('data-status') ?? '',
    text: (li as HTMLElement).innerText,
    chain: Array.from(li.querySelectorAll('[data-testid="verify-chain"] li')).map((x) => (x as HTMLElement).innerText),
  })));
}

try {
  console.log('=== /pl/verify-pdf-signature ===');
  {
    const { page: p, sent } = await open('pl');
    check((await p.locator('h1').innerText()).trim() === t('tool.verifysig', 'pl'), 'the page has the tool name as its heading');
    check((await p.locator('[data-testid="verify-limits"]').innerText()).includes(t('page.verify.limits_2', 'pl').slice(0, 40)), 'the limits are on the page before any file is added');

    const s1 = await verify(p, 'umowa.pdf', chain);
    const summary = (await p.locator('[data-testid="verify-summary"]').innerText()).trim();
    check(summary === t('page.verify.summary', 'pl', { n: 1, valid: 1, invalid: 0, unknown: 0 }), `summary: ${summary}`);
    check(s1[0]?.status === 'valid' && s1[0].text.includes('Jan Testowy (rsa)') && s1[0].text.includes('Firma Testowa Sp. z o.o.'), 'valid, with the signer and organisation');
    check(s1[0]!.text.includes('OptimaPDF Test TSA') && s1[0]!.text.includes(t('page.verify.timestamp', 'pl')), 'the timestamp and its authority are shown');
    check(s1[0]!.text.includes('Akceptuję treść umowy') && s1[0]!.text.includes('Warszawa'), 'reason and location are shown');
    check(s1[0]!.text.includes(t('page.verify.covers_all', 'pl')), '"covers the whole file"');
    check(s1[0]!.chain.length === 3 && s1[0]!.chain[2]!.includes('OptimaPDF Test Root CA') && !s1[0]!.chain.some((c) => c.includes('—')), 'the chain of three certificates, no broken link');

    const s2 = await verify(p, 'zmieniona.pdf', changed);
    check(s2[0]?.status === 'valid' && s2[0].text.includes(t('page.verify.changed_after', 'pl').slice(0, 30)), 'changed after signing: valid with the "saved again" note');
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('main button', { hasText: t('page.verify.download_signed', 'pl') }).click()]);
    const signedVersion = readFileSync(await download.path());
    const expected = (await verifyPdfSignatures(new Uint8Array(changed))).signatures[0]!.signedLength;
    check(download.suggestedFilename() === `zmieniona${t('file.signed_version_suffix', 'pl')}.pdf`, `the signed version is named ${download.suggestedFilename()}`);
    check(signedVersion.length === expected && changed.subarray(0, expected).equals(signedVersion), `the download is exactly the signed version (${signedVersion.length} B)`);
    const again = (await verifyPdfSignatures(new Uint8Array(signedVersion))).signatures[0]!;
    check(again.status === 'valid' && again.coversWholeFile, 'the downloaded version is covered whole by the signature');

    const s3 = await verify(p, 'zepsuta.pdf', tampered);
    check(s3[0]?.status === 'invalid' && s3[0].text.includes(t('page.verify.problem_digest', 'pl')), 'one changed letter → invalid, "the signed part was changed"');

    const s4 = await verify(p, 'dwa.pdf', two);
    check(s4.length === 2 && s4.every((s) => s.status === 'valid') && s4[0]!.text.includes('Podpis1') && s4[1]!.text.includes('Podpis2'), 'two signatures, both valid, in signing order');

    // Web Crypto in the browser is not Node's: every algorithm the verifier supports, checked here.
    for (const f of ['rsa-pss.pdf', 'ecdsa-p256.pdf', 'ecdsa-p384-sha384.pdf', 'ed25519.pdf', 'doc-timestamp.pdf', 'certified.pdf']) {
      const s = await verify(p, f, fixture(f));
      check(s.length === 1 && s[0]!.status === 'valid', `${f}: valid in the browser (${s[0]?.status})`);
    }

    await verify(p, 'bez.pdf', unsigned);
    check((await p.locator('[data-testid="verify-summary"]').innerText()).trim() === t('page.verify.none', 'pl'), 'no signatures: the message');
    check((await p.locator('main').innerText()).includes(t('page.verify.none_hint', 'pl').slice(0, 40)), 'and why a drawn signature is not one');

    const uploads = sent.filter((r) => (r.method() !== 'GET' && r.method() !== 'HEAD') || (r.postDataBuffer()?.length ?? 0) > 0);
    check(uploads.length === 0, `no request carries a file (${sent.length} requests, all GET/HEAD without a body)`);
    await p.context().close();
  }

  console.log('\n=== signed twice on /pl/sign-pdf with a certificate, then checked here ===');
  {
    const forge = (await import('node-forge')).default;
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey; cert.serialNumber = '00c3a1f0';
    cert.validity.notBefore = new Date(Date.now() - 86_400_000); cert.validity.notAfter = new Date(Date.now() + 365 * 86_400_000);
    const nm = [{ name: 'commonName', value: 'Łucja Testowa', valueTagClass: forge.asn1.Type.UTF8 as unknown as number }];
    cert.setSubject(nm); cert.setIssuer(nm); cert.sign(keys.privateKey, forge.md.sha256.create());
    const p12 = Buffer.from(forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'tajne', { algorithm: 'aes256' })).getBytes(), 'binary');
    const signOnce = async (pdf: Buffer) => {
      const ctx = await browser.newContext({ locale: 'pl-PL', serviceWorkers: 'block', acceptDownloads: true });
      await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
      const p = await ctx.newPage();
      await p.goto(`${BASE}/pl/sign-pdf`, { waitUntil: 'networkidle' });
      await p.locator('main button', { hasText: t('page.sign.mode_digital', 'pl') }).click();
      await p.setInputFiles('#pades-file-input', { name: 'umowa.pdf', mimeType: 'application/pdf', buffer: pdf });
      await p.setInputFiles('#pades-cert-input', { name: 'cert.p12', mimeType: 'application/x-pkcs12', buffer: p12 });
      await p.fill('#pades-password', 'tajne');
      const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60_000 }), p.locator('main button[type="submit"]', { hasText: t('page.sign.pades_btn', 'pl') }).click()]);
      const out = readFileSync(await d.path());
      await ctx.close();
      return out;
    };
    const once = await signOnce(unsigned);
    const twice = await signOnce(once);
    check(twice.subarray(0, once.length).equals(once), 'the second signature only appends to the file');
    const { page: p } = await open('pl');
    const s = await verify(p, 'umowa-2x.pdf', twice);
    check(s.length === 2 && s.every((x) => x.status === 'valid'), `both signatures made on the site are valid (${s.map((x) => x.status).join(', ')})`);
    check(s.every((x) => x.text.includes('Łucja Testowa')), 'the signer with a Polish letter is shown');
    check(s.every((x) => x.text.includes(t('page.verify.self_signed', 'pl').slice(0, 30))), 'the self-issued certificate is pointed out');
    await p.context().close();
  }

  console.log('\n=== the English page ===');
  {
    const { page: p } = await open('en');
    check((await p.locator('h1').innerText()).trim() === 'Verify PDF Signature', 'English heading');
    const s = await verify(p, 'contract.pdf', chain);
    check(s[0]?.text.includes('Signature intact') && s[0].text.includes('Certificate issuer'), 'English status and labels');
    await p.context().close();
  }

  console.log('\n=== legible in both themes (axe), with results on screen ===');
  const axeSource = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  for (const theme of ['light', 'dark'] as const) {
    const { page: p } = await open('pl', theme);
    await verify(p, 'zmieniona.pdf', changed);
    await p.waitForFunction(() => document.getAnimations().every((x) => x.playState !== 'running' || x.effect?.getTiming().iterations === Infinity), undefined, { timeout: 10000 });
    await p.addScriptTag({ content: axeSource });
    const res = await p.evaluate(async () => (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } })
      .axe.run('main', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    const v = res.violations.map((x) => `${x.id}×${x.nodes.length} (${x.nodes[0]?.target.join(' ').slice(0, 50)})`).join(', ');
    check(!v, `${theme}: axe (WCAG 2.2 AA): ${v || 'clean'}`);
    await p.context().close();
  }

  console.log('\n=== phone width (375 px) ===');
  {
    const { page: p } = await open('pl', 'light', 375);
    await verify(p, 'umowa.pdf', chain);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth);
    check(wide <= 375, `no sideways scroll with a result on screen (${wide} px)`);
    await p.context().close();
  }
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
