export interface FontFamilyOption {
  label: string
  family: string
  weights: { weight: number; italic: boolean; url: string }[]
}

// Self-hosted under public/fonts/ — downloaded once from Google Fonts and served from our own
// domain from then on. Previously these were fetched live from fonts.gstatic.com on every
// edit-pdf session (and fonts.googleapis.com for the live preview, see loadGoogleFontsCSS
// below), which silently sent the visitor's IP to Google before they ever clicked anything.
// Self-hosting also fixes a real, separate bug this uncovered: two of the old hardcoded
// fonts.gstatic.com hashes (PT Sans regular/italic) had already rotted and returned 404 —
// exporting an edit-pdf document with that font would have thrown "Font fetch failed". A
// self-hosted copy can't rot from under us the way a hash-versioned CDN URL can.
const FONTS_BASE = '/fonts';

const FONT_VERSIONS: Record<string, { family: string; url: (w: number, i: boolean) => string }> = {
  'Arial': {
    family: 'arimo',
    url: () => `${FONTS_BASE}/arimo-regular.woff2`,
  },
  'Arimo': {
    family: 'arimo',
    url: () => `${FONTS_BASE}/arimo-regular.woff2`,
  },
  'Cousine': {
    family: 'cousine',
    url: (w, i) => i
      ? `${FONTS_BASE}/cousine-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/cousine-bold.woff2`
        : `${FONTS_BASE}/cousine-regular.woff2`,
  },
  'Georgia': {
    family: 'georgia',
    url: (w, i) => i
      ? `${FONTS_BASE}/georgia-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/georgia-bold.woff2`
        : `${FONTS_BASE}/georgia-regular.woff2`,
  },
  'Lato': {
    family: 'lato',
    url: (w, i) => i
      ? `${FONTS_BASE}/lato-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/lato-bold.woff2`
        : `${FONTS_BASE}/lato-regular.woff2`,
  },
  'Noto Sans': {
    family: 'notosans',
    // Regular and bold used to point at the SAME v42 file. Google's css2 endpoint returns a
    // single shared variable-font blob when 400+700 are requested together (its un-instanced
    // default renders as regular for both) — the genuinely distinct per-weight static
    // instances only come back when each weight is queried in isolation. Verified with
    // fontkit: NotoSans-Regular vs NotoSans-Bold, "AVWMil" advance width 3552 vs 3809 units.
    url: (w, i) => i
      ? `${FONTS_BASE}/notosans-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/notosans-bold.woff2`
        : `${FONTS_BASE}/notosans-regular.woff2`,
  },
  'Open Sans': {
    family: 'opensans',
    // Same shared-variable-blob issue as Noto Sans (regular and bold were identical), plus
    // the old v40 URLs had aged out entirely (all three returned 404 — Google is now on v44).
    // Refetched all three isolated by weight/style. Verified with fontkit: OpenSans-Regular vs
    // OpenSans-Bold, "AVWMil" advance width 7283 vs 7905 units.
    url: (w, i) => i
      ? `${FONTS_BASE}/opensans-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/opensans-bold.woff2`
        : `${FONTS_BASE}/opensans-regular.woff2`,
  },
  'PT Sans': {
    family: 'ptsans',
    url: (w, i) => i
      ? `${FONTS_BASE}/ptsans-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/ptsans-bold.woff2`
        : `${FONTS_BASE}/ptsans-regular.woff2`,
  },
  'Roboto': {
    family: 'roboto',
    url: (w, i) => i
      ? `${FONTS_BASE}/roboto-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/roboto-bold.woff2`
        : `${FONTS_BASE}/roboto-regular.woff2`,
  },
  'Times New Roman': {
    family: 'tinos',
    url: (w, i) => i
      ? `${FONTS_BASE}/tinos-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/tinos-bold.woff2`
        : `${FONTS_BASE}/tinos-regular.woff2`,
  },
  'Tinos': {
    family: 'tinos',
    url: (w, i) => i
      ? `${FONTS_BASE}/tinos-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/tinos-bold.woff2`
        : `${FONTS_BASE}/tinos-regular.woff2`,
  },
  'Verdana': {
    family: 'verdana',
    url: (w, i) => i
      ? `${FONTS_BASE}/verdana-italic.woff2`
      : w === 700
        ? `${FONTS_BASE}/verdana-bold.woff2`
        : `${FONTS_BASE}/verdana-regular.woff2`,
  },
};

export const FONT_OPTIONS = Object.keys(FONT_VERSIONS).map(family => ({
  label: family,
  family,
}));

export function getFontFamily(displayName: string): string {
  return FONT_VERSIONS[displayName]?.family || displayName;
}

const fontCache = new Map<string, ArrayBuffer>();

async function fetchWoff2(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status} for ${url}`);
  return res.arrayBuffer();
}

export async function getFontBytes(family: string, weight: number = 400, italic: boolean = false): Promise<ArrayBuffer> {
  const cfg = FONT_VERSIONS[family];
  if (!cfg) throw new Error(`Font ${family} not found`);

  const key = `${family}-${weight}-${italic}`;
  if (fontCache.has(key)) return fontCache.get(key)!.slice(0);

  const url = cfg.url(weight, italic);
  const bytes = await fetchWoff2(url);
  fontCache.set(key, bytes.slice(0));
  return bytes;
}

export async function embedFont(pdfDoc: any, family: string, weight: number = 400, italic: boolean = false): Promise<any> {
  const fontkit = await import('@pdf-lib/fontkit');
  pdfDoc.registerFontkit(fontkit.default || fontkit);
  const bytes = await getFontBytes(family, weight, italic);
  return pdfDoc.embedFont(bytes);
}

const FONTS_STYLE_ID = 'optimapdf-local-fonts';

// Previously fetched a CSS file from fonts.googleapis.com (which itself points at
// fonts.gstatic.com) — that meant every edit-pdf session contacted Google before the user did
// anything at all, just to render the live text-editing preview. This builds the equivalent
// @font-face rules locally from the same self-hosted files getFontBytes()/embedFont() use for
// the actual PDF export, so preview and export always agree and nothing leaves the browser.
export function loadGoogleFontsCSS(): void {
  if (document.getElementById(FONTS_STYLE_ID)) return;
  const seen = new Set<string>();
  const rules: string[] = [];
  for (const cfg of Object.values(FONT_VERSIONS)) {
    if (seen.has(cfg.family)) continue;
    seen.add(cfg.family);
    rules.push(`@font-face { font-family: '${cfg.family}'; font-weight: 400; font-style: normal; font-display: swap; src: url('${cfg.url(400, false)}') format('woff2'); }`);
    rules.push(`@font-face { font-family: '${cfg.family}'; font-weight: 700; font-style: normal; font-display: swap; src: url('${cfg.url(700, false)}') format('woff2'); }`);
    rules.push(`@font-face { font-family: '${cfg.family}'; font-weight: 400; font-style: italic; font-display: swap; src: url('${cfg.url(400, true)}') format('woff2'); }`);
  }
  const style = document.createElement('style');
  style.id = FONTS_STYLE_ID;
  style.textContent = rules.join('\n');
  document.head.appendChild(style);
}
