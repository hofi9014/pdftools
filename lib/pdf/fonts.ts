export interface FontFamilyOption {
  label: string
  family: string
  weights: { weight: number; italic: boolean; url: string }[]
}

const GF_BASE = 'https://fonts.gstatic.com';

const FONT_VERSIONS: Record<string, { family: string; url: (w: number, i: boolean) => string }> = {
  'Arial': {
    family: 'arimo',
    url: (w, i) => `${GF_BASE}/s/arimo/v36/P5sMzZCDf9_T_10ZxCE.woff2`,
  },
  'Arimo': {
    family: 'arimo',
    url: (w, i) => `${GF_BASE}/s/arimo/v36/P5sMzZCDf9_T_10ZxCE.woff2`,
  },
  'Cousine': {
    family: 'cousine',
    url: (w, i) => i
      ? `${GF_BASE}/l/font?kit=d6lKkaiiRdih4SpP_SEvzAzqlpon5wcS&skey=411d53aa792d7323&v=v31`
      : w === 700
        ? `${GF_BASE}/s/cousine/v31/d6lNkaiiRdih4SpP9Z8K2TnM0g.woff2`
        : `${GF_BASE}/s/cousine/v31/d6lIkaiiRdih4SpP_SQvzA.woff2`,
  },
  'Georgia': {
    family: 'georgia',
    url: (w, i) => i
      ? `${GF_BASE}/l/font?kit=-zkn91Ksy8U47Wnsfmy8wVPR4P25N4kH&skey=8c06b1b3ed97d173&v=v18`
      : w === 700
        ? `${GF_BASE}/l/font?kit=-zkg91Ksy8U47WnsdtKZ1Gb3pA&skey=bbb745e2fcd7331c&v=v18`
        : `${GF_BASE}/l/font?kit=-zkl91Ksy8U47Wnsfmm8wQ&skey=ca45512e77838097&v=v18`,
  },
  'Lato': {
    family: 'lato',
    url: (w, i) => i
      ? `${GF_BASE}/s/lato/v25/S6u8w4BMUTPHjxsAXC-q.woff2`
      : w === 700
        ? `${GF_BASE}/s/lato/v25/S6u9w4BMUTPHh6UVSwiPGQ.woff2`
        : `${GF_BASE}/s/lato/v25/S6uyw4BMUTPHjx4wXg.woff2`,
  },
  'Noto Sans': {
    family: 'notosans',
    // Regular and bold used to point at the SAME v42 file. Google's css2 endpoint returns a
    // single shared variable-font blob when 400+700 are requested together (its un-instanced
    // default renders as regular for both) — the genuinely distinct per-weight static
    // instances only come back when each weight is queried in isolation. Verified with
    // fontkit: NotoSans-Regular vs NotoSans-Bold, "AVWMil" advance width 3552 vs 3809 units.
    url: (w, i) => i
      ? `${GF_BASE}/s/notosans/v42/o-0ZIpQlx3QUlC5A4PNr4C5OaxRsfNNlKbCePevtuXOm.woff2`
      : w === 700
        ? `${GF_BASE}/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBO9a6VI.woff2`
        : `${GF_BASE}/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9a6VI.woff2`,
  },
  'Open Sans': {
    family: 'opensans',
    // Same shared-variable-blob issue as Noto Sans (regular and bold were identical), plus
    // the old v40 URLs had aged out entirely (all three returned 404 — Google is now on v44).
    // Refetched all three isolated by weight/style. Verified with fontkit: OpenSans-Regular vs
    // OpenSans-Bold, "AVWMil" advance width 7283 vs 7905 units.
    url: (w, i) => i
      ? `${GF_BASE}/s/opensans/v44/memQYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWq8tWZ0Pw86hd0Rk8ZkWVAewA.woff2`
      : w === 700
        ? `${GF_BASE}/s/opensans/v44/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1x4gaVI.woff2`
        : `${GF_BASE}/s/opensans/v44/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.woff2`,
  },
  'PT Sans': {
    family: 'ptsans',
    url: (w, i) => i
      ? `${GF_BASE}/s/ptsans/v17/jizYRExUiTo99u79D0eE0CQ0Z_8.woff2`
      : w === 700
        ? `${GF_BASE}/s/ptsans/v17/jizfRExUiTo99u79B_mh0O6tLR8a8zI.woff2`
        : `${GF_BASE}/s/ptsans/v17/jizaRExUiTo99u79D0KEwOhKEl8.woff2`,
  },
  'Roboto': {
    family: 'roboto',
    url: (w, i) => i
      ? `${GF_BASE}/s/roboto/v32/KFOkCnqEu92Fr1Mu51xIIzIXKMny.woff2`
      : w === 700
        ? `${GF_BASE}/s/roboto/v32/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2`
        : `${GF_BASE}/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2`,
  },
  'Times New Roman': {
    family: 'tinos',
    url: (w, i) => i
      ? `${GF_BASE}/l/font?kit=buE2poGnedXvwjX-fmRb9mt9u7UoAQ&skey=bebefdc6a40fd4ff&v=v26`
      : w === 700
        ? `${GF_BASE}/s/tinos/v26/buE1poGnedXvwj1AW3Fu0C8.woff2`
        : `${GF_BASE}/s/tinos/v26/buE4poGnedXvwjX7fmQ.woff2`,
  },
  'Tinos': {
    family: 'tinos',
    url: (w, i) => i
      ? `${GF_BASE}/l/font?kit=buE2poGnedXvwjX-fmRb9mt9u7UoAQ&skey=bebefdc6a40fd4ff&v=v26`
      : w === 700
        ? `${GF_BASE}/s/tinos/v26/buE1poGnedXvwj1AW3Fu0C8.woff2`
        : `${GF_BASE}/s/tinos/v26/buE4poGnedXvwjX7fmQ.woff2`,
  },
  'Verdana': {
    family: 'verdana',
    url: (w, i) => i
      ? `${GF_BASE}/l/font?kit=dFa9ZfqA86A4lLhf7qFHfw8cuTbKPzIR&skey=48066a2ff839778c&v=v15`
      : w === 700
        ? `${GF_BASE}/l/font?kit=dFa6ZfqA86A4lLhf5h9iajo6_Q&skey=cd26fb9258467dcb&v=v15`
        : `${GF_BASE}/l/font?kit=dFa_ZfqA86A4lLhf7qRHfw&skey=28f652d19e80fbde&v=v15`,
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

export function loadGoogleFontsCSS(): void {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  const seen = new Set<string>();
  const families = Object.values(FONT_VERSIONS)
    .filter(cfg => { const k = cfg.family; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(cfg => cfg.family + ':wght@400;700&display=swap')
    .join('&family=');
  link.href = `https://fonts.googleapis.com/css2?family=${families}`;
  document.head.appendChild(link);
}
