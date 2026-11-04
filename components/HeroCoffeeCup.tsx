// A cup of coffee on a saucer, with steam, drawn inside the circle behind the file badges on
// the home page. Purely decorative: the parent is aria-hidden. Shaped like a real breakfast
// cup: a deep bowl on a short foot ring that stands in the well of a dished saucer
// with a raised, lipped rim. Light falls from the upper left: the glaze is shaded with layered
// gradients only (no noise: at screen resolution it reads as dirty pixels), with a contact shadow under the base and a cast shadow to the
// right. The steam rises slowly (`.hero-steam` in globals.css) and stands still for people who
// turned off animations. Everything is scaled to fit inside the circle.
export default function HeroCoffeeCup() {
  const body =
    'M69 148 C 70 198, 86 238, 114 263 C 126 274, 141 279, 165 279 C 189 279, 204 274, 216 263 C 244 238, 260 198, 261 148 Z';
  return (
    <svg viewBox="0 0 330 330" className="hero-cup absolute inset-0 w-full h-full" focusable="false">
      <defs>
        {/* cup body: sand glaze, lit from the left */}
        <linearGradient id="hcc-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A5875F" />
          <stop offset="0.1" stopColor="#C8AD85" />
          <stop offset="0.27" stopColor="#E9D9BF" />
          <stop offset="0.4" stopColor="#F5EBDA" />
          <stop offset="0.6" stopColor="#E6D3B3" />
          <stop offset="0.84" stopColor="#C9AC82" />
          <stop offset="1" stopColor="#9A7C55" />
        </linearGradient>
        <linearGradient id="hcc-body-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A3E22" stopOpacity="0.22" />
          <stop offset="0.1" stopColor="#5A3E22" stopOpacity="0" />
          <stop offset="0.62" stopColor="#5A3E22" stopOpacity="0.04" />
          <stop offset="1" stopColor="#47301A" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="hcc-foot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3E2812" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#3E2812" stopOpacity="0.18" />
          <stop offset="1" stopColor="#3E2812" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id="hcc-bounce" cx="0.5" cy="1.05" r="0.5">
          <stop offset="0" stopColor="#FFF3DF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFF3DF" stopOpacity="0" />
        </radialGradient>
        {/* rim, inner wall, coffee */}
        <linearGradient id="hcc-lip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFBF3" />
          <stop offset="0.55" stopColor="#F2E6D1" />
          <stop offset="1" stopColor="#D8C29E" />
        </linearGradient>
        <linearGradient id="hcc-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B99D76" />
          <stop offset="0.5" stopColor="#DDC8A6" />
          <stop offset="1" stopColor="#EFE2CB" />
        </linearGradient>
        <radialGradient id="hcc-coffee" cx="0.46" cy="0.42" r="0.58">
          <stop offset="0" stopColor="#4A2712" />
          <stop offset="0.45" stopColor="#3A1E0C" />
          <stop offset="0.74" stopColor="#5A3218" />
          <stop offset="0.88" stopColor="#9A6537" />
          <stop offset="0.96" stopColor="#C49060" />
          <stop offset="1" stopColor="#A87649" />
        </radialGradient>
        {/* handle */}
        <linearGradient id="hcc-handle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C2A57C" />
          <stop offset="0.3" stopColor="#EEE1CB" />
          <stop offset="0.65" stopColor="#CDB28A" />
          <stop offset="1" stopColor="#8C6E48" />
        </linearGradient>
        {/* saucer: the underside seen below the front lip, then the dished top */}
        <linearGradient id="hcc-saucer-under" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A88C64" />
          <stop offset="0.75" stopColor="#8A6E49" />
          <stop offset="1" stopColor="#6E5535" />
        </linearGradient>
        <radialGradient id="hcc-saucer-top" cx="0.45" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#DCC7A3" />
          <stop offset="0.5" stopColor="#E7D6BA" />
          <stop offset="0.78" stopColor="#F6EDDF" />
          <stop offset="0.93" stopColor="#E9D9BE" />
          <stop offset="1" stopColor="#C7AB82" />
        </radialGradient>

        {/* the front half of the rim, drawn over the coffee */}
        <mask id="hcc-ring">
          <ellipse cx="165" cy="172" rx="96" ry="21" fill="#fff" />
          <ellipse cx="165" cy="173.5" rx="88.5" ry="17.5" fill="#000" />
        </mask>
        <clipPath id="hcc-front">
          <rect x="0" y="172" width="330" height="40" />
        </clipPath>
        <clipPath id="hcc-coffee-clip">
          <ellipse cx="165" cy="178" rx="85" ry="14.5" />
        </clipPath>
        <clipPath id="hcc-body-clip">
          <path d={body} />
        </clipPath>

        <filter id="hcc-soft" x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="hcc-blur3" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="hcc-blur2" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="hcc-blur1" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <filter id="hcc-steam" x="-60%" y="-30%" width="220%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.045" numOctaves="3" seed="3" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="26" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="4" />
        </filter>
      </defs>

      <g transform="translate(31.35 -1) scale(0.81)">
        {/* saucer: shadow on the table, a thick underside below the front lip, then the dish */}
        <ellipse cx="170" cy="314" rx="120" ry="10" fill="#4A2F16" opacity="0.35" filter="url(#hcc-soft)" />
        {/* underside: a thin edge that tucks in towards the saucer's own foot ring */}
        <path d="M15 272 C 30 296, 95 311, 165 313 C 235 311, 300 296, 315 272 Z" fill="url(#hcc-saucer-under)" />
        <path d="M104 309 C 130 314, 200 314, 226 309" fill="none" stroke="#5E4528" strokeWidth="2" opacity="0.45" filter="url(#hcc-blur1)" />
        <ellipse cx="165" cy="272" rx="150" ry="31" fill="url(#hcc-saucer-top)" />
        {/* the lip: a lit edge at the front, a darker line just below it */}
        <path d="M20 280 C 66 305, 264 305, 310 280" fill="none" stroke="#FFFDF7" strokeWidth="2" opacity="0.75" filter="url(#hcc-blur1)" />
        <path d="M17 276 C 60 301, 270 301, 313 276" fill="none" stroke="#8E7350" strokeWidth="1" opacity="0.35" />
        {/* the dish: the inner slope falls away from the rim, lit at the back, in shade at the front */}
        <ellipse cx="165" cy="275" rx="118" ry="24" fill="#CDB38C" opacity="0.55" filter="url(#hcc-blur3)" />
        <path d="M50 268 C 92 244, 238 244, 280 268" fill="none" stroke="#FFF8EC" strokeWidth="5" opacity="0.6" filter="url(#hcc-blur2)" />
        <path d="M58 283 C 100 302, 230 302, 272 283" fill="none" stroke="#8C6E48" strokeWidth="5" opacity="0.45" filter="url(#hcc-blur2)" />
        {/* the flat well the cup stands in, with its edge */}
        <ellipse cx="165" cy="277" rx="94" ry="19" fill="#BFA37B" opacity="0.65" filter="url(#hcc-blur2)" />
        <path d="M74 272 C 110 255, 220 255, 256 272" fill="none" stroke="#F6ECDB" strokeWidth="1.6" opacity="0.6" filter="url(#hcc-blur1)" />
        {/* cast shadow of the cup, then the dark line where its base meets the saucer */}
        <ellipse cx="182" cy="285" rx="62" ry="10" fill="#3E2812" opacity="0.32" filter="url(#hcc-soft)" />
        <ellipse cx="166" cy="289" rx="44" ry="5" fill="#24150A" opacity="0.5" filter="url(#hcc-blur2)" />

        {/* handle, behind the body */}
        <path d="M250 168 C 306 152, 318 226, 236 241" fill="none" stroke="url(#hcc-handle)" strokeWidth="15" strokeLinecap="round" />
        <path d="M253 176 C 295 166, 302 221, 239 234" fill="none" stroke="#6F5534" strokeWidth="2" strokeLinecap="round" opacity="0.35" filter="url(#hcc-blur1)" />
        <path d="M250 168 C 306 152, 318 226, 236 241" transform="translate(-1.5 -3)" fill="none" stroke="#FFF8EC" strokeWidth="3" strokeLinecap="round" opacity="0.55" filter="url(#hcc-blur1)" />
        <ellipse cx="248" cy="172" rx="7" ry="9" fill="#6F5534" opacity="0.28" filter="url(#hcc-blur2)" />
        <ellipse cx="235" cy="237" rx="7" ry="8" fill="#6F5534" opacity="0.3" filter="url(#hcc-blur2)" />

        {/* foot ring standing in the saucer well */}
        <path d="M134 268 C 136 277, 132 282, 127 286 Q 165 294 203 286 C 198 282, 194 277, 196 268 Z" fill="url(#hcc-body)" />
        <path d="M134 268 C 136 277, 132 282, 127 286 Q 165 294 203 286 C 198 282, 194 277, 196 268 Z" fill="url(#hcc-foot)" />
        <path d="M128 285.5 Q 165 293 202 285.5" fill="none" stroke="#F6ECDB" strokeWidth="1.2" opacity="0.55" />

        {/* body: a deep bowl with a rounded bottom */}
        <g clipPath="url(#hcc-body-clip)">
          <rect x="60" y="136" width="210" height="150" fill="url(#hcc-body)" />
          <rect x="60" y="136" width="210" height="150" fill="url(#hcc-body-depth)" />
          <rect x="60" y="136" width="210" height="150" fill="url(#hcc-bounce)" />
          {/* the rim's own shadow just under the lip */}
          <ellipse cx="165" cy="162" rx="98" ry="14" fill="#5A3E22" opacity="0.14" filter="url(#hcc-blur2)" />
          {/* glaze: a broad sheen, a sharp window reflection, rim light on the right */}
          <path d="M98 172 C 100 210, 110 238, 130 258" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" opacity="0.42" filter="url(#hcc-blur2)" />
          <path d="M108 176 C 110 204, 117 228, 130 245" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
          <path d="M246 174 C 243 212, 232 238, 210 258" fill="none" stroke="#FFF1DC" strokeWidth="5" strokeLinecap="round" opacity="0.32" filter="url(#hcc-blur2)" />
          {/* light reflected up from the saucer onto the bottom of the bowl */}
          <path d="M116 266 C 132 277, 198 277, 214 266" fill="none" stroke="#F3E6CF" strokeWidth="5" opacity="0.4" filter="url(#hcc-blur2)" />
        </g>

        {/* rim, coffee and steam: drawn at y≈172 and lifted onto the taller bowl */}
        <g transform="translate(0 -24)">
        {/* rim, inner wall, coffee */}
        <ellipse cx="165" cy="172" rx="96" ry="21" fill="url(#hcc-lip)" />
        <ellipse cx="165" cy="173.5" rx="88.5" ry="17.5" fill="url(#hcc-inner)" />
        <path d="M77 172 C 92 158, 238 158, 253 172" fill="none" stroke="#8E7350" strokeWidth="1" opacity="0.45" />
        <ellipse cx="165" cy="178" rx="85" ry="14.5" fill="url(#hcc-coffee)" />
        <ellipse cx="138" cy="174" rx="30" ry="3.6" fill="#F2D6AE" opacity="0.26" filter="url(#hcc-blur2)" />
        <g mask="url(#hcc-ring)" clipPath="url(#hcc-front)">
          <ellipse cx="165" cy="172" rx="96" ry="21" fill="url(#hcc-lip)" />
        </g>
        <path d="M78 179 C 104 192, 140 194, 165 194" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.85" />

        {/* steam */}
        <g className="hero-steam-group" filter="url(#hcc-steam)" fill="#FFFFFF" stroke="none">
          <ellipse className="hero-steam" cx="146" cy="126" rx="16" ry="50" />
          <ellipse className="hero-steam hero-steam-2" cx="170" cy="110" rx="18" ry="60" />
          <ellipse className="hero-steam hero-steam-3" cx="193" cy="128" rx="14" ry="46" />
        </g>
        </g>
      </g>
    </svg>
  );
}
