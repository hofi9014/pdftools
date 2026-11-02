// The three AI tools as a visitor sees them: real pages, real PDF text extraction, and only the
// call to /api/ai answered here, so nothing reaches the AI service and no daily quota is used.
// The route and the client are covered by tests/ai-language-and-partial.mts; this covers what
// those cannot: that the pages send the page's language, say when a result covers part of the
// document, translate the limit message, and stay legible in both themes (axe on the page WITH
// a result, which e2e/a11y-axe.mts never reaches: it only looks at a freshly loaded page).
//
// Run: E2E_BASE_URL=http://localhost:3000 npx tsx e2e/ai-tools.mts
import { chromium, type BrowserContext, type Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { t } from '../lib/i18n';
import { DAILY_LIMIT, MAX_CHAT_TEXT_LENGTH } from '../lib/ai-limit';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const axeSource = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
const shortPdf = readFileSync(join(ROOT, 'test-real-pdfs', 'chrome-report.pdf'));
const longPdf = readFileSync(join(ROOT, 'test-real-pdfs', 'allegro-raport.pdf'));

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

const browser = await chromium.launch({ headless: true });

type Sent = { task?: string; language?: string; text?: string; question?: string };
type Reply = { status: number; body: string; contentType?: string };
const json = (status: number, body: unknown): Reply => ({ status, body: JSON.stringify(body) });

async function open(path: string, reply: () => Reply, theme: 'light' | 'dark' = 'light', width = 1280): Promise<{ ctx: BrowserContext; page: Page; sent: Sent[] }> {
  const ctx = await browser.newContext({ colorScheme: theme, serviceWorkers: 'block', viewport: { width, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* */ } });
  const page = await ctx.newPage();
  const sent: Sent[] = [];
  await page.route('**/api/ai', async (route) => {
    sent.push(route.request().postDataJSON() as Sent);
    const r = reply();
    await route.fulfill({ status: r.status, contentType: r.contentType ?? 'application/json', body: r.body });
  });
  await page.goto(`${BASE}/${path}`, { waitUntil: 'networkidle' });
  return { ctx, page, sent };
}

const upload = (page: Page, selector: string, buffer: Buffer) => page.setInputFiles(selector, { name: 'dokument.pdf', mimeType: 'application/pdf', buffer });

async function axeViolations(page: Page): Promise<string> {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () => (window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run({ runOnly: ['color-contrast', 'button-name', 'label', 'heading-order'] }));
  return res.violations.map((v) => `${v.id}×${v.nodes.length} (${v.nodes[0]?.target.join(' ').slice(0, 50)})`).join(', ');
}

console.log('=== summary: language of the page, partial note, copy ===');
for (const theme of ['light', 'dark'] as const) {
  const { ctx, page, sent } = await open('de/ai-summary', () => json(200, { content: '- Erster Punkt\n- Zweiter Punkt', partial: true }), theme);
  const notice = t('ai.notice_free', 'de', { limit: String(DAILY_LIMIT) });
  check(await page.getByText(notice).isVisible(), `${theme}: the free/limit notice is visible before anything is sent`);
  const noticeBox = await page.getByText(notice).boundingBox();
  const button = page.locator('form button[type=submit]');
  const buttonBox = await button.boundingBox();
  check(!!noticeBox && !!buttonBox && noticeBox.y < buttonBox.y && buttonBox.y - noticeBox.y < 200, `${theme}: the notice stands right above the button`);
  await upload(page, '#file-input', shortPdf);
  await button.click();
  await page.getByText('Erster Punkt').waitFor({ timeout: 60000 });
  check(sent.length === 1 && sent[0]?.task === 'summary' && sent[0]?.language === 'de', `${theme}: the request asks for the page's language (${sent[0]?.language})`);
  check((sent[0]?.text ?? '').length > 100, `${theme}: the text extracted from the PDF is what gets sent`);
  check(await page.getByText(t('ai.partial_result', 'de')).isVisible(), `${theme}: "covers only part of the document" is shown`);
  const axe = await axeViolations(page);
  check(!axe, `${theme}: axe on the page with a result: ${axe || 'clean'}`);
  if (theme === 'light') {
    await page.getByRole('button', { name: t('page.aisummary.copy_btn', 'de') }).click();
    check((await page.evaluate(() => navigator.clipboard.readText())).includes('Zweiter Punkt'), 'the copy button copies the summary');
  }
  await ctx.close();
}
{
  const { ctx, page } = await open('de/ai-summary', () => json(200, { content: 'Ganzes Dokument', partial: false }));
  await upload(page, '#file-input', shortPdf);
  await page.locator('form button[type=submit]').click();
  await page.getByText('Ganzes Dokument').waitFor({ timeout: 60000 });
  check(!(await page.getByText(t('ai.partial_result', 'de')).isVisible()), 'a complete result has no partial note');
  await ctx.close();
}

console.log('\n=== errors the visitor can read ===');
{
  const { ctx, page } = await open('de/ai-summary', () => json(429, { error: 'Przekroczono dzienny limit', code: 'ai_daily_limit', params: { hours: 7, limit: DAILY_LIMIT } }));
  await upload(page, '#file-input', shortPdf);
  await page.locator('form button[type=submit]').click();
  const expected = t('api.err.ai_daily_limit', 'de', { hours: 7, limit: DAILY_LIMIT });
  await page.getByText(expected).waitFor({ timeout: 60000 });
  check(expected.includes(String(DAILY_LIMIT)) && !expected.includes('{'), `the daily limit message is in German with the numbers: "${expected}"`);
  check(!(await page.getByText('Przekroczono').isVisible()), 'the server\'s Polish text is not shown');
  await ctx.close();
}
{
  const { ctx, page } = await open('pl/ai-summary', () => ({ status: 504, contentType: 'text/html', body: '<html><body>504 Gateway Timeout</body></html>' }));
  await upload(page, '#file-input', shortPdf);
  await page.locator('form button[type=submit]').click();
  const err = page.locator('form p.text-red-500');
  await err.waitFor({ timeout: 60000 });
  const text = (await err.textContent()) ?? '';
  check(!/Unexpected token|JSON/.test(text) && text.length > 5, `a gateway's HTML page gives a readable message: "${text}"`);
  await ctx.close();
}

console.log('\n=== translate ===');
for (const theme of ['light', 'dark'] as const) {
  const { ctx, page, sent } = await open('pl/ai-translate', () => json(200, { content: 'Der übersetzte Text', partial: true }), theme);
  await upload(page, '#fileInput', shortPdf);
  await page.locator('select').selectOption('niemiecki');
  await page.getByRole('button', { name: t('page.translate.btn', 'pl') }).click();
  await page.getByText('Der übersetzte Text').waitFor({ timeout: 60000 });
  check(sent[0]?.task === 'translate' && sent[0]?.language === 'niemiecki', `${theme}: the chosen language is sent (${sent[0]?.language})`);
  check(await page.getByText(t('ai.partial_result', 'pl')).isVisible(), `${theme}: the partial note is shown next to the translation`);
  const axe = await axeViolations(page);
  check(!axe, `${theme}: axe on the page with a result: ${axe || 'clean'}`);
  check(await page.getByText(t('ai.notice_free', 'pl', { limit: String(DAILY_LIMIT) })).isVisible(), `${theme}: the limit notice is there`);
  await ctx.close();
}

console.log('\n=== chat ===');
for (const theme of ['light', 'dark'] as const) {
  const { ctx, page, sent } = await open('pl/ai-chat', () => json(200, { content: 'Odpowiedź modelu' }), theme);
  await upload(page, '#fileInput', longPdf);
  await page.getByRole('button', { name: t('page.aichat.extract_btn', 'pl') }).click();
  const input = page.getByPlaceholder(t('page.aichat.ask_placeholder', 'pl'));
  await input.waitFor({ timeout: 60000 });
  const fmt = new Intl.NumberFormat('pl').format(MAX_CHAT_TEXT_LENGTH);
  const note = page.getByText(fmt, { exact: false }).first();
  check(await note.isVisible(), `${theme}: a long document says how much of it the AI reads ("${(await note.textContent())?.trim()}")`);
  await input.fill('O czym jest ten raport?');
  await input.press('Enter');
  await page.getByText('Odpowiedź modelu').waitFor({ timeout: 30000 });
  check(sent[0]?.task === 'chat' && sent[0]?.question === 'O czym jest ten raport?', `${theme}: the question is sent`);
  check((sent[0]?.text ?? '').length <= MAX_CHAT_TEXT_LENGTH, `${theme}: the text stays within the server's limit (${sent[0]?.text?.length})`);
  const axe = await axeViolations(page);
  check(!axe, `${theme}: axe on the page with a conversation: ${axe || 'clean'}`);
  await ctx.close();
}
{
  const { ctx, page } = await open('pl/ai-chat', () => json(200, { content: 'x' }));
  await upload(page, '#fileInput', shortPdf);
  await page.getByRole('button', { name: t('page.aichat.extract_btn', 'pl') }).click();
  await page.getByPlaceholder(t('page.aichat.ask_placeholder', 'pl')).waitFor({ timeout: 60000 });
  check(!(await page.getByText(new Intl.NumberFormat('pl').format(MAX_CHAT_TEXT_LENGTH), { exact: false }).first().isVisible().catch(() => false)), 'a short document has no "reads the first N characters" note');
  await ctx.close();
}

console.log('\n=== right to left, phone width, with a result on screen ===');
{
  const { ctx, page, sent } = await open('ar/ai-summary', () => json(200, { content: 'ملخص المستند', partial: true }), 'light', 375);
  await upload(page, '#file-input', shortPdf);
  await page.locator('form button[type=submit]').click();
  await page.getByText('ملخص المستند').waitFor({ timeout: 60000 });
  check(sent[0]?.language === 'ar', 'the request asks for Arabic');
  check(await page.getByText(t('ai.partial_result', 'ar')).isVisible(), 'the partial note is in Arabic');
  const m = await page.evaluate(() => ({ dir: document.documentElement.dir, width: document.documentElement.scrollWidth }));
  check(m.dir === 'rtl' && m.width <= 375, `dir=${m.dir}, the page is ${m.width} px wide at 375`);
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
