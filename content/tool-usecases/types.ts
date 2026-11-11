import type { Locale } from '@/lib/i18n';

/** One sentence in every language of the site. */
export type Lx = Record<Locale, string>;

/**
 * What a tool is good for and what to know before using it — shown under the tool, in the page's
 * language. Every sentence describes what the tool's code really does (tests/tool-usecases.mts
 * checks the facts). `{t:key}` is replaced by that translation (a tool or option name, so the text
 * names it exactly as the page does); `{ocr_languages}` by the number of OCR languages.
 */
export interface ToolUseCases {
  uses: Lx[];
  notes: Lx[];
}
