import React from 'react';

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
const ar = () => <span style={d}>➡️</span>;
const pls = () => <span style={{ ...d, color: '#22c55e' }}>➕</span>;
const dn = () => <span style={d}>⬇️</span>;
const up = () => <span style={d}>⬆️</span>;

const row = (children: React.ReactNode) =>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>{children}</span>;

const fi = (bg: string, letter: string, ls = 12) => (
  <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))', display: 'inline-block', verticalAlign: '-0.2em' }}>
    <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill={bg} />
    <rect x="1.5" y="1.5" width="21" height="6" rx="3" fill="rgba(255,255,255,0.18)" />
    <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize={ls} fontWeight="bold" fontFamily="Arial, sans-serif">{letter}</text>
  </svg>
);

const tools: Record<string, React.ReactNode> = {
  merge:    row(<>{fi('#dc2626','PDF',7)}{pls()}{fi('#dc2626','PDF',7)}{ar()}{fi('#dc2626','PDF',7)}</>),
  split:    row(<>{fi('#dc2626','PDF',7)}{ar()}{fi('#dc2626','PDF',7)}{fi('#dc2626','PDF',7)}</>),
  compress:  row(<>{fi('#dc2626','PDF',7)}<span style={d}>🗜️</span></>),
  rotate:   row(<>{em('🔄')}{fi('#dc2626','PDF',7)}</>),
  crop:     row(<>{em('✂️')}{fi('#dc2626','PDF',7)}</>),
  edit:     row(<>{em('✏️')}{fi('#dc2626','PDF',7)}</>),
  sign:     row(<>{em('✍️')}{fi('#dc2626','PDF',7)}</>),
  watermark:row(<>{em('💧')}{fi('#dc2626','PDF',7)}</>),
  pagenumbers: row(<>{em('🔢')}{fi('#dc2626','PDF',7)}</>),
  delete:   row(<>{em('🗑️')}{fi('#dc2626','PDF',7)}</>),
  extract:  row(<>{fi('#dc2626','PDF',7)}{em('✅')}{ar()}{fi('#dc2626','PDF',7)}</>),
  reorder:  row(<>{em('🔀')}{fi('#dc2626','PDF',7)}</>),
  addpage:  row(<>{fi('#dc2626','PDF',7)}{pls()}</>),
  metadata: row(<>{em('🏷️')}{fi('#dc2626','PDF',7)}</>),
  redact:   row(<>{em('🚫')}{fi('#dc2626','PDF',7)}</>),
  flatten:  row(<>{fi('#dc2626','PDF',7)}{fi('#dc2626','PDF',7)}{dn()}{fi('#dc2626','PDF',7)}</>),

  word:         row(<>{fi('#dc2626','PDF',7)}{ar()}{fi('#2563eb','W')}</>),
  wordtopdf:    row(<>{fi('#2563eb','W')}{ar()}{fi('#dc2626','PDF',7)}</>),
  jpgTopdf:     row(<>{em('🖼️')}{ar()}{fi('#dc2626','PDF',7)}</>),
  images:       row(<>{fi('#dc2626','PDF',7)}{ar()}{em('🖼️')}</>),
  excel:        row(<>{fi('#dc2626','PDF',7)}{ar()}{fi('#16a34a','X')}</>),
  excel2pdf:    row(<>{fi('#16a34a','X')}{ar()}{fi('#dc2626','PDF',7)}</>),
  ppt:          row(<>{fi('#dc2626','PDF',7)}{ar()}{fi('#ea580c','P')}</>),
  openoffice:   row(<>{fi('#14b8a6','OO',8)}{ar()}{fi('#dc2626','PDF',7)}</>),
  pdf2openoffice: row(<>{fi('#dc2626','PDF',7)}{ar()}{fi('#14b8a6','OO',8)}</>),
  txt:          row(<>{fi('#dc2626','PDF',7)}{ar()}{em('📃')}</>),
  svg:          row(<>{fi('#dc2626','PDF',7)}{ar()}{em('🎨')}</>),
  epub:         row(<>{fi('#dc2626','PDF',7)}{ar()}{em('📖')}</>),
  html:         row(<>{em('🌐')}{ar()}{fi('#dc2626','PDF',7)}</>),
  url:          row(<>{em('🔗')}{ar()}{fi('#dc2626','PDF',7)}</>),
  html2pdf:     row(<>{fi('#dc2626','PDF',7)}{ar()}{em('🌐')}</>),

  protect:      row(<>{em('🔒')}{fi('#dc2626','PDF',7)}</>),
  unlock:       row(<>{em('🔓')}{fi('#dc2626','PDF',7)}</>),

  aichat:       row(<>{em('💬')}{em('✨')}{fi('#dc2626','PDF',7)}</>),
  aisummary:    row(<>{fi('#dc2626','PDF',7)}{ar()}{em('📝')}<span style={{fontSize:'0.5em',color:'#f59e0b'}}>✨</span></>),
  translate:    row(<>{fi('#dc2626','PDF',7)}{ar()}{em('🌐')}<span style={s}>✨</span></>),
  ocr:          row(<>{em('🔍')}{fi('#dc2626','PDF',7)}</>),
  compare:      row(<>{fi('#dc2626','PDF',7)}<span style={d}>↔️</span>{fi('#dc2626','PDF',7)}</>),
  fillform:     row(<>{em('📋')}{fi('#dc2626','PDF',7)}</>),
  pdfa:         row(<>{fi('#dc2626','PDF',7)}{ar()}{em('🏛️')}</>),
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
