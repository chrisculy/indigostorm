import type { ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'recon'
  | 'stealth'
  | 'force'
  | 'lead'
  | 'exposure'
  | 'success'
  | 'warning'
  | 'danger';

/** Small status label. Pass an icon so the tone color is never the only signal. */
export function Badge({
  tone = 'neutral',
  icon,
  solid,
  children,
  className,
}: {
  tone?: BadgeTone | undefined;
  icon?: ReactNode;
  /** Filled background instead of tinted. */
  solid?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span className={className ? `badge ${className}` : 'badge'} data-tone={tone} data-solid={solid || undefined}>
      {icon && <span className="badge__icon">{icon}</span>}
      {children}
    </span>
  );
}
