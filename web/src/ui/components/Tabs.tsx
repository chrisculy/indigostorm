import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean | undefined;
}

export interface TabsProps {
  items: TabItem[];
  /** Accessible name of the tab list. */
  label: string;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((id: string) => void) | undefined;
  className?: string | undefined;
}

/** WAI-ARIA tabs with roving focus (←/→, Home/End) and automatic activation. */
export function Tabs({ items, label, value, defaultValue, onChange, className }: TabsProps) {
  const base = useId();
  const [own, setOwn] = useState(defaultValue ?? items[0]?.id ?? '');
  const current = value ?? own;
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const enabled = items.filter((t) => !t.disabled);
  const select = (id: string, focus = false) => {
    setOwn(id);
    onChange?.(id);
    if (focus) refs.current.get(id)?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = enabled.findIndex((t) => t.id === current);
    let next: TabItem | undefined;
    if (e.key === 'ArrowRight') next = enabled[(i + 1) % enabled.length];
    else if (e.key === 'ArrowLeft') next = enabled[(i - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next) {
      e.preventDefault();
      select(next.id, true);
    }
  };
  return (
    <div className={className ? `tabs ${className}` : 'tabs'}>
      <div role="tablist" aria-label={label} className="tabs__list" onKeyDown={onKey}>
        {items.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              if (el) refs.current.set(t.id, el);
              else refs.current.delete(t.id);
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-controls={`${base}-panel-${t.id}`}
            aria-selected={t.id === current}
            tabIndex={t.id === current ? 0 : -1}
            disabled={t.disabled}
            className="tabs__tab"
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={t.id !== current}
          className="tabs__panel"
        >
          {t.id === current && t.content}
        </div>
      ))}
    </div>
  );
}
