import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const canvasMod = await import('@napi-rs/canvas');
(globalThis as Record<string, unknown>).DOMMatrix = canvasMod.DOMMatrix;
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
import { pdfToWordIR } from '../lib/client-pdf';
for (const f of ['Plik_D.pdf','allegro-raport.pdf','gpw-ebook.pdf','epz-report-variant2.pdf','epz_pptx_table_fixture.pdf','test_e.pdf']) {
  const file = Object.assign(new Blob([readFileSync(join(ROOT,'test-real-pdfs',f))]),{name:f}) as unknown as File;
  try { const b = await pdfToWordIR(file); writeFileSync(join(ROOT,'test-output','word-eval',f.replace('.pdf','.docx')), Buffer.from(await b.arrayBuffer())); console.log('ok',f); }
  catch(e){ console.log('FAIL',f,(e as Error).message.slice(0,150)); }
}
