import type { ReactNode } from 'react';
import { useGame } from '../../state/store.ts';
import { Logo, UiIcon } from '../art/index.ts';
import { Button } from '../components/index.ts';

/** Shared chrome for menu screens: logo, title, back button, centered content column. */
export function ScreenFrame({
  title,
  subtitle,
  children,
  actions,
  onBack,
  backLabel = 'Back',
  wide,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onBack?: (() => void) | undefined;
  backLabel?: string;
  wide?: boolean;
}) {
  const back = useGame((s) => s.back);
  const go = useGame((s) => s.go);
  return (
    <div className="screen" data-wide={wide || undefined}>
      <header className="screen__bar">
        <Button variant="ghost" size="sm" icon={<UiIcon name="chevron-left" />} onClick={onBack ?? back}>
          {backLabel}
        </Button>
        <button
          type="button"
          className="screen__brand"
          onClick={() => go('title')}
          aria-label="Indigo Storm: title screen"
        >
          <Logo variant="mark" size="1.75em" />
          <span className="screen__brand-name">Indigo Storm</span>
        </button>
        <div className="screen__actions">{actions}</div>
      </header>
      <main className="screen__main" id="main">
        <div className="screen__head">
          <h1 className="screen__title">{title}</h1>
          {subtitle && <p className="screen__subtitle">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
