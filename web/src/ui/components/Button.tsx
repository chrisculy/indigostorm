import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Kbd } from './Kbd.tsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Icon before the label. */
  icon?: ReactNode;
  /** Icon after the label. */
  iconEnd?: ReactNode;
  /** Keyboard shortcut hint shown at the end (e.g. "Enter"). Not announced twice: add aria-keyshortcuts yourself if wanted. */
  kbd?: string | undefined;
  /** Full width. */
  block?: boolean | undefined;
  ref?: Ref<HTMLButtonElement> | undefined;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconEnd,
  kbd,
  block,
  className,
  children,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={['btn', className].filter(Boolean).join(' ')}
      data-variant={variant}
      data-size={size}
      data-block={block || undefined}
      {...rest}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      {children !== undefined && <span className="btn__label">{children}</span>}
      {iconEnd && <span className="btn__icon">{iconEnd}</span>}
      {kbd && <Kbd className="btn__kbd">{kbd}</Kbd>}
    </button>
  );
}
