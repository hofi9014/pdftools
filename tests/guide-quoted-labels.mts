// Quoted labels in guides are the real labels of the tool they describe (2026-11-11).
//
// Guides tell people what to click: „Konwertuj”, “Protect PDF”, 「PDFを保護」. Several of them
// quoted wordings the page never shows (pdf-to-word said „Konwertuj” where the button reads
// „Konwertuj do formatu Word”, the protect guide quoted „Protéger le PDF” / 「PDFを保護」, the
// Word to PDF guide named three tabs while the page has four). A quote in a step must be a label
// the related tool's page (or a component it renders) actually prints in that language, a literal
// label written in the page itself (the Word / Excel tabs), or a tool name from the menu. Quotes
// with digits — ranges to type, amounts to expect — are not labels.
import { readFileSync, existsSync } from 'node:fs';
const { default: guides } = await import('../content/guides/index.ts');
const { all } = await import('../lib/translations/all.ts');
const { tools } = await import('../lib/tools.ts');

let fails = 0;
const check = (ok: boolean, msg: string) => { if (!ok) { console.log(`FAIL: ${msg}`); fails++; } };

const QUOTE = /[„“”«»"「『]\s?([^„“”«»"」』]{2,60}?)\s?[“”»"」』]/g;
const norm = (s: string) => s.trim().replace(/[’']/g, "'");
const KEY = /t\(\s*[`'"]([a-zA-Z0-9_.]+)(?:\$\{[^}]*\}[a-zA-Z0-9_.]*)?[`'"]/g;
const TEMPLATE = /t\(\s*`([a-zA-Z0-9_.]*)\$\{/g;

/** Translation keys a page file and the components it imports print. */
function pageKeys(route: string): { exact: Set<string>; prefixes: string[]; literals: Set<string> } {
  const exact = new Set<string>(); const prefixes: string[] = []; const literals = new Set<string>();
  const files = [`app/(unprefixed)/${route}/page.tsx`];
  const src0 = readFileSync(files[0]!, 'utf8');
  for (const m of src0.matchAll(/from '@\/components\/([A-Za-z/]+)'/g)) {
    const f = `components/${m[1]}.tsx`; if (existsSync(f)) files.push(f);
  }
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/label: '([^']+)'/g)) literals.add(m[1]!);
    for (const m of src.matchAll(KEY)) exact.add(m[1]!);
    for (const m of src.matchAll(TEMPLATE)) if (m[1]) prefixes.push(m[1]);
  }
  return { exact, prefixes, literals };
}

let quotes = 0;
for (const g of guides) {
  const tool = tools.find((x) => x.key === g.relatedTool);
  check(!!tool, `${g.slug}: related tool ${g.relatedTool} exists`);
  if (!tool) continue;
  const { exact, prefixes, literals } = pageKeys(tool.slug);
  check(exact.size > 5, `${g.slug}: read the keys of /${tool.slug}`);
  // Step titles and texts, paragraphs, list items and FAQ answers. Section headings and FAQ
  // questions are left out: there a quote is often just a phrase people search for.
  const texts: Record<string, string>[] = [];
  for (const b of g.body) {
    if (b.type === 'step') texts.push(b.title, b.text);
    if (b.type === 'paragraph') texts.push(b.text);
    if (b.type === 'list') texts.push(...b.items);
  }
  for (const f of g.faq) texts.push(f.a);
  for (const t of texts) {
    for (const [l, txt] of Object.entries(t)) {
      const dict = all[l]!;
      const allowed = new Set<string>([...literals].map(norm));
      for (const [k, v] of Object.entries(dict)) {
        if (typeof v !== 'string') continue;
        if (k.startsWith('tool.') || exact.has(k) || prefixes.some((p) => k.startsWith(p))) allowed.add(norm(v));
      }
      for (const m of txt.matchAll(QUOTE)) {
        const q = m[1]!;
        if (/\d/.test(q)) continue; // page numbers, ranges, amounts: what to type or expect, not a label
        quotes++;
        check(allowed.has(norm(q)), `${g.slug} [${l}]: „${q}” is not a label on /${tool.slug}`);
      }
    }
  }
}
check(quotes > 150, `quoted labels found in guides (${quotes})`);

// The Word to PDF guide names as many tabs as the page has.
const w2p = readFileSync('app/(unprefixed)/word-to-pdf/page.tsx', 'utf8');
const tabs = [...w2p.matchAll(/\{ id: '([a-z]+)', badge:/g)].map((m) => m[1]);
check(tabs.length === 4 && tabs.includes('powerpoint'), `word-to-pdf has the four tabs (${tabs.join(',')})`);
const g = guides.find((x) => x.slug === 'how-to-convert-word-to-pdf')!;
const tabStep = g.body.find((b) => b.type === 'step' && /DOCX/.test((b.text as Record<string, string>).en ?? ''));
for (const [l, txt] of Object.entries((tabStep as { text: Record<string, string> }).text)) {
  check(/PowerPoint \(PPTX\)|PowerPoint（PPTX）/.test(txt), `word-to-pdf guide [${l}]: names the PowerPoint tab`);
}

console.log(fails === 0 ? `\nALL PASS (${quotes} quoted labels)` : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
