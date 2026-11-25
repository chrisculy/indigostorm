import { type ReactNode, useId } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

/** Single-choice segmented control built on native radio inputs (arrow keys work natively). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
}) {
  const name = useId();
  return (
    <fieldset className={className ? `segmented ${className}` : 'segmented'} data-size={size}>
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label key={o.value} className="segmented__opt" data-checked={o.value === value || undefined}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          {o.icon && <span className="segmented__icon">{o.icon}</span>}
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** On/off switch (button role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <span className="switch-row">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
      <span className="switch-row__text">
        <span id={`${id}-l`} className="switch-row__label">
          {label}
        </span>
        {description && (
          <span id={`${id}-d`} className="switch-row__desc">
            {description}
          </span>
        )}
      </span>
    </span>
  );
}
