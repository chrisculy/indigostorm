import type { PerkInfo, Suit } from '../../data/types.ts';
import { type ArtProps, Svg } from './Svg.tsx';

/* ------------------------------------------------------------------ suits */

/** Suit shapes: Recon = eye, Stealth = crescent, Force = bolt. Drawn in currentColor. */
export function SuitIcon({ suit, ...rest }: ArtProps & { suit: Suit }) {
  return (
    <Svg {...rest}>
      {suit === 'Recon' && (
        <>
          <path
            d="M1.6 12C4.6 6.9 8.1 5.2 12 5.2s7.4 1.7 10.4 6.8c-3 5.1-6.5 6.8-10.4 6.8S4.6 17.1 1.6 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3.9" fill="currentColor" />
        </>
      )}
      {suit === 'Stealth' && (
        <path d="M11.24 2.53A9.5 9.5 0 1 0 21.16 14.53A7.8 7.8 0 0 1 11.24 2.53Z" fill="currentColor" />
      )}
      {suit === 'Force' && (
        <path d="M13.6 1.6 5.9 12.8h5.3l-2 9.6 8.9-12.3h-5.3l2.4-8.5Z" fill="currentColor" strokeLinejoin="round" />
      )}
    </Svg>
  );
}

/* ------------------------------------------------------------------ stars */

const STAR = 'M12 2.2l2.83 6.08 6.67.78-4.93 4.56 1.3 6.58L12 16.9l-5.87 3.3 1.3-6.58L2.5 9.06l6.67-.78L12 2.2Z';

