import { useId } from 'react';
import { isobarPaths } from './isobars.ts';
import { type ArtProps, Svg } from './Svg.tsx';

const W = 640;
const H = 360;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Building {
  x: number;
  w: number;
  h: number;
  windows: { x: number; y: number; lit: 0 | 1 | 2 }[];
}

function skyline(
  seed: number,
  base: number,
  minH: number,
  maxH: number,
  minW: number,
  maxW: number,
  windows: boolean,
): Building[] {
  const r = rng(seed);
  const out: Building[] = [];
  let x = -10;
  while (x < W + 10) {
    const w = minW + r() * (maxW - minW);
    const h = minH + r() ** 1.6 * (maxH - minH);
    const win: Building['windows'] = [];
    if (windows) {
      for (let wy = base - h + 10; wy < base - 12; wy += 13) {
        for (let wx = x + 6; wx < x + w - 8; wx += 10) {
          const v = r();
          if (v > 0.93) win.push({ x: wx, y: wy, lit: v > 0.992 ? 2 : 1 });
        }
      }
    }
    out.push({ x, w, h, windows: win });
    x += w + (r() < 0.3 ? 4 + r() * 10 : 0);
  }
  return out;
}

const ACT1_FAR = skyline(4, 270, 40, 120, 26, 54, false);
const ACT1_NEAR = skyline(9, 300, 30, 190, 34, 70, true);
const ACT1_STORM = isobarPaths({
  cx: 470,
  cy: 30,
  rings: 10,
  rMin: 14,
  rMax: 300,
  seed: 41,
  wobble: 0.16,
  drift: 5,
  squash: 0.55,
});
const ACT2_EYE = isobarPaths({
  cx: 320,
  cy: 118,
  rings: 9,
  rMin: 10,
  rMax: 230,
  seed: 42,
  wobble: 0.1,
  drift: 2,
  squash: 0.62,
});
const ACT3_STORM = isobarPaths({
  cx: 320,
  cy: 250,
  rings: 11,
  rMin: 18,
  rMax: 420,
  seed: 43,
  wobble: 0.12,
  drift: 4,
  squash: 0.45,
});
const EMBERS = (() => {
  const r = rng(77);
  return Array.from({ length: 34 }, () => ({ x: r() * W, y: 120 + r() * 200, s: 0.8 + r() * 1.8, o: 0.3 + r() * 0.6 }));
})();

