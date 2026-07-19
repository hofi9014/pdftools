import React from 'react';
import PdfBadge from '@/components/PdfBadge';

const s: React.CSSProperties = {
  filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.2)) drop-shadow(0 0 3px rgba(255,255,255,0.15))',
  lineHeight: 1,
};
const d: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '0.55em',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
};

const em = (emoji: string) => <span style={s}>{emoji}</span>;
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
  compress:  row(<>{<PdfBadge />}<span style={d}>🗜️</span></>),
  rotate:   row(<>{em('🔄')}{<PdfBadge />}</>),
  crop:     row(<>{em('✂️')}{<PdfBadge />}</>),
  edit:     row(<>{em('✏️')}{<PdfBadge />}</>),
  sign:     row(<>{em('✍️')}{<PdfBadge />}</>),
  watermark:row(<>{em('💧')}{<PdfBadge />}</>),
  pagenumbers: row(<>{em('🔢')}{<PdfBadge />}</>),
  delete:   row(<>{em('🗑️')}{<PdfBadge />}</>),
  extract:  row(<>{<PdfBadge />}{em('✅')}{ar()}{<PdfBadge />}</>),
  reorder:  row(<>{em('🔀')}{<PdfBadge />}</>),
  addpage:  row(<>{<PdfBadge />}{pls()}</>),
  metadata: row(<>{em('🏷️')}{<PdfBadge />}</>),
  redact:   row(<>{em('🚫')}{<PdfBadge />}</>),
  flatten:  row(<>{<PdfBadge />}{<PdfBadge />}{dn()}{<PdfBadge />}</>),

  word:         row(<>{<PdfBadge />}{ar()}{<PdfBadge type="DOC" />}</>),
  wordtopdf:    row(<>{<PdfBadge type="DOC" />}{ar()}{<PdfBadge />}</>),
  jpgTopdf:     row(<>{em('🖼️')}{ar()}{<PdfBadge />}</>),
  images:       row(<>{<PdfBadge />}{ar()}{em('🖼️')}</>),
  excel:        row(<>{<PdfBadge />}{ar()}{<PdfBadge type="XLS" />}</>),
  excel2pdf:    row(<>{<PdfBadge type="XLS" />}{ar()}{<PdfBadge />}</>),
  ppt:          row(<>{<PdfBadge />}{ar()}{<PdfBadge type="PPT" />}</>),
  openoffice:   row(<>{<PdfBadge type="ODT" />}{ar()}{<PdfBadge />}</>),
  pdf2openoffice: row(<>{<PdfBadge />}{ar()}{<PdfBadge type="ODT" />}</>),
  txt:          row(<>{<PdfBadge />}{ar()}{em('📃')}</>),
  svg:          row(<>{<PdfBadge />}{ar()}{em('🎨')}</>),
  epub:         row(<>{<PdfBadge />}{ar()}{em('📖')}</>),
  html:         row(<>{em('🌐')}{ar()}{<PdfBadge />}</>),
  url:          row(<>{em('🔗')}{ar()}{<PdfBadge />}</>),
  html2pdf:     row(<>{<PdfBadge />}{ar()}{em('🌐')}</>),

  protect:      row(<>{em('🔒')}{<PdfBadge />}</>),
  unlock:       row(<>{em('🔓')}{<PdfBadge />}</>),

  aichat:       row(<>{em('💬')}{em('✨')}{<PdfBadge />}</>),
  aisummary:    row(<>{<PdfBadge />}{ar()}{em('📝')}<span style={{fontSize:'0.5em',color:'#f59e0b'}}>✨</span></>),
  translate:    row(<>{<PdfBadge />}{ar()}{em('🌐')}<span style={s}>✨</span></>),
  ocr:          row(<>{em('🔍')}{<PdfBadge />}</>),
  compare:      row(<>{<PdfBadge />}
    <svg width="0.55em" height="0.55em" viewBox="0 0 22 20" style={isx}>
      <defs><linearGradient id="cmpG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#64748b"/></linearGradient></defs>
      <path d="M6,5 L3,10 L6,15 M3,10 L19,10 M16,5 L19,10 L16,15" fill="none" stroke="url(#cmpG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  {<PdfBadge />}</>),
  fillform:     row(<>{em('📋')}{<PdfBadge />}</>),
  pdfa:         row(<>{<PdfBadge />}{ar()}{em('🏛️')}</>),
  guide:        em('📘'),
  cloud:        em('☁️'),
  'cloud-access':   em('☁️'),
  'cloud-relogin':  em('☁️'),
  'cloud-privacy':  em('☁️'),
};

const categoryIcons: Record<string, React.ReactNode> = {
  edit:    <span style={s}>✏️</span>,
  convert: <span style={s}>🔄</span>,
  secure:  <span style={s}>🔒</span>,
  more:    <span style={s}>🧩</span>,
  cloud:   <span style={s}>☁️</span>,
};

export function getToolIcon(key: string): React.ReactNode {
  return tools[key] || null;
}

export function getCategoryIcon(key: string): React.ReactNode {
  return categoryIcons[key] || null;
}
