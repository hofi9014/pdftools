import React from 'react';
import PdfBadge from '@/components/PdfBadge';
import ToolGlyph, { type GlyphName } from '@/components/ToolGlyph';

const s: React.CSSProperties = {
  filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.2)) drop-shadow(0 0 3px rgba(255,255,255,0.15))',
  lineHeight: 1,
};
const d: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '0.55em',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
};

const gl = (name: GlyphName) => <span style={s}><ToolGlyph name={name} /></span>;
const isx: React.CSSProperties = { display: 'inline-block', verticalAlign: 'middle', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' };

const ar = () => (
  <svg width="0.55em" height="0.55em" viewBox="0 0 20 20" style={isx}>
    <defs><linearGradient id="arG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#64748b"/></linearGradient></defs>
    <path d="M3,10 L17,10 M11,4 L17,10 L11,16" fill="none" stroke="url(#arG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const pls = () => (
  <svg width="0.55em" height="0.55em" viewBox="0 0 20 20" style={isx}>
    <defs><linearGradient id="plsG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/></linearGradient></defs>
    <path d="M10,4 L10,16 M4,10 L16,10" fill="none" stroke="url(#plsG)" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);
const dn = () => (
  <svg width="0.55em" height="0.55em" viewBox="0 0 20 20" style={isx}>
    <defs><linearGradient id="dnG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#64748b"/></linearGradient></defs>
    <path d="M10,3 L10,17 M4,11 L10,17 L16,11" fill="none" stroke="url(#dnG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const up = () => (
  <svg width="0.55em" height="0.55em" viewBox="0 0 20 20" style={isx}>
    <defs><linearGradient id="upG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#64748b"/></linearGradient></defs>
    <path d="M10,17 L10,3 M4,9 L10,3 L16,9" fill="none" stroke="url(#upG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const row = (children: React.ReactNode) =>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>{children}</span>;


const tools: Record<string, React.ReactNode> = {
  merge:    row(<>{<PdfBadge />}{pls()}{<PdfBadge />}{ar()}{<PdfBadge />}</>),
  split:    row(<>{<PdfBadge />}{ar()}{<PdfBadge />}{<PdfBadge />}</>),
  compress:  row(<>{<PdfBadge />}<span style={d}><ToolGlyph name="compress" /></span></>),
  rotate:   row(<>{gl('rotate')}{<PdfBadge />}</>),
  crop:     row(<>{gl('scissors')}{<PdfBadge />}</>),
  edit:     row(<>{gl('pencil')}{<PdfBadge />}</>),
  sign:     row(<>{gl('signature')}{<PdfBadge />}</>),
  watermark:row(<>{gl('drop')}{<PdfBadge />}</>),
  pagenumbers: row(<>{gl('numbers')}{<PdfBadge />}</>),
  delete:   row(<>{gl('trash')}{<PdfBadge />}</>),
  extract:  row(<>{<PdfBadge />}{gl('check')}{ar()}{<PdfBadge />}</>),
  reorder:  row(<>{gl('shuffle')}{<PdfBadge />}</>),
  addpage:  row(<>{<PdfBadge />}{pls()}</>),
  metadata: row(<>{gl('tag')}{<PdfBadge />}</>),
  redact:   row(<>{gl('noEntry')}{<PdfBadge />}</>),
  flatten:  row(<>{<PdfBadge />}{<PdfBadge />}{dn()}{<PdfBadge />}</>),

  word:         row(<>{<PdfBadge />}{ar()}{<PdfBadge type="DOC" />}</>),
  wordtopdf:    row(<>{<PdfBadge type="DOC" />}{ar()}{<PdfBadge />}</>),
  jpgTopdf:     row(<>{gl('image')}{ar()}{<PdfBadge />}</>),
  images:       row(<>{<PdfBadge />}{ar()}{gl('image')}</>),
  excel:        row(<>{<PdfBadge />}{ar()}{<PdfBadge type="XLS" />}</>),
  excel2pdf:    row(<>{<PdfBadge type="XLS" />}{ar()}{<PdfBadge />}</>),
  ppt:          row(<>{<PdfBadge />}{ar()}{<PdfBadge type="PPT" />}</>),
  openoffice:   row(<>{<PdfBadge type="ODT" />}{ar()}{<PdfBadge />}</>),
  pdf2openoffice: row(<>{<PdfBadge />}{ar()}{<PdfBadge type="ODT" />}</>),
  txt:          row(<>{<PdfBadge />}{ar()}{gl('text')}</>),
  svg:          row(<>{<PdfBadge />}{ar()}{gl('palette')}</>),
  epub:         row(<>{<PdfBadge />}{ar()}{gl('openBook')}</>),
  html:         row(<>{gl('globe')}{ar()}{<PdfBadge />}</>),
  url:          row(<>{gl('link')}{ar()}{<PdfBadge />}</>),
  html2pdf:     row(<>{<PdfBadge />}{ar()}{gl('globe')}</>),

  protect:      row(<>{gl('lock')}{<PdfBadge />}</>),
  unlock:       row(<>{gl('unlock')}{<PdfBadge />}</>),

  aichat:       row(<>{gl('chat')}{gl('sparkle')}{<PdfBadge />}</>),
  aisummary:    row(<>{<PdfBadge />}{ar()}{gl('memo')}<span style={{fontSize:'0.5em'}}><ToolGlyph name="sparkle" /></span></>),
  translate:    row(<>{<PdfBadge />}{ar()}{gl('globe')}<span style={s}><ToolGlyph name="sparkle" /></span></>),
  ocr:          row(<>{gl('magnifier')}{<PdfBadge />}</>),
  compare:      row(<>{<PdfBadge />}
    <svg width="0.55em" height="0.55em" viewBox="0 0 22 20" style={isx}>
      <defs><linearGradient id="cmpG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#64748b"/></linearGradient></defs>
      <path d="M6,5 L3,10 L6,15 M3,10 L19,10 M16,5 L19,10 L16,15" fill="none" stroke="url(#cmpG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  {<PdfBadge />}</>),
  fillform:     row(<>{gl('clipboard')}{<PdfBadge />}</>),
  pdfa:         row(<>{<PdfBadge />}{ar()}{gl('archive')}</>),
  guide:        gl('book'),
  cloud:        gl('cloud'),
  'cloud-access':   gl('cloud'),
  'cloud-relogin':  gl('cloud'),
  'cloud-privacy':  gl('cloud'),
};

const categoryIcons: Record<string, React.ReactNode> = {
  edit:    <span style={s}><ToolGlyph name="sliders" /></span>,
  convert: <span style={s}><ToolGlyph name="swap" /></span>,
  secure:  <span style={s}><ToolGlyph name="key" /></span>,
  more:    <span style={s}><ToolGlyph name="puzzle" /></span>,
  cloud:   <span style={s}><ToolGlyph name="cloud" /></span>,
};

export function getToolIcon(key: string): React.ReactNode {
  return tools[key] || null;
}

export function getCategoryIcon(key: string): React.ReactNode {
  return categoryIcons[key] || null;
}
