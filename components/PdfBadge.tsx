'use client';

import React, { useId } from 'react';

type BadgeType = 'PDF' | 'DOC' | 'XLS' | 'PPT' | 'ODT';

interface BadgeConfig {
  docGrad: [string, string];
  fold: string;
  ribbon: string;
  ribbonDark: string;
  textSize: number;
}

const cfg: Record<BadgeType, BadgeConfig> = {
  PDF: { docGrad: ['#F44336', '#D32F2F'], fold: '#FFCDD2', ribbon: '#C62828', ribbonDark: '#8E0000', textSize: 6.5 },
  DOC: { docGrad: ['#42A5F5', '#2563EB'], fold: '#BBDEFB', ribbon: '#1565C0', ribbonDark: '#0D47A1', textSize: 6.5 },
  XLS: { docGrad: ['#66BB6A', '#16A34A'], fold: '#C8E6C9', ribbon: '#2E7D32', ribbonDark: '#1B5E20', textSize: 6.5 },
  PPT: { docGrad: ['#FFA726', '#EA580C'], fold: '#FFE0B2', ribbon: '#E65100', ribbonDark: '#BF360C', textSize: 6.5 },
  ODT: { docGrad: ['#4DB6AC', '#14B8A6'], fold: '#B2DFDB', ribbon: '#00796B', ribbonDark: '#004D40', textSize: 6.5 },
};

function PdfBadge({ type = 'PDF' }: { type?: BadgeType }) {
  const c = cfg[type];
  const uid = useId();
  const did = `${uid}-doc-${type}`;
  const rid = `${uid}-rib-${type}`;
  return (
    <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))', display: 'inline-block', verticalAlign: '-0.2em' }}>
      <defs>
        <linearGradient id={did} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.docGrad[0]} />
          <stop offset="100%" stopColor={c.docGrad[1]} />
        </linearGradient>
        <linearGradient id={rid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.ribbon} />
          <stop offset="100%" stopColor={c.ribbonDark} />
        </linearGradient>
      </defs>

      {/* Document body — rounded rect with top-right corner cut */}
      <path d="M3,21 L3,5 Q3,3 5,3 L13,3 L16,6 L16,21 Q16,22 15,22 L4,22 Q3,22 3,21 Z" fill={`url(#${did})`} />

      {/* Folded corner triangle */}
      <path d="M13,3 L16,6 L13,6 Z" fill={c.fold} opacity="0.85" />
      <path d="M13,3 L16,6" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />

      {/* Glossy highlight at top */}
      <path d="M3,5 Q3,3 5,3 L13,3 L13,5 L3,5 Z" fill="rgba(255,255,255,0.12)" />

      {/* Ribbon shadow — wider than document to show wrapping */}
      <rect x="1" y="13" width="17" height="5" rx="2.5" fill="rgba(0,0,0,0.12)" transform="translate(0, 0.8)" />

      {/* Ribbon body — positioned in lower half, wider than doc */}
      <rect x="1" y="13" width="17" height="5" rx="2.5" fill={`url(#${rid})`} />

      {/* Ribbon end fold-unders (dark triangles at each protrusion) */}
      <path d="M 1 16 L 3 18 L 1 18 Z" fill="rgba(0,0,0,0.35)" />
      <path d="M 18 16 L 16 18 L 18 18 Z" fill="rgba(0,0,0,0.35)" />

      {/* Ribbon subtle top highlight */}
      <path d="M 1.5 13.5 L 18 13.5" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {/* Text centered on ribbon */}
      <text x="9.5" y="17.5" textAnchor="middle" fill="white" fontSize={c.textSize} fontWeight="bold" fontFamily="Arial, sans-serif">{type}</text>
    </svg>
  );
}

export default PdfBadge;
