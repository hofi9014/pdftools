'use client';

// Drawn pictograms used in the tool icons next to PdfBadge (lib/icons.tsx). They replace emoji,
// which every operating system draws in its own style (and older ones not at all), so the same
// icon looked different on Windows, Android, iPhone and Mac. Approved by the owner on 2026-11-07
// from a side-by-side preview. Every instance gets its own gradient ids (like PdfBadge): a
// gradient defined inside a hidden copy (the closed mobile menu) would otherwise blank the
// visible ones that point at it.
import { useId } from 'react';

const GRADIENTS: Record<string, [string, string]> = {
  gGold: ['#FCD34D', '#F59E0B'],
  gSlate: ['#94A3B8', '#475569'],
  gBlue: ['#60A5FA', '#2563EB'],
  gGreen: ['#4ADE80', '#16A34A'],
  gViolet: ['#A78BFA', '#7C3AED'],
  gRed: ['#F87171', '#DC2626'],
  gPaper: ['#FFFFFF', '#E2E8F0'],
  gAmber: ['#FDBA74', '#EA580C'],
  gStone: ['#E7E5E4', '#A8A29E'],
  gBrown: ['#D6A77A', '#A16207'],
  gCloud: ['#F0F9FF', '#BAE6FD'],
};

const pencil = (s = 1, dx = 0, dy = 0, body = 'url(#gAmber)') =>
  `<g transform="translate(${dx} ${dy}) scale(${s}) rotate(45 12 12)"><rect x="9.5" y="2" width="5" height="15" rx="1" fill="${body}"/><rect x="9.5" y="2" width="5" height="3" rx="1" fill="#F472B6"/><rect x="9.5" y="4.6" width="5" height="1.3" fill="#94A3B8"/><path d="M9.5 17h5l-2.5 4.6z" fill="#FDE68A"/><path d="M11.2 19.7h1.6L12 21.6z" fill="#334155"/></g>`;
const lockBody = `<rect x="5" y="10.5" width="14" height="11" rx="2.6" fill="url(#gGold)"/><rect x="6" y="11.3" width="12" height="2" rx="1" fill="#fff" opacity=".35"/><circle cx="12" cy="15.4" r="1.6" fill="#92400E"/><rect x="11.3" y="15.6" width="1.4" height="3.2" rx=".7" fill="#92400E"/>`;
const page = `<path d="M6.5 2.5h8L19 7v13.2a1.3 1.3 0 0 1-1.3 1.3H6.5a1.3 1.3 0 0 1-1.3-1.3V3.8a1.3 1.3 0 0 1 1.3-1.3z" fill="url(#gPaper)" stroke="#94A3B8" stroke-width=".8"/><path d="M14.5 2.5V7H19" fill="#E2E8F0" stroke="#94A3B8" stroke-width=".8" stroke-linejoin="round"/>`;
const lines = (ys: number[], x2 = 16) =>
  ys.map((y, i) => `<path d="M8 ${y}h${(i === ys.length - 1 ? x2 - 3 : x2) - 8}" stroke="#94A3B8" stroke-width="1.3" stroke-linecap="round"/>`).join('');

