// "When this tool helps" and "Good to know" under the most searched tools (from the Search Console
// queries, 2026-11-10). A server module: the page renders only its own language and nothing here is
// sent to the browser as data.
import { t, type Locale } from '@/lib/i18n';
import ocrLanguages from '@/lib/ocr-languages.json';
import type { ToolUseCases } from './types';
import { reorder, split, extract, del, rotate, crop } from './pages';
import { ocr, flatten, openoffice, pdf2openoffice, svg, epub } from './convert';

export type { ToolUseCases, Lx } from './types';

/** Keyed by the tool key of lib/tools.ts. */
export const toolUseCases: Record<string, ToolUseCases> = {
  reorder, split, extract, delete: del, rotate, crop, ocr, flatten, openoffice, pdf2openoffice, svg, epub,
};

/** `{t:key}` → that translation, `{ocr_languages}` → the number of OCR languages. */
export function resolveUseCaseText(text: string, locale: Locale): string {
  return text
    .replace(/\{t:([\w.]+)\}/g, (_, key: string) => t(key, locale))
    .replace(/\{ocr_languages\}/g, String(ocrLanguages.length));
}

/** The tool's sentences in one language, ready to show; undefined for a tool without them. */
export function toolUseCasesFor(toolKey: string, locale: Locale): { uses: string[]; notes: string[] } | undefined {
  const c = toolUseCases[toolKey];
  if (!c) return undefined;
  return {
    uses: c.uses.map((s) => resolveUseCaseText(s[locale], locale)),
    notes: c.notes.map((s) => resolveUseCaseText(s[locale], locale)),
  };
}