function Act1({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070818" />
          <stop offset="0.5" stopColor="#241f63" />
          <stop offset="0.85" stopColor="#1d5a72" />
        </linearGradient>
        <pattern id={`${id}-rain`} width="14" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
          <path d="M7 0v16" stroke="#cfd8ff" strokeOpacity="0.16" strokeWidth="1" />
        </pattern>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <g fill="none" stroke="#9c90e0" strokeWidth="1.3">
        {ACT1_STORM.map((d, i) => (
          <path key={d} d={d} opacity={0.4 - i * 0.03} />
        ))}
      </g>
      <path
        d="M452 0 432 58 448 60 404 150 420 152 386 226"
        fill="none"
        stroke="#e8fdff"
        strokeWidth="2.6"
        strokeLinejoin="round"
        filter={`url(#${id}-glow)`}
      />
      <path d="M432 58 470 96 466 112" fill="none" stroke="#bdf6ff" strokeWidth="1.3" opacity="0.8" />
      <g fill="#1a2050">
        {ACT1_FAR.map((b) => (
          <rect key={`f${b.x}`} x={b.x} y={270 - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      <g fill="#0a0c1e">
        {ACT1_NEAR.map((b) => (
          <rect key={`n${b.x}`} x={b.x} y={300 - b.h} width={b.w} height={b.h + 60} />
        ))}
      </g>
      <g>
        {ACT1_NEAR.flatMap((b) =>
          b.windows.map((w) => (
            <rect
              key={`w${w.x}-${w.y}`}
              x={w.x}
              y={w.y}
              width="5"
              height="7"
              fill={w.lit === 2 ? '#f2c063' : '#3de3f5'}
              opacity={w.lit === 2 ? 1 : 0.55}
            />
          )),
        )}
      </g>
      <rect width={W} height={H} fill={`url(#${id}-rain)`} />
      <rect y="300" width={W} height="60" fill="#070818" />
      <path d="M0 300H640" stroke="#3de3f5" strokeOpacity="0.25" />
    </>
  );
}

function Act2({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c0a24" />
          <stop offset="0.7" stopColor="#3b2a7a" />
          <stop offset="1" stopColor="#4b3b9a" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3de3f5" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3de3f5" stopOpacity="0" />
        </linearGradient>
        <pattern id={`${id}-scan`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" opacity="0.18" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <g fill="none" stroke="#c5bcff" strokeWidth="1.4">
        {ACT2_EYE.map((d, i) => (
          <path key={d} d={d} opacity={0.75 - i * 0.07} />
        ))}
      </g>
      <path
        d="M262 118c18-26 38-36 58-36s40 10 58 36c-18 26-38 36-58 36s-40-10-58-36Z"
        fill="#0c0a24"
        stroke="#3de3f5"
        strokeWidth="2.4"
      />
      <circle cx="320" cy="118" r="15" fill="#3de3f5" />
      <circle cx="320" cy="118" r="6" fill="#0c0a24" />
      <path d="M150 360 236 236 262 236 230 360Z" fill={`url(#${id}-beam)`} />
      <path d="M470 360 404 230 426 230 520 360Z" fill={`url(#${id}-beam)`} />
      <g fill="#0a0b1c">
        <path d="M40 360V268h120v-22h70v22h180v-40h60v40h130v92Z" />
        <rect x="470" y="150" width="6" height="80" />
        <path d="M473 150 455 206h36Z" fill="none" stroke="#0a0b1c" strokeWidth="3" />
      </g>
      <circle cx="473" cy="148" r="3.5" fill="#ff5a4a" />
      <g fill="#3de3f5" opacity="0.45">
        {Array.from({ length: 22 }, (_, i) => i).map((i) => (
          <rect key={`a${i}`} x={60 + i * 24} y="286" width="12" height="4" opacity={i % 5 === 2 ? 1 : 0.4} />
        ))}
        {Array.from({ length: 22 }, (_, i) => i).map((i) => (
          <rect key={`b${i}`} x={60 + i * 24} y="304" width="12" height="4" opacity={i % 7 === 3 ? 1 : 0.3} />
        ))}
      </g>
      <g stroke="#0a0b1c" strokeWidth="2">
        <path d="M0 330H640" />
        {Array.from({ length: 33 }, (_, i) => i).map((i) => (
          <path key={`fence${i}`} d={`M${i * 20} 318V360`} />
        ))}
      </g>
      <rect width={W} height={H} fill={`url(#${id}-scan)`} />
    </>
  );
}

function Act3({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12060f" />
          <stop offset="0.5" stopColor="#5c1a1e" />
          <stop offset="0.72" stopColor="#c4522a" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="50%" cy="100%" r="60%">
          <stop offset="0" stopColor="#f2c063" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f2c063" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <g fill="none" stroke="#ffb199" strokeWidth="1.2">
        {ACT3_STORM.map((d, i) => (
          <path key={d} d={d} opacity={0.32 - i * 0.025} />
        ))}
      </g>
      <ellipse cx="320" cy="252" rx="220" ry="90" fill={`url(#${id}-sun)`} />
      <g fill="none" stroke="#fff4e6" strokeLinejoin="round" filter={`url(#${id}-glow)`}>
        <path d="M120 0 136 60 116 64 150 150 132 152 160 232" strokeWidth="2.4" />
        <path d="M548 0 532 46 548 50 520 120 536 122 512 190" strokeWidth="2" />
      </g>
      <path d="M0 252H640V360H0Z" fill="#0b0710" />
      <path d="M300 252h40l170 108H130Z" fill="#1c1218" />
      <g stroke="#f2c063" strokeWidth="3" opacity="0.8">
        <path d="M319 262v6M318 280v10M316 306v16M314 338v22" />
      </g>
      <g fill="#0b0710">
        <path d="M0 252h30v-18h14v-10h10v28h40v-12h20v12h50l6-8 6 8h-176Z" />
        <path d="M640 252h-60v-24h-8v-12h-6v36h-40v-16h-24v16h-30Z" />
      </g>
      <g fill="none" stroke="#ff7a6b" strokeWidth="2" opacity="0.85">
        <circle cx="320" cy="244" r="38" />
        <circle cx="320" cy="244" r="4" fill="#ff7a6b" />
        <path d="M320 196v26M320 266v26M272 244h26M342 244h26" />
      </g>
      <g fill="#f2c063">
        {EMBERS.map((e) => (
          <circle key={`${e.x}-${e.y}`} cx={e.x} cy={e.y} r={e.s} opacity={e.o} />
        ))}
      </g>
    </>
  );
}

export interface ActIllustrationProps extends ArtProps {
  act: 1 | 2 | 3;
}

/** Geometric storm scenes for the three acts (16:9). I: city in the rain, II: the facility, III: burn notice. */
export function ActIllustration({ act, title, className, style }: ActIllustrationProps) {
  const id = useId().replace(/:/g, '');
  return (
    <Svg
      title={title}
      className={className ? `act-art ${className}` : 'act-art'}
      style={style}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      {act === 1 && <Act1 id={id} />}
      {act === 2 && <Act2 id={id} />}
      {act === 3 && <Act3 id={id} />}
    </Svg>
  );
}
