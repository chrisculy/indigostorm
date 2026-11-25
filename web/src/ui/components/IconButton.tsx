import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import type { ButtonSize, ButtonVariant } from './Button.tsx';
import { Tooltip } from './Tooltip.tsx';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name (required: the button has no visible text). */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Show the label as a tooltip on hover/focus. Default true. */
  tooltip?: boolean | undefined;
  ref?: Ref<HTMLButtonElement> | undefined;
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  tooltip = true,
  className,
  type = 'button',
  ref,
  ...rest
}: IconButtonProps) {
  const btn = (
    <button
      ref={ref}
      type={type}
      className={['btn', 'btn--icon', className].filter(Boolean).join(' ')}
      data-variant={variant}
      data-size={size}
      aria-label={label}
      {...rest}
    >
      <span className="btn__icon">{icon}</span>
    </button>
  );
  return tooltip ? (
    <Tooltip content={label} describe={false}>
      {btn}
    </Tooltip>
  ) : (
    btn
  );
}
