// The guides hub segment of each language (/guides/{segment}). No imports, so next.config.ts can
// read it for its redirects; lib/guides-slugs.ts is the typed entry point for everything else.

export const GUIDES_HUB_SEGMENTS = {
  pl: 'przewodnik', en: 'guides', de: 'anleitungen',
  es: 'guias', fr: 'guides-fr', it: 'guide', pt: 'guias-pt',
  sv: 'guider', no: 'guider-no', is: 'handbaekur', id: 'panduan',
  tr: 'rehber', ar: 'دليل', fa: 'راهنما',
  hi: 'गाइड', ja: 'ガイド', zh: '指南',
} as const;
