// Small seeded PRNG (sfc32) with a serializable state. No Math.random anywhere in the engine.

import type { RngState } from './types.ts';

/** Expand a numeric seed into an sfc32 state with splitmix32. */
export function seedRng(seed: number): RngState {
  let x = seed >>> 0;
  const next = (): number => {
    x = (x + 0x9e3779b9) >>> 0;
    let z = x;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  const s: RngState = [next(), next(), next(), next()];
  // Warm up.
  for (let i = 0; i < 12; i++) nextUint32(s);
  return s;
}

/** Advance the state in place and return a uint32. */
export function nextUint32(s: RngState): number {
  let [a, b, c, d] = s;
  const t = (((a + b) >>> 0) + d) >>> 0;
  d = (d + 1) >>> 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) >>> 0;
  c = ((c << 21) | (c >>> 11)) >>> 0;
  c = (c + t) >>> 0;
  s[0] = a >>> 0;
  s[1] = b;
  s[2] = c;
  s[3] = d;
  return t;
}

/** Float in [0, 1). Mutates the state. */
export function nextFloat(s: RngState): number {
  return nextUint32(s) / 4294967296;
}

/** Integer in [0, n). Mutates the state. */
export function nextInt(s: RngState, n: number): number {
  return Math.floor(nextFloat(s) * n);
}

/** Fisher–Yates shuffle in place. Mutates both the array and the RNG state. */
export function shuffleInPlace<T>(s: RngState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = nextInt(s, i + 1);
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr;
}

/** Pure helper: returns a shuffled copy and the advanced RNG state. */
export function shuffle<T>(state: RngState, arr: readonly T[]): { rng: RngState; items: T[] } {
  const rng: RngState = [...state];
  const items = shuffleInPlace(rng, [...arr]);
  return { rng, items };
}