export function StarIcon({ filled = false, ...rest }: ArtProps & { filled?: boolean | undefined }) {
  return (
    <Svg {...rest} className={rest.className ? `star-icon ${rest.className}` : 'star-icon'}>
      <path
        d={STAR}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 1 : 1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ track pips */

export type PipState = 'empty' | 'filled' | 'target' | 'redline' | 'threshold';

/** One track position marker. Shapes differ per state so color is not the only signal. */
export function Pip({ state = 'empty', ...rest }: ArtProps & { state?: PipState | undefined }) {
  return (
    <Svg {...rest} viewBox="0 0 16 16">
      {state === 'empty' && <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {state === 'filled' && <circle cx="8" cy="8" r="6" fill="currentColor" />}
      {state === 'target' && (
        <>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="8" cy="8" r="2.6" fill="currentColor" />
        </>
      )}
      {state === 'threshold' && <path d="M8 2l6 6-6 6-6-6 6-6Z" fill="none" stroke="currentColor" strokeWidth="1.6" />}
      {state === 'redline' && (
        <>
          <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" />
          <path d="M5 5l6 6M11 5l-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

/* ------------------------------------------------------------------ track glyphs */

/** Lead: a forward-pointing chevron through a ring (progress on the trail). */
export function LeadIcon(props: ArtProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9.5 7.5 14 12l-4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Exposure: broadcast arcs radiating from a point (you are being seen). */
export function ExposureIcon(props: ArtProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="15" r="2.4" fill="currentColor" />
      <path
        d="M7.8 10.6a6 6 0 0 1 8.4 0M4.9 7.7a10 10 0 0 1 14.2 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 17.4V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function DrawIcon(props: ArtProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="11" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 3h9a2 2 0 0 1 2 2v12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 10v5M7 12.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ threat-type badges */

export type BadgeKind = 'threat' | 'encrypted' | 'pursuer' | 'twophase' | 'countermeasure' | 'blocker';

/** Threat-type glyphs: hazard, lock, crosshair, chain, shield, no-entry. */
export function ThreatGlyph({ kind, ...rest }: ArtProps & { kind: BadgeKind }) {
  return (
    <Svg {...rest}>
      {kind === 'threat' && (
        <>
          <path d="M12 2.8 22 20H2L12 2.8Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 9v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1.3" fill="currentColor" />
        </>
      )}
      {kind === 'encrypted' && (
        <>
          <path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <rect x="4.5" y="10.5" width="15" height="11" rx="2" fill="currentColor" />
          <circle cx="12" cy="15" r="1.7" fill="var(--glyph-cut, #fff)" />
          <path d="M12 15.5v3" stroke="var(--glyph-cut, #fff)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {kind === 'pursuer' && (
        <>
          <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </>
      )}
      {kind === 'twophase' && (
        <>
          <rect x="1.8" y="7.2" width="12" height="9.6" rx="4.8" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <rect x="10.2" y="7.2" width="12" height="9.6" rx="4.8" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </>
      )}
      {kind === 'countermeasure' && (
        <>
          <path
            d="M12 1.8 20.5 5v6.4c0 5.1-3.5 9-8.5 10.8C7 20.4 3.5 16.5 3.5 11.4V5L12 1.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M8 11.5l4-3 4 3M8 15.5l4-3 4 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {kind === 'blocker' && (
        <>
          <path
            d="M8.1 2h7.8L22 8.1v7.8L15.9 22H8.1L2 15.9V8.1L8.1 2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M6.5 12h11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

/* ------------------------------------------------------------------ perk branches */

export type Branch = PerkInfo['branch'];

/** Branch emblems: GHOST = dissolving diamond with crescent, ANALYST = hex network, OPERATIVE = shield chevrons. */
export function PerkEmblem({ branch, ...rest }: ArtProps & { branch: Branch }) {
  return (
    <Svg {...rest} viewBox="0 0 48 48">
      {branch === 'GHOST' && (
        <>
          <path
            d="M24 3 45 24 24 45 3 24 24 3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeDasharray="6 3.5"
            strokeLinejoin="round"
          />
          <path d="M22.4 12.5A11.5 11.5 0 1 0 35.6 27.4 9.2 9.2 0 0 1 22.4 12.5Z" fill="currentColor" />
        </>
      )}
      {branch === 'ANALYST' && (
        <>
          <path
            d="M24 3.5 41.8 13.75v20.5L24 44.5 6.2 34.25v-20.5L24 3.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M24 15 15 30h18L24 15Zm0 0v-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="15" r="3.4" fill="currentColor" />
          <circle cx="15" cy="30" r="3.4" fill="currentColor" />
          <circle cx="33" cy="30" r="3.4" fill="currentColor" />
          <circle cx="24" cy="25" r="1.8" fill="currentColor" />
        </>
      )}
      {branch === 'OPERATIVE' && (
        <>
          <path
            d="M24 3 41 9v13c0 10.5-7 18.2-17 22.6C14 40.2 7 32.5 7 22V9l17-6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M15 19l9-6 9 6M15 27l9-6 9 6M15 35l9-6 9 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </Svg>
  );
}

/* ------------------------------------------------------------------ class glyphs (Gear, Ally, Training) */

export function GearGlyph(props: ArtProps) {
  return (
    <Svg {...props}>
      <path
        d="M14.7 3.3a5 5 0 0 0-6 6.4L3 15.4a2 2 0 0 0 0 2.8l2.8 2.8a2 2 0 0 0 2.8 0l5.7-5.7a5 5 0 0 0 6.4-6l-3.1 3.1-3.2-.9-.9-3.2 3.2-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AllyGlyph(props: ArtProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M2.5 20c.6-3.7 3.2-6 6.5-6s5.9 2.3 6.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="7.5" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M17 13.2c2.5.3 4.2 2.3 4.6 5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Flashback spiral (Conditioned / Awakened). */
export function SpiralGlyph(props: ArtProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 12.2c0-.9.9-1.4 1.7-1 1.4.7 1.2 2.9-.2 3.6-2 1-4.3-.5-4.4-2.7-.2-3 2.8-5 5.6-4.4 3.8.8 5.4 5.3 3.6 8.6-2.1 3.9-7.4 4.9-10.8 2.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ UI glyphs */

export type UiIconName =
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'flip'
  | 'info'
  | 'check'
  | 'zoom'
  | 'sun'
  | 'moon'
  | 'contrast'
  | 'menu'
  | 'book'
  | 'play';

export function UiIcon({ name, ...rest }: ArtProps & { name: UiIconName }) {
  const s = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg {...rest}>
      {name === 'close' && <path d="M6 6l12 12M18 6 6 18" {...s} />}
      {name === 'chevron-left' && <path d="M15 5l-7 7 7 7" {...s} />}
      {name === 'chevron-right' && <path d="M9 5l7 7-7 7" {...s} />}
      {name === 'flip' && (
        <>
          <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.6" {...s} />
          <path d="M20 3.5v5.1h-5.1" {...s} />
          <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.4" {...s} />
          <path d="M4 20.5v-5.1h5.1" {...s} />
        </>
      )}
      {name === 'info' && (
        <>
          <circle cx="12" cy="12" r="9" {...s} />
          <path d="M12 11v6" {...s} />
          <circle cx="12" cy="7.6" r="1.2" fill="currentColor" />
        </>
      )}
      {name === 'check' && <path d="M4.5 12.5l5 5L19.5 7" {...s} strokeWidth={2.4} />}
      {name === 'zoom' && (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" {...s} />
          <path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" {...s} />
        </>
      )}
      {name === 'sun' && (
        <>
          <circle cx="12" cy="12" r="4" {...s} />
          <path
            d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
            {...s}
          />
        </>
      )}
      {name === 'moon' && <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" {...s} />}
      {name === 'contrast' && (
        <>
          <circle cx="12" cy="12" r="9" {...s} />
          <path d="M12 3a9 9 0 0 1 0 18V3Z" fill="currentColor" />
        </>
      )}
      {name === 'menu' && <path d="M4 7h16M4 12h16M4 17h16" {...s} />}
      {name === 'book' && (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" {...s} />
          <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" {...s} />
        </>
      )}
      {name === 'play' && <path d="M7 4.5v15l12-7.5-12-7.5Z" {...s} fill="currentColor" />}
    </Svg>
  );
}
