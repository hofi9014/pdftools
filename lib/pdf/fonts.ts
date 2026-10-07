// The fonts of the PDF editor: what the text-edit popup offers, what the live preview shows and
// what the export embeds — always the same file for all three.
//
// Self-hosted under public/fonts/ (nothing is fetched from Google at run time). The files are
// complete static TrueType fonts cut down to Latin with all its extensions, Greek, Cyrillic,
// punctuation and symbols by scripts/build-editor-fonts.py, which also names the sources.
//
// FINDING (2026-10-06) — until then these were the "latin" WOFF2 subsets Google Fonts' CSS
// endpoint serves first, and that was wrong three ways:
//   1. No Latin Extended at all: not one of the thirty files had "ą ć ę ł ń ś ź ż" (only "ó").
//      A Polish edit was exported with those letters replaced by the font's missing-glyph box.
//   2. pdf-lib embeds the bytes it is given, so the exported PDF carried a WOFF2 file where a
//      TrueType font program belongs. No PDF reader can use that ("Required loca table is not
//      found"); the edited text was shown in whatever substitute the reader picked.
//   3. Four "italic" files (Cousine, Georgia, Tinos, Verdana) were 8-glyph stubs, bold italic
//      did not exist, and the Georgia and Verdana files were Microsoft's own fonts, whose
//      licence text forbids redistribution. "Georgia" is now Gelasio (metric-compatible with
//      it, as Arimo is with Arial and Tinos with Times New Roman) and "Verdana" is DejaVu Sans
//      (the closest open design; about 1 % narrower, not metric-compatible).
// tests/editor-fonts.mts checks every file: Polish letters, real TrueType, distinct styles.

export type FontStyleKey = 'regular' | 'bold' | 'italic' | 'bolditalic';

const FONTS_BASE = '/fonts';

/** Display name -> CSS family used for the preview, and the file name stem in public/fonts/. */
const FONT_FILES: Record<string, { family: string; file: string }> = {
  'Arial': { family: 'arimo', file: 'arimo' },
  'Arimo': { family: 'arimo', file: 'arimo' },
  'Cousine': { family: 'cousine', file: 'cousine' },
  'Georgia': { family: 'gelasio', file: 'gelasio' },
  'Lato': { family: 'lato', file: 'lato' },
  'Noto Sans': { family: 'notosans', file: 'notosans' },
  'Open Sans': { family: 'opensans', file: 'opensans' },
  'PT Sans': { family: 'ptsans', file: 'ptsans' },
  'Roboto': { family: 'roboto', file: 'roboto' },
  'Times New Roman': { family: 'tinos', file: 'tinos' },
  'Tinos': { family: 'tinos', file: 'tinos' },
  'Verdana': { family: 'dejavusans', file: 'dejavusans' },
};

export const FONT_OPTIONS = Object.keys(FONT_FILES).map(family => ({
  label: family,
  family,
}));

export function getFontFamily(displayName: string): string {
  return FONT_FILES[displayName]?.family || displayName;
}

export function fontStyleKey(weight: number = 400, italic: boolean = false): FontStyleKey {
  return weight >= 600 ? (italic ? 'bolditalic' : 'bold') : italic ? 'italic' : 'regular';
}

/** The file of a family in one weight and style; null for a family the editor does not have. */
export function fontUrl(family: string, weight: number = 400, italic: boolean = false): string | null {
  const cfg = FONT_FILES[family];
  return cfg ? `${FONTS_BASE}/${cfg.file}-${fontStyleKey(weight, italic)}.ttf` : null;
}

const fontCache = new Map<string, ArrayBuffer>();

export async function getFontBytes(family: string, weight: number = 400, italic: boolean = false): Promise<ArrayBuffer> {
  const url = fontUrl(family, weight, italic);
  if (!url) throw new Error(`Font ${family} not found`);
  const cached = fontCache.get(url);
  if (cached) return cached.slice(0);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status} for ${url}`);
  const bytes = await res.arrayBuffer();
  fontCache.set(url, bytes.slice(0));
  return bytes;
}

interface GlyphLookup { hasGlyphForCodePoint(codePoint: number): boolean }
const parsedFonts = new Map<string, Promise<GlyphLookup>>();

/**
 * Whether the file of this family and style has a glyph for every character of the text (line
 * breaks and tabs aside). Rejects, like getFontBytes, when the file cannot be loaded.
 */
export async function fontHasText(family: string, weight: number, italic: boolean, text: string): Promise<boolean> {
  const url = fontUrl(family, weight, italic);
  if (!url) throw new Error(`Font ${family} not found`);
  let parsed = parsedFonts.get(url);
  if (!parsed) {
    parsed = (async () => {
      const mod = await import('@pdf-lib/fontkit');
      const kit = (mod.default || mod) as unknown as { create(bytes: Uint8Array): GlyphLookup };
      return kit.create(new Uint8Array(await getFontBytes(family, weight, italic)));
    })();
    parsedFonts.set(url, parsed);
    parsed.catch(() => parsedFonts.delete(url));
  }
  const font = await parsed;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp === 10 || cp === 13 || cp === 9) continue;
    if (!font.hasGlyphForCodePoint(cp)) return false;
  }
  return true;
}

// One embedded copy per document and file: ten edits in Arial used to embed the font ten times.
const embedded = new WeakMap<object, Map<string, Promise<unknown>>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function embedFont(pdfDoc: any, family: string, weight: number = 400, italic: boolean = false): Promise<any> {
  const url = fontUrl(family, weight, italic);
  if (!url) throw new Error(`Font ${family} not found`);
  let perDoc = embedded.get(pdfDoc);
  if (!perDoc) { perDoc = new Map(); embedded.set(pdfDoc, perDoc); }
  let font = perDoc.get(url);
  if (!font) {
    font = (async () => {
      const fontkit = await import('@pdf-lib/fontkit');
      pdfDoc.registerFontkit(fontkit.default || fontkit);
      return pdfDoc.embedFont(await getFontBytes(family, weight, italic));
    })();
    perDoc.set(url, font);
    // A failed load must not be remembered: the next edit may succeed (or take the fallback).
    font.catch(() => perDoc!.delete(url));
  }
  return font;
}

const FONTS_STYLE_ID = 'optimapdf-local-fonts';

// The @font-face rules of the live preview, built from the same self-hosted files the export
// embeds, so preview and export always agree and nothing leaves the browser. (The name is
// historical: this once fetched a stylesheet from fonts.googleapis.com.)
export function loadGoogleFontsCSS(): void {
  if (document.getElementById(FONTS_STYLE_ID)) return;
  const seen = new Set<string>();
  const rules: string[] = [];
  for (const cfg of Object.values(FONT_FILES)) {
    if (seen.has(cfg.family)) continue;
    seen.add(cfg.family);
    for (const [weight, italic] of [[400, false], [700, false], [400, true], [700, true]] as const) {
      rules.push(`@font-face { font-family: '${cfg.family}'; font-weight: ${weight}; font-style: ${italic ? 'italic' : 'normal'}; font-display: swap; src: url('${FONTS_BASE}/${cfg.file}-${fontStyleKey(weight, italic)}.ttf') format('truetype'); }`);
    }
  }
  const style = document.createElement('style');
  style.id = FONTS_STYLE_ID;
  style.textContent = rules.join('\n');
  document.head.appendChild(style);
}
