import { type CSSProperties, type ReactNode, useId } from 'react';

export interface ArtProps {
  /** Accessible name. Without it the graphic is decorative (aria-hidden). */
  title?: string | undefined;
  className?: string | undefined;
  /** Width/height (number = px). Defaults to 1em so icons follow the font size. With only `width`, the height follows the viewBox aspect ratio. */
  size?: number | string | undefined;
  style?: CSSProperties | undefined;
}

interface SvgProps extends ArtProps {
  viewBox?: string;
  width?: number | string | undefined;
  height?: number | string | undefined;
  children: ReactNode;
  preserveAspectRatio?: string;
}

/** Shared <svg> wrapper: labelled image when `title` is given, otherwise hidden from assistive tech. */
export function Svg({
  title,
  className,
  size = '1em',
  width,
  height,
  style,
  viewBox = '0 0 24 24',
  children,
  preserveAspectRatio,
}: SvgProps) {
  const id = useId();
  const cls = className ? `art ${className}` : 'art';
  if (title) {
    return (
      <svg
        viewBox={viewBox}
        width={width ?? size}
        height={height ?? (width === undefined ? size : undefined)}
        className={cls}
        style={style}
        role="img"
        aria-labelledby={id}
        focusable="false"
        preserveAspectRatio={preserveAspectRatio}
      >
        <title id={id}>{title}</title>
        {children}
      </svg>
    );
  }
  return (
    <svg
      viewBox={viewBox}
      width={width ?? size}
      height={height ?? (width === undefined ? size : undefined)}
      className={cls}
      style={style}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio={preserveAspectRatio}
    >
      {children}
    </svg>
  );
}
