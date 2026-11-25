import { type ReactNode, useId } from 'react';
import { SpiralGlyph, SuitIcon, ThreatGlyph } from './icons.tsx';
import { isobarPaths } from './isobars.ts';
import { Svg } from './Svg.tsx';

export type BackKind =
  | 'operative'
  | 'threat'
  | 'encrypted'
  | 'briefing'
  | 'outro'
  | 'flashback'
  | 'countermeasure'
  | 'jumpin';

export interface BackSpec {
  label: string;
  bg: string;
  accent: string;
  note?: string;
  /** Isobar storm parameters for this back. */
  storm: { cx: number; cy: number; seed: number; wobble: number; drift: number };
}

/** Back designs (colors match make_print.py BACKS so paper and screen agree). */
export const BACKS: Record<BackKind, BackSpec> = {
  operative: {
    label: 'Operative',
    bg: '#1d2433',
    accent: '#8c7ef0',
    storm: { cx: 315, cy: 400, seed: 3, wobble: 0.12, drift: 5 },
  },
  threat: {
    label: 'Threat',
    bg: '#2b2f3a',
    accent: '#a3aab8',
    storm: { cx: 470, cy: 160, seed: 21, wobble: 0.16, drift: 8 },
  },
  encrypted: {
    label: 'Encrypted',
    bg: '#0e5a6e',
    accent: '#7fc4d1',
    note: 'Enters the Scene Row face-down.',
    storm: { cx: 315, cy: 400, seed: 5, wobble: 0.08, drift: 3 },
  },
  briefing: {
    label: 'Briefing',
    bg: '#2d2560',
    accent: '#9c90e0',
    storm: { cx: 150, cy: 700, seed: 8, wobble: 0.14, drift: 7 },
  },
  outro: {
    label: 'Read after the episode',
    bg: '#1d2433',
    accent: '#d8b240',
    note: 'Don’t read until today’s episode is over.',
    storm: { cx: 315, cy: 820, seed: 13, wobble: 0.1, drift: 4 },
  },
  flashback: {
    label: 'Flashback',
    bg: '#3b1f4e',
    accent: '#d9a6f2',
    note: 'Set aside. Read only when its Conditioned Card awakens.',
    storm: { cx: 315, cy: 400, seed: 17, wobble: 0.28, drift: 10 },
  },
  countermeasure: {
    label: 'Countermeasure',
    bg: '#5c3b00',
    accent: '#f2c063',
    note: 'Set aside during setup. Enters when its Two-Phase Threat is cleared.',
    storm: { cx: 80, cy: 120, seed: 29, wobble: 0.13, drift: 9 },
  },
  jumpin: {
    label: 'Prototype jump-in',
    bg: '#4a4f5a',
    accent: '#c7ccd6',
    storm: { cx: 560, cy: 780, seed: 31, wobble: 0.12, drift: 6 },
  },
};

const W = 630;
const H = 880;
const EY = 382; // emblem center

