import { useId } from 'react';
import { isobarPaths } from './isobars.ts';
import { type ArtProps, Svg } from './Svg.tsx';

const RINGS = isobarPaths({ cx: 32, cy: 33, rings: 5, rMin: 4.5, rMax: 27, seed: 11, wobble: 0.16, drift: 0.6 });
const BOLT = 'M37.5 4 20.5 34.5h10.2L25.2 60 45 26.5H34.4L41.6 4Z';

function Mark({ gid }: { gid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${gid}-bolt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8fdff" />
          <stop offset="0.55" stopColor="var(--logo-bolt, #3de3f5)" />
          <stop offset="1" stopColor="#6d5fd0" />
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="29" fill="var(--logo-field, #161a3d)" />
      <g clipPath={`url(#${gid}-clip)`} fill="none" stroke="var(--logo-rings, #9c90e0)" strokeWidth="1.2">
        {RINGS.map((d, i) => (
          <path key={d} d={d} opacity={0.35 + i * 0.12} />
        ))}
      </g>
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path
        d={BOLT}
        fill="var(--logo-field, #161a3d)"
        stroke="var(--logo-field, #161a3d)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d={BOLT} fill={`url(#${gid}-bolt)`} />
    </g>
  );
}

export interface LogoProps extends ArtProps {
  variant?: 'full' | 'stacked' | 'mark' | undefined;
}

/** "INDIGO STORM" wordmark with the storm-eye + lightning mark. Uses currentColor for the type. */
export function Logo({ variant = 'full', title = 'Indigo Storm', size, ...rest }: LogoProps) {
  const gid = useId().replace(/:/g, '');
  if (variant === 'mark') {
    return (
      <Svg {...rest} title={title} size={size ?? '2em'} viewBox="0 0 64 64">
        <Mark gid={gid} />
      </Svg>
    );
  }
  if (variant === 'stacked') {
    return (
      <Svg {...rest} title={title} width={size ?? '10em'} viewBox="0 0 220 176">
        <g transform="translate(70 0) scale(1.25)">
          <Mark gid={gid} />
        </g>
        <text
          x="110"
          y="128"
          textAnchor="middle"
          fill="currentColor"
          fontSize="44"
          fontWeight="600"
          letterSpacing="5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          INDIGO
        </text>
        <text
          x="110"
          y="170"
          textAnchor="middle"
          fill="currentColor"
          fontSize="44"
          fontWeight="600"
          letterSpacing="5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          STORM
        </text>
      </Svg>
    );
  }
  return (
    <Svg {...rest} title={title} width={size ?? '16em'} viewBox="0 0 330 64">
      <Mark gid={gid} />
      <text
        x="78"
        y="47"
        fill="currentColor"
        fontSize="40"
        fontWeight="600"
        letterSpacing="5"
        textLength="250"
        lengthAdjust="spacing"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        INDIGO STORM
      </text>
    </Svg>
  );
}
