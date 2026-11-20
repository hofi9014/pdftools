import { useId } from 'react';

// A document with a shield, standing behind the coffee cup in the home-page circle (owner's
// choice 2026-11-20, variant A1): the cup says "stay a while", the shield says "your file is
// safe". Decorative only: the parent is aria-hidden. Gradient ids come from useId so a second
// copy on the page cannot borrow (and lose) the first one's gradients.
export default function HeroShieldDoc({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const id = useId().replace(/:/g, '');
  const paper = `hsd-paper-${id}`;
  const shield = `hsd-shield-${id}`;
  const glow = `hsd-glow-${id}`;
  return (
    <svg viewBox="0 0 200 250" className={className} style={style} focusable="false" overflow="visible">
      <defs>
        <linearGradient id={paper} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F4E8D8" />
        </linearGradient>
        <linearGradient id={shield} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F28B44" />
          <stop offset="1" stopColor="#B83E0C" />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F7A35C" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F7A35C" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the page, with a folded corner and a few lines of text */}
      <path d="M18 8 H150 L188 46 V236 Q188 244 180 244 H18 Q10 244 10 236 V16 Q10 8 18 8 Z" fill={`url(#${paper})`} stroke="#E2CFB4" strokeWidth="2" />
      <path d="M150 8 V38 Q150 46 158 46 H188 Z" fill="#E9D9C2" />
      <rect x="32" y="178" width="136" height="8" rx="4" fill="#E6D7C1" />
      <rect x="32" y="196" width="118" height="8" rx="4" fill="#E6D7C1" />
      <rect x="32" y="214" width="126" height="8" rx="4" fill="#E6D7C1" />
      {/* the shield with a tick, on a soft glow */}
      <circle cx="99" cy="92" r="92" fill={`url(#${glow})`} />
      <path d="M99 18 L156 38 V84 C156 120 132 144 99 160 C66 144 42 120 42 84 V38 Z" fill={`url(#${shield})`} stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" />
      <path d="M99 26 L148 43 V84 C148 115 128 136 99 150 Z" fill="#FFFFFF" opacity="0.15" />
      <path d="M73 88 L92 107 L127 70" fill="none" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