function Emblem({ kind, accent }: { kind: BackKind; accent: string }) {
  const glyph = (node: ReactNode, size = 150) => (
    <g transform={`translate(${W / 2 - size / 2} ${EY - size / 2})`} color={accent}>
      {node}
    </g>
  );
  switch (kind) {
    case 'operative':
      return (
        <g>
          <g transform={`translate(${W / 2 - 42} ${EY - 98})`} color="#5ccbe0">
            <SuitIcon suit="Recon" size={84} />
          </g>
          <g transform={`translate(${W / 2 - 98} ${EY + 4})`} color="#a99cf5">
            <SuitIcon suit="Stealth" size={84} />
          </g>
          <g transform={`translate(${W / 2 + 14} ${EY + 4})`} color="#ff7a6b">
            <SuitIcon suit="Force" size={84} />
          </g>
        </g>
      );
    case 'threat':
      return glyph(<ThreatGlyph kind="threat" size={150} />);
    case 'encrypted':
      return glyph(<ThreatGlyph kind="encrypted" size={150} style={{ ['--glyph-cut' as string]: '#0e5a6e' }} />);
    case 'countermeasure':
      return glyph(<ThreatGlyph kind="countermeasure" size={150} />);
    case 'flashback':
      return glyph(<SpiralGlyph size={160} />, 160);
    case 'briefing':
      return (
        <g transform={`translate(${W / 2} ${EY})`} fill="none" stroke={accent} strokeWidth="7" strokeLinejoin="round">
          <path d="M-66 -78h96l36 36v120h-132Z" />
          <path d="M30 -78v36h36" />
          <path d="M-42 -30h60M-42 -4h84M-42 22h84M-42 48h50" strokeLinecap="round" />
          <rect x="-48" y="-62" width="44" height="18" fill={accent} stroke="none" />
        </g>
      );
    case 'outro':
      return (
        <g transform={`translate(${W / 2} ${EY})`}>
          <path d="M-84 -50h168v110h-168Z" fill="none" stroke={accent} strokeWidth="7" strokeLinejoin="round" />
          <path d="M-84 -50 0 18 84 -50" fill="none" stroke={accent} strokeWidth="7" strokeLinejoin="round" />
          <circle cx="0" cy="22" r="30" fill="#a8322a" stroke={accent} strokeWidth="5" />
          <path
            d="M-9 8 3 22-9 36M5 8l12 14-12 14"
            fill="none"
            stroke={accent}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'jumpin':
      return (
        <g
          transform={`translate(${W / 2} ${EY})`}
          fill="none"
          stroke={accent}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M-70 -54 -16 0-70 54M-6 -54 48 0-6 54" />
          <path d="M70 -54v108" />
        </g>
      );
  }
}

function Texture({ kind, accent, id }: { kind: BackKind; accent: string; id: string }) {
  switch (kind) {
    case 'encrypted':
      return (
        <>
          <pattern id={`${id}-p`} width="36" height="36" patternUnits="userSpaceOnUse">
            <rect x="4" y="4" width="10" height="10" fill={accent} opacity="0.13" />
            <rect x="22" y="22" width="10" height="10" fill={accent} opacity="0.07" />
            <rect x="22" y="4" width="10" height="10" fill={accent} opacity="0.03" />
          </pattern>
          <rect width={W} height={H} fill={`url(#${id}-p)`} />
        </>
      );
    case 'threat':
    case 'countermeasure':
      return (
        <>
          <pattern id={`${id}-p`} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <rect width="9" height="28" fill={accent} opacity="0.06" />
          </pattern>
          <rect width={W} height={H} fill={`url(#${id}-p)`} />
        </>
      );
    case 'briefing':
      return (
        <>
          <pattern id={`${id}-p`} width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M0 29.5H30" stroke={accent} strokeOpacity="0.1" strokeWidth="1.5" />
          </pattern>
          <rect width={W} height={H} fill={`url(#${id}-p)`} />
        </>
      );
    default:
      return null;
  }
}

export interface CardBackArtProps {
  kind: BackKind;
  title?: string | undefined;
  className?: string | undefined;
}

/** Full-bleed card back illustration (63:88). Text is overlaid by <CardBack> in HTML. */
export function CardBackArt({ kind, title, className }: CardBackArtProps) {
  const id = useId().replace(/:/g, '');
  const spec = BACKS[kind];
  const rings = isobarPaths({
    cx: spec.storm.cx,
    cy: spec.storm.cy,
    rings: 16,
    rMin: 26,
    rMax: 720,
    seed: spec.storm.seed,
    wobble: spec.storm.wobble,
    drift: spec.storm.drift,
    squash: 0.92,
  });
  return (
    <Svg
      title={title}
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`${id}-g`} cx="50%" cy="44%" r="75%">
          <stop offset="0" stopColor={spec.accent} stopOpacity="0.28" />
          <stop offset="0.45" stopColor={spec.bg} stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
        <clipPath id={`${id}-c`}>
          <rect x="34" y="34" width={W - 68} height={H - 68} rx="22" />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill={spec.bg} />
      <rect width={W} height={H} fill={`url(#${id}-g)`} />
      <Texture kind={kind} accent={spec.accent} id={id} />
      <g clipPath={`url(#${id}-c)`} fill="none" stroke={spec.accent} strokeWidth="2.2">
        {rings.map((d, i) => (
          <path key={d} d={d} opacity={0.34 - i * 0.012} />
        ))}
      </g>
      <rect x="34" y="34" width={W - 68} height={H - 68} rx="22" fill="none" stroke={spec.accent} strokeWidth="4" />
      <rect
        x="50"
        y="50"
        width={W - 100}
        height={H - 100}
        rx="12"
        fill="none"
        stroke={spec.accent}
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      {/* registration ticks */}
      <g stroke={spec.accent} strokeWidth="4" strokeLinecap="round">
        <path d="M70 92V70h22M538 70h22v22M560 788v22h-22M92 810H70v-22" fill="none" />
      </g>
      <circle cx={W / 2} cy={EY} r="128" fill={spec.bg} fillOpacity="0.88" stroke={spec.accent} strokeWidth="4" />
      <circle
        cx={W / 2}
        cy={EY}
        r="142"
        fill="none"
        stroke={spec.accent}
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="4 8"
      />
      <Emblem kind={kind} accent={spec.accent} />
    </Svg>
  );
}