const BODIES = {
  lock: `<path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="url(#gSlate)" stroke-width="2.4" stroke-linecap="round"/>${lockBody}`,
  unlock: `<path d="M8 11V7.6a4 4 0 0 1 7.7-1.6" fill="none" stroke="url(#gSlate)" stroke-width="2.4" stroke-linecap="round"/>${lockBody}`,
  compress: `<rect x="4" y="2.5" width="16" height="3.6" rx="1.3" fill="url(#gSlate)"/><rect x="4" y="17.9" width="16" height="3.6" rx="1.3" fill="url(#gSlate)"/><g fill="none" stroke="url(#gBlue)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.5v3.5M9.4 8.8 12 11.4l2.6-2.6"/><path d="M12 16.5V13M9.4 15.2 12 12.6l2.6 2.6"/></g>`,
  rotate: `<path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="url(#gBlue)" stroke-width="2.6" stroke-linecap="round"/><path d="M19.6 4.4V9h-4.6" fill="none" stroke="url(#gBlue)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  scissors: `<path d="M8.6 14.4 17.5 3.5M15.4 14.4 6.5 3.5" stroke="url(#gSlate)" stroke-width="2.3" stroke-linecap="round"/><circle cx="7" cy="17.5" r="3.1" fill="none" stroke="url(#gAmber)" stroke-width="2.3"/><circle cx="17" cy="17.5" r="3.1" fill="none" stroke="url(#gAmber)" stroke-width="2.3"/>`,
  pencil: pencil(),
  signature: `<path d="M2.5 19c1.6-2.8 3-3.2 3.8-1.4.8 1.8 1.6 1.9 3-.4 1.3-2.2 2.4-2 3.2.2" fill="none" stroke="url(#gBlue)" stroke-width="1.8" stroke-linecap="round"/>${pencil(0.72, 7, -1.5, 'url(#gSlate)')}`,
  drop: `<path d="M12 2.5C9 7 6 10.5 6 14.2a6 6 0 0 0 12 0C18 10.5 15 7 12 2.5z" fill="url(#gBlue)"/><path d="M9 14.6a3 3 0 0 0 2.6 3" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>`,
  numbers: `<rect x="2.5" y="4.5" width="19" height="15" rx="3.5" fill="url(#gBlue)"/><text x="12" y="15.6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9.5" font-weight="700" fill="#fff">123</text>`,
  trash: `<rect x="9.5" y="2.6" width="5" height="2.8" rx="1" fill="url(#gSlate)"/><rect x="4" y="5" width="16" height="2.7" rx="1.2" fill="url(#gSlate)"/><path d="M6 8.6h12l-1.1 11.6a1.8 1.8 0 0 1-1.8 1.6H8.9a1.8 1.8 0 0 1-1.8-1.6z" fill="url(#gSlate)"/><path d="M10 11.2v7.6M14 11.2v7.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>`,
  check: `<rect x="3" y="3" width="18" height="18" rx="5" fill="url(#gGreen)"/><path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  shuffle: `<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="url(#gViolet)"/><g fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h2.6c3.4 0 3.6 8 7 8H18M15.8 13.8 18 16l-2.2 2.2"/><path d="M6 16h2.6c1.3 0 2-1.1 2.7-2.5M13.4 10.4C14 9 14.6 8 15.8 8H18M15.8 5.8 18 8l-2.2 2.2"/></g>`,
  tag: `<path d="M3 4.4V11l9.5 9.6a1.6 1.6 0 0 0 2.3 0l5.8-5.8a1.6 1.6 0 0 0 0-2.3L11 3H4.4A1.4 1.4 0 0 0 3 4.4z" fill="url(#gGold)"/><circle cx="7.6" cy="7.6" r="1.8" fill="#fff"/><path d="M11.5 11.5l4 4" stroke="#92400E" stroke-width="1.3" stroke-linecap="round" opacity=".5"/>`,
  noEntry: `<circle cx="12" cy="12" r="8.4" fill="none" stroke="url(#gRed)" stroke-width="3"/><path d="M6.3 6.3l11.4 11.4" stroke="url(#gRed)" stroke-width="3" stroke-linecap="round"/>`,
  image: `<rect x="2.5" y="4" width="19" height="16" rx="2.6" fill="#DBEAFE" stroke="url(#gBlue)" stroke-width="1.6"/><circle cx="16" cy="9" r="2" fill="#FACC15"/><path d="M3.3 18l5.3-6 4 4.3 2.8-2.8 5.3 4.6v.4a1.6 1.6 0 0 1-1.6 1.5H4.9a1.6 1.6 0 0 1-1.6-1.6z" fill="url(#gGreen)"/>`,
  text: `${page}${lines([10, 13, 16, 19])}`,
  palette: `<path d="M12 3a9 9 0 0 0 0 18c1.4 0 2.1-1 1.6-2.2-.5-1.2.3-2.5 1.6-2.5H17a4 4 0 0 0 4-4C21 7 17 3 12 3z" fill="url(#gBrown)"/><circle cx="7.5" cy="11" r="1.5" fill="#EF4444"/><circle cx="10" cy="7" r="1.5" fill="#FACC15"/><circle cx="14.5" cy="6.8" r="1.5" fill="#22C55E"/><circle cx="17.5" cy="10.2" r="1.5" fill="#3B82F6"/><circle cx="8.5" cy="15.5" r="1.7" fill="#FFF7ED"/>`,
  openBook: `<path d="M12 6.8C10 5.2 7 4.6 3 5v13.4c4-.4 7 .2 9 1.8z" fill="url(#gBlue)"/><path d="M12 6.8c2-1.6 5-2.2 9-1.8v13.4c-4-.4-7 .2-9 1.8z" fill="url(#gBlue)" opacity=".8"/><path d="M5.5 8.6c1.8-.1 3.4.2 4.6.8M5.5 11.6c1.8-.1 3.4.2 4.6.8M18.5 8.6c-1.8-.1-3.4.2-4.6.8M18.5 11.6c-1.8-.1-3.4.2-4.6.8" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>`,
  globe: `<circle cx="12" cy="12" r="9" fill="url(#gBlue)"/><g fill="none" stroke="#fff" stroke-width="1.2" opacity=".85"><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M4.5 7.5h15M4.5 16.5h15M12 3v18"/></g>`,
  link: `<g transform="rotate(-45 12 12)" fill="none" stroke="url(#gSlate)" stroke-width="2.4"><rect x="2.5" y="8.8" width="10.5" height="6.4" rx="3.2"/><rect x="11" y="8.8" width="10.5" height="6.4" rx="3.2"/></g>`,
  chat: `<path d="M4.5 4.5h15a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H12l-5 4v-4H4.5A2.5 2.5 0 0 1 2 15V7a2.5 2.5 0 0 1 2.5-2.5z" fill="url(#gBlue)"/><circle cx="8" cy="11" r="1.3" fill="#fff"/><circle cx="12" cy="11" r="1.3" fill="#fff"/><circle cx="16" cy="11" r="1.3" fill="#fff"/>`,
  sparkle: `<path d="M12 2.5c.6 4.4 2.3 6.1 6.8 6.8-4.5.7-6.2 2.4-6.8 6.8-.6-4.4-2.3-6.1-6.8-6.8 4.5-.7 6.2-2.4 6.8-6.8z" fill="url(#gGold)"/><path d="M18.5 14.5c.25 1.8 1 2.5 2.8 2.8-1.8.3-2.55 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8z" fill="url(#gGold)"/>`,
  memo: `${page}${lines([10, 13, 16], 15)}${pencil(0.55, 9.5, 8.5)}`,
  magnifier: `<circle cx="10" cy="10" r="6.2" fill="#E0F2FE" stroke="url(#gSlate)" stroke-width="2.6"/><path d="M7.2 8.2a3.4 3.4 0 0 1 2.4-2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><path d="M14.6 14.6 20.2 20.2" stroke="url(#gSlate)" stroke-width="3.4" stroke-linecap="round"/>`,
  clipboard: `<rect x="4" y="4" width="16" height="18" rx="2.4" fill="url(#gBrown)"/><rect x="6.2" y="6.6" width="11.6" height="13.2" rx="1" fill="#fff"/><rect x="8.5" y="2.5" width="7" height="4" rx="1.4" fill="url(#gSlate)"/>${lines([10.5, 13.5, 16.5], 15.8)}`,
  archive: `<path d="M12 2.8 21 7.6H3z" fill="url(#gStone)"/><rect x="3.5" y="7.6" width="17" height="1.8" fill="#A8A29E"/><g fill="url(#gStone)"><rect x="5" y="10" width="2.4" height="8"/><rect x="9.2" y="10" width="2.4" height="8"/><rect x="12.4" y="10" width="2.4" height="8"/><rect x="16.6" y="10" width="2.4" height="8"/></g><rect x="3" y="18.4" width="18" height="2.6" rx=".8" fill="#A8A29E"/>`,
  book: `<rect x="5" y="2.5" width="14.5" height="19" rx="2" fill="url(#gBlue)"/><rect x="5" y="2.5" width="3" height="19" rx="1.2" fill="#1E40AF"/><rect x="10.5" y="6.5" width="6.5" height="2" rx="1" fill="#fff" opacity=".8"/>`,
  cloud: `<path d="M7 19h10.3a4.2 4.2 0 0 0 .6-8.35A5.6 5.6 0 0 0 7.1 9.2 4.9 4.9 0 0 0 7 19z" fill="url(#gCloud)" stroke="#60A5FA" stroke-width="1"/>`,
  puzzle: `<path d="M4.5 8.5H9a2.2 2.2 0 1 1 4.4 0h4.1v4.1a2.2 2.2 0 1 1 0 4.4v4.1h-4.1a2.2 2.2 0 1 0-4.4 0H4.5z" fill="url(#gGreen)"/>`,
} as const;

export type GlyphName = keyof typeof BODIES;
export const GLYPH_NAMES = Object.keys(BODIES) as GlyphName[];

/** The markup of one glyph with its gradient ids prefixed by `prefix` (exported for tests). */
export function glyphMarkup(name: GlyphName, prefix: string): string {
  const body = BODIES[name];
  const used = [...new Set([...body.matchAll(/url\(#(g[A-Za-z]+)\)/g)].map((m) => m[1]!))];
  const defs = used.map((id) => {
    const [a, b] = GRADIENTS[id]!;
    return `<linearGradient id="${prefix}${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  }).join('');
  return `<defs>${defs}</defs>${body.replace(/url\(#(g[A-Za-z]+)\)/g, `url(#${prefix}$1)`)}`;
}

export default function ToolGlyph({ name }: { name: GlyphName }) {
  const prefix = `tg${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      style={{ display: 'inline-block', verticalAlign: '-0.28em' }}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: glyphMarkup(name, prefix) }}
    />
  );
}
