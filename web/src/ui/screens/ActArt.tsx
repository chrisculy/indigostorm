import { cloneElement } from 'react';
import { ActIllustration } from '../art/index.ts';

/**
 * The act scene, sized by CSS. Workaround: ActIllustration renders <svg height="auto">, which is
 * not a valid SVG length (Chrome logs a console error), so the height attribute is replaced.
 */
export function ActArt({ act }: { act: 1 | 2 | 3 }) {
  const el = ActIllustration({ act });
  return cloneElement(el, { height: '100%' });
}
