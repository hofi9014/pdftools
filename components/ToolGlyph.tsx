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

// Generic glyphs (not tools). Each concept has exactly one glyph and no tool glyph is reused
// for a different meaning: the lock means "Protect PDF", the shield means "your file stays on
// your device", the key means security and encryption.
const miniPage = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" fill="url(#gPaper)" stroke="#94A3B8" stroke-width=".9"/>`;
const bars = (n: number) =>
  [0, 1, 2].map((i) => `<rect x="${3.6 + i * 6.2}" y="${16 - i * 5}" width="4.6" height="${5.5 + i * 5}" rx="1.2" fill="${i < n ? 'url(#gAmber)' : '#CBD5E1'}"/>`).join('');
const turnArrow = `<path d="M5 12.5a7 7 0 0 1 12.4-4.4" fill="none" stroke="url(#gBlue)" stroke-width="2.2" stroke-linecap="round"/><path d="M18.4 4v4.6h-4.6" fill="none" stroke="url(#gBlue)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
const turnPage = miniPage(8.4, 11, 7.2, 10.5);
const pos = (cx: number, cy: number) =>
  `<rect x="5.5" y="2.5" width="13" height="19" rx="2" fill="url(#gPaper)" stroke="#94A3B8" stroke-width=".9"/><path d="M8.5 10h7M8.5 12.4h7M8.5 14.8h4.6" stroke="#CBD5E1" stroke-width="1.1" stroke-linecap="round"/><rect x="${cx - 1.9}" y="${cy - 1.3}" width="3.8" height="2.6" rx=".8" fill="url(#gBlue)"/>`;
const mirror = (body: string) => `<g transform="matrix(-1 0 0 1 24 0)">${body}</g>`;
const undoArrow = `<path d="M8.5 8h6a5 5 0 0 1 0 10H8" fill="none" stroke="url(#gSlate)" stroke-width="2.4" stroke-linecap="round"/><path d="M11.5 4.2 7.4 8l4.1 3.8" fill="none" stroke="url(#gSlate)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const star5 = (cx: number, cy: number, r: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}z`;
};
const euStars = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return star5(12 + 5.4 * Math.cos(a), 12 + 5.4 * Math.sin(a), 1.7);
}).join('');
const sunRays = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number) => `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(7.4)}L${p(9.8)}`;
}).join('');

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
  // states
  hourglass: `<rect x="5" y="2.5" width="14" height="2.6" rx="1.2" fill="url(#gBrown)"/><rect x="5" y="18.9" width="14" height="2.6" rx="1.2" fill="url(#gBrown)"/><path d="M7 5.1h10c0 4-5 5-5 6.9s5 2.9 5 6.9H7c0-4 5-5 5-6.9S7 9.1 7 5.1z" fill="#E0F2FE" stroke="#94A3B8" stroke-width=".9"/><path d="M8.7 7h6.6c-.6 1.8-3.3 2.6-3.3 4.3C12 9.6 9.3 8.8 8.7 7z" fill="url(#gGold)"/><path d="M12 13.6c.3 1.6 3.5 2.6 3.9 4.3H8.1c.4-1.7 3.6-2.7 3.9-4.3z" fill="url(#gGold)"/>`,
  warning: `<path d="M10.3 3.6a2 2 0 0 1 3.4 0l8.1 14.3a2 2 0 0 1-1.7 3H3.9a2 2 0 0 1-1.7-3z" fill="url(#gGold)"/><rect x="10.9" y="8.4" width="2.2" height="6.8" rx="1.1" fill="#78350F"/><circle cx="12" cy="18" r="1.3" fill="#78350F"/>`,
  success: `<circle cx="12" cy="12" r="9.5" fill="url(#gGreen)"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  info: `<circle cx="12" cy="12" r="9.5" fill="url(#gBlue)"/><circle cx="12" cy="7.6" r="1.45" fill="#fff"/><rect x="10.8" y="10.2" width="2.4" height="7.4" rx="1.2" fill="#fff"/>`,
  question: `<circle cx="12" cy="12" r="9.5" fill="url(#gViolet)"/><path d="M9.2 9.3a2.9 2.9 0 1 1 4.3 2.5c-.9.5-1.5 1.1-1.5 2.1v.6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.35" fill="#fff"/>`,
  // files
  folderOpen: `<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7V10H3z" fill="url(#gBrown)"/><path d="M5.6 7.8h12.8v3H5.6z" fill="#fff"/><path d="M2.4 10.6a1.2 1.2 0 0 1 1.2-1.2h16.8a1.2 1.2 0 0 1 1.2 1.4l-1.5 8.3a1.5 1.5 0 0 1-1.5 1.2H5a1.5 1.5 0 0 1-1.5-1.3z" fill="url(#gGold)"/>`,
  folder: `<path d="M2.5 6.2a1.7 1.7 0 0 1 1.7-1.7h5l2 2.3h8.6a1.7 1.7 0 0 1 1.7 1.7v10.3a1.7 1.7 0 0 1-1.7 1.7H4.2a1.7 1.7 0 0 1-1.7-1.7z" fill="url(#gGold)"/><path d="M2.5 9.2h19" stroke="#D97706" stroke-width="1" opacity=".5"/>`,
  file: page,
  zip: `${page}<path d="M12 3v11" stroke="#64748B" stroke-width="2.2" stroke-dasharray="1.3 1.1"/><rect x="10.3" y="13.6" width="3.4" height="4.6" rx="1" fill="url(#gSlate)"/>`,
  fileX: `${page}<circle cx="15.4" cy="16.4" r="4.6" fill="url(#gRed)"/><path d="M13.5 14.5l3.8 3.8M17.3 14.5l-3.8 3.8" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>`,
  bigFile: `${page}<path d="M8.2 17.6 15 10.8M11.2 10.8H15v3.8" fill="none" stroke="url(#gBlue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  // promises and properties
  shield: `<path d="M12 2.5l7.5 3v5.6c0 4.8-3.2 8.6-7.5 10.4-4.3-1.8-7.5-5.6-7.5-10.4V5.5z" fill="url(#gBlue)"/><path d="M12 2.5v19c4.3-1.8 7.5-5.6 7.5-10.4V5.5z" fill="#fff" opacity=".14"/><path d="M8.4 12l2.5 2.5 4.8-5" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  key: `<circle cx="8" cy="12" r="5.2" fill="url(#gGold)"/><circle cx="6.8" cy="12" r="1.7" fill="#92400E"/><path d="M12.6 10.6H21v2.8h-1.8V16h-2.6v-2.6h-4z" fill="url(#gGold)"/>`,
  certificate: `${page}${lines([9, 12], 15)}<circle cx="13.6" cy="16" r="3.4" fill="url(#gRed)"/><circle cx="13.6" cy="16" r="1.5" fill="#FCA5A5"/><path d="M11.7 18.6l-1 3.4 2.3-.9.5-2.2zm3.8 0 1 3.4-2.3-.9-.5-2.2z" fill="url(#gRed)"/>`,
  euStars: `<rect x="2" y="4" width="20" height="16" rx="2.6" fill="url(#gBlue)"/><path d="${euStars}" fill="#FACC15"/>`,
  bolt: `<path d="M13.6 2 5 13.4h6.1L9.8 22 19 10.2h-6.1z" fill="url(#gGold)" stroke="#D97706" stroke-width=".6" stroke-linejoin="round"/>`,
  gift: `<rect x="3.5" y="10.5" width="17" height="10.5" rx="1.8" fill="url(#gRed)"/><rect x="2.5" y="7.2" width="19" height="4.2" rx="1.4" fill="url(#gRed)"/><rect x="10.6" y="7.2" width="2.8" height="13.8" fill="url(#gGold)"/><path d="M12 7.2c-1.5-3.8-6-4.4-5.8-1.6.1 1.5 2.9 1.9 5.8 1.6zm0 0c1.5-3.8 6-4.4 5.8-1.6-.1 1.5-2.9 1.9-5.8 1.6z" fill="none" stroke="url(#gGold)" stroke-width="1.7"/>`,
  star: `<path d="M12 2.6l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill="url(#gGold)" stroke="#D97706" stroke-width=".6" stroke-linejoin="round"/>`,
  // options of the tools
  level1: bars(1),
  level2: bars(2),
  level3: bars(3),
  turnRight: `${turnPage}${turnArrow}`,
  turnLeft: `${turnPage}${mirror(turnArrow)}`,
  turn180: `${turnPage}<path d="M4.6 13a7.4 7.4 0 0 1 14.8 0" fill="none" stroke="url(#gBlue)" stroke-width="2.2" stroke-linecap="round"/><path d="M16.4 11.4l3 3 3-3" fill="none" stroke="url(#gBlue)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  posTL: pos(9.4, 5.6),
  posTC: pos(12, 5.6),
  posTR: pos(14.6, 5.6),
  posBL: pos(9.4, 18.4),
  posBC: pos(12, 18.4),
  posBR: pos(14.6, 18.4),
  pagesEach: `${miniPage(2.2, 6, 5.8, 12)}${miniPage(9.1, 6, 5.8, 12)}${miniPage(16, 6, 5.8, 12)}<path d="M3.6 9.5h3M10.5 9.5h3M17.4 9.5h3" stroke="#CBD5E1" stroke-width="1.1" stroke-linecap="round"/>`,
  pointer: `<path d="M6 2.8l12.6 9.6-5.6.9 3.3 6.4-2.7 1.4-3.3-6.4L6 18.8z" fill="#fff" stroke="#1E293B" stroke-width="1.5" stroke-linejoin="round"/>`,
  ranges: `${page}<rect x="6.6" y="8.4" width="11" height="8.8" rx=".8" fill="#DDD6FE"/>${lines([10.4, 13, 15.6])}<path d="M3.8 8.4H2.6v8.8h1.2" fill="none" stroke="url(#gViolet)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
  letters: `<rect x="2.5" y="4.5" width="19" height="15" rx="3.5" fill="url(#gPaper)" stroke="#94A3B8" stroke-width=".9"/><text x="12" y="16.2" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="10.5" font-weight="700" fill="#334155">Aa</text>`,
  eye: `<path d="M2 12c2.4-4.3 6-6.5 10-6.5s7.6 2.2 10 6.5c-2.4 4.3-6 6.5-10 6.5S4.4 16.3 2 12z" fill="#fff" stroke="url(#gSlate)" stroke-width="1.6"/><circle cx="12" cy="12" r="3.8" fill="url(#gBlue)"/><circle cx="12" cy="12" r="1.6" fill="#1E293B"/><circle cx="13.3" cy="10.7" r=".8" fill="#fff"/>`,
  eyeOff: `<path d="M2 12c2.4-4.3 6-6.5 10-6.5s7.6 2.2 10 6.5c-2.4 4.3-6 6.5-10 6.5S4.4 16.3 2 12z" fill="#fff" stroke="url(#gSlate)" stroke-width="1.6"/><circle cx="12" cy="12" r="3.8" fill="url(#gBlue)"/><circle cx="12" cy="12" r="1.6" fill="#1E293B"/><path d="M4.2 20.4 19.8 3.6" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><path d="M4.2 20.4 19.8 3.6" stroke="url(#gSlate)" stroke-width="2" stroke-linecap="round"/>`,
  freehand: `<path d="M3 16.5c2-6 5-8 6.5-5.5S8.5 18 11.5 17s3.5-8.5 5.5-7.5-.5 6 3.5 4.5" fill="none" stroke="url(#gAmber)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  highlighter: `<rect x="3" y="17.6" width="18" height="3.6" rx="1" fill="#FDE047" opacity=".9"/><g transform="rotate(40 13 9)"><rect x="10.5" y="1" width="5" height="11" rx="1.2" fill="url(#gSlate)"/><path d="M10.5 12h5l-1 3h-3z" fill="#334155"/><path d="M11.8 15h2.4l-.5 1.8h-1.4z" fill="#FACC15"/></g>`,
  undo: undoArrow,
  redo: mirror(undoArrow),
  zoom: `<circle cx="10" cy="10" r="6.4" fill="#fff" stroke="url(#gSlate)" stroke-width="2.4"/><path d="M10 7v6M7 10h6" stroke="url(#gBlue)" stroke-width="2" stroke-linecap="round"/><path d="M14.8 14.8l5.7 5.7" stroke="url(#gSlate)" stroke-width="3" stroke-linecap="round"/>`,
  // site sections and categories
  sliders: `<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="6.5" r="2.6" fill="url(#gAmber)"/><circle cx="15.5" cy="12" r="2.6" fill="url(#gBlue)"/><circle cx="10" cy="17.5" r="2.6" fill="url(#gGreen)"/>`,
  swap: `<path d="M4 8.5h14M14.5 4.5l4 4-4 4" fill="none" stroke="url(#gBlue)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 15.5H6M9.5 11.5l-4 4 4 4" fill="none" stroke="url(#gGreen)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  books: `<rect x="2.5" y="5" width="4" height="15.6" rx=".8" fill="url(#gRed)"/><rect x="7" y="3" width="4.4" height="17.6" rx=".8" fill="url(#gBlue)"/><rect x="11.9" y="6" width="3.6" height="14.6" rx=".8" fill="url(#gGreen)"/><rect x="16.4" y="4.4" width="3.8" height="16.4" rx=".8" fill="url(#gGold)" transform="rotate(10 18.3 20.8)"/><path d="M2.5 8h4M7 6h4.4M11.9 9h3.6" stroke="#fff" stroke-width="1" opacity=".6"/><rect x="1.8" y="20.4" width="20.4" height="1.6" rx=".8" fill="#A8A29E"/>`,
  scroll: `<rect x="6" y="5" width="12" height="14" fill="#FEF3C7" stroke="#D6A77A" stroke-width=".8"/><rect x="4.5" y="2.5" width="15" height="3.2" rx="1.6" fill="url(#gBrown)"/><rect x="4.5" y="18.3" width="15" height="3.2" rx="1.6" fill="url(#gBrown)"/><path d="M8.5 9h7M8.5 11.6h7M8.5 14.2h5" stroke="#B45309" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>`,
  coffee: `<path d="M4 9.5h12.5v5.6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="url(#gBrown)"/><path d="M16.5 11h1.3a2.6 2.6 0 0 1 0 5.2h-1.6" fill="none" stroke="url(#gBrown)" stroke-width="1.8"/><path d="M4.6 10.2h11.3" stroke="#78350F" stroke-width="1.4"/><path d="M8 2.8c-1 1.4 1 2.2 0 3.6M12 2.8c-1 1.4 1 2.2 0 3.6" fill="none" stroke="#A8A29E" stroke-width="1.3" stroke-linecap="round"/><rect x="2.6" y="20.2" width="15.8" height="1.7" rx=".85" fill="#A8A29E"/>`,
  lifebuoy: `<circle cx="12" cy="12" r="8.6" fill="none" stroke="#F1F5F9" stroke-width="5"/><circle cx="12" cy="12" r="8.6" fill="none" stroke="url(#gRed)" stroke-width="5" stroke-dasharray="6.75 6.76" transform="rotate(-22.5 12 12)"/><circle cx="12" cy="12" r="11.1" fill="none" stroke="#CBD5E1" stroke-width=".6"/><circle cx="12" cy="12" r="6.1" fill="none" stroke="#CBD5E1" stroke-width=".6"/>`,
  mail: `<rect x="2.5" y="5" width="19" height="14" rx="2" fill="url(#gPaper)" stroke="#94A3B8" stroke-width=".9"/><path d="M3.2 6.2 12 13l8.8-6.8" fill="none" stroke="url(#gBlue)" stroke-width="1.8" stroke-linejoin="round"/>`,
  bug: `<path d="M8 6.5l-2-2M16 6.5l2-2M5 11H2.5M21.5 11H19M5 15.5l-2.2 1.3M19 15.5l2.2 1.3" stroke="#334155" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="7" r="3.3" fill="#334155"/><ellipse cx="12" cy="14" rx="6.5" ry="7.2" fill="url(#gRed)"/><path d="M12 7v14" stroke="#7F1D1D" stroke-width="1.1"/><circle cx="9.3" cy="12.3" r="1.2" fill="#1E293B"/><circle cx="14.7" cy="12.3" r="1.2" fill="#1E293B"/><circle cx="9.6" cy="16.6" r="1" fill="#1E293B"/><circle cx="14.4" cy="16.6" r="1" fill="#1E293B"/>`,
  bulb: `<path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.8.6 1.2 1.4 1.2 2.3v.5h5.4v-.5c0-.9.4-1.7 1.2-2.3A6.5 6.5 0 0 0 12 2.5z" fill="url(#gGold)"/><path d="M10 9.5c.4-1.4 1.5-2.2 2.9-2.3" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/><rect x="9.3" y="17.6" width="5.4" height="1.8" rx=".6" fill="url(#gSlate)"/><rect x="9.8" y="19.7" width="4.4" height="1.8" rx=".9" fill="url(#gSlate)"/>`,
  externalLink: `<rect x="3" y="6" width="15" height="15" rx="2.5" fill="url(#gPaper)" stroke="#94A3B8" stroke-width=".9"/><path d="M11 13l9.5-9.5M14.5 3.5h6v6" fill="none" stroke="url(#gBlue)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  install: `<rect x="6.5" y="2" width="11" height="20" rx="2.4" fill="url(#gSlate)"/><rect x="7.8" y="4.4" width="8.4" height="14.2" rx="1" fill="#E0F2FE"/><path d="M12 7v7.4M9.3 11.8l2.7 2.7 2.7-2.7" fill="none" stroke="url(#gBlue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="20.3" r=".8" fill="#E2E8F0"/>`,
  wifiOff: `<g fill="none" stroke="url(#gBlue)" stroke-width="2.2" stroke-linecap="round"><path d="M3 9.5a13 13 0 0 1 18 0"/><path d="M6.2 13a8.4 8.4 0 0 1 11.6 0"/><path d="M9.4 16.4a3.8 3.8 0 0 1 5.2 0"/></g><circle cx="12" cy="19.4" r="1.5" fill="url(#gBlue)"/><path d="M4 3.5l16 17" stroke="url(#gRed)" stroke-width="2.2" stroke-linecap="round"/>`,
  pin: `<circle cx="12" cy="7.5" r="5" fill="url(#gRed)"/><circle cx="10.4" cy="5.9" r="1.4" fill="#fff" opacity=".5"/><path d="M12 12.5v9" stroke="#64748B" stroke-width="2" stroke-linecap="round"/>`,
  sun: `<circle cx="12" cy="12" r="4.8" fill="url(#gGold)"/><path d="${sunRays}" stroke="url(#gGold)" stroke-width="2" stroke-linecap="round"/>`,
  moon: `<path d="M15.5 3.2A8.8 8.8 0 1 0 20.8 15 7 7 0 0 1 15.5 3.2z" fill="url(#gViolet)"/>`,
  building: `<rect x="3.5" y="3" width="11.5" height="18.5" rx="1" fill="url(#gSlate)"/><rect x="15" y="9" width="5.5" height="12.5" rx="1" fill="#64748B"/><g fill="#E0F2FE"><rect x="5.6" y="5.4" width="2.6" height="2.3"/><rect x="10.2" y="5.4" width="2.6" height="2.3"/><rect x="5.6" y="9.3" width="2.6" height="2.3"/><rect x="10.2" y="9.3" width="2.6" height="2.3"/><rect x="5.6" y="13.2" width="2.6" height="2.3"/><rect x="10.2" y="13.2" width="2.6" height="2.3"/><rect x="16.5" y="11.4" width="2.5" height="2"/><rect x="16.5" y="15" width="2.5" height="2"/></g><rect x="7.9" y="17" width="2.6" height="4.5" fill="#1E293B"/>`,
  laptop: `<rect x="4.5" y="4.5" width="15" height="10.5" rx="1.4" fill="url(#gSlate)"/><rect x="5.9" y="5.9" width="12.2" height="7.7" rx=".6" fill="#BAE6FD"/><path d="M2 16.2h20l-1.2 2.6a1.6 1.6 0 0 1-1.5 1H4.7a1.6 1.6 0 0 1-1.5-1z" fill="url(#gStone)"/>`,
  floppy: `<path d="M5 3.5h11.5l4 4V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z" fill="url(#gBlue)"/><rect x="7" y="3.5" width="8.5" height="5.5" rx=".6" fill="#E2E8F0"/><rect x="12.4" y="4.4" width="1.8" height="3.6" fill="#64748B"/><rect x="6.5" y="12.5" width="11" height="8" rx=".8" fill="#fff"/>`,
  chip: `<g stroke="url(#gSlate)" stroke-width="1.5" stroke-linecap="round"><path d="M9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 12h3M2.5 15h3M18.5 9h3M18.5 12h3M18.5 15h3"/></g><rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="url(#gSlate)"/><rect x="8.5" y="8.5" width="7" height="7" rx="1" fill="#94A3B8"/>`,
  browser: `<rect x="2.5" y="4" width="19" height="16" rx="2.4" fill="url(#gPaper)" stroke="#94A3B8" stroke-width=".9"/><path d="M2.9 6.4a2 2 0 0 1 2-2h14.2a2 2 0 0 1 2 2V9H2.9z" fill="url(#gSlate)"/><circle cx="5.6" cy="6.7" r=".9" fill="#F87171"/><circle cx="8.3" cy="6.7" r=".9" fill="#FACC15"/><circle cx="11" cy="6.7" r=".9" fill="#4ADE80"/><path d="M6 13h12M6 16h8" stroke="#CBD5E1" stroke-width="1.3" stroke-linecap="round"/>`,
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
