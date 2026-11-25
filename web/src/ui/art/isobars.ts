// Storm isobars: closed, wobbling contour rings around a drifting storm eye.
// Deterministic for a given seed, so art is identical on every render and in tests.

export interface IsobarOptions {
  cx: number;
  cy: number;
  rings: number;
  rMin: number;
  rMax: number;
  seed: number;
  /** Radial wobble as a fraction of the radius (0.08 = gentle, 0.25 = wild). */
  wobble?: number;
  /** How far the ring centers drift outward, in user units per ring. */
  drift?: number;
  /** Squash on the y axis (1 = round). */
  squash?: number;
  points?: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => Math.round(n * 10) / 10;

/** Closed Catmull-Rom spline through the points, as cubic Béziers. */
function closedSpline(pts: [number, number][]): string {
  const n = pts.length;
  const at = (i: number) => pts[((i % n) + n) % n] as [number, number];
  const first = at(0);
  let d = `M${f1(first[0])} ${f1(first[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f1(c1x)} ${f1(c1y)} ${f1(c2x)} ${f1(c2y)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return `${d}Z`;
}

const cache = new Map<string, string[]>();

/** Returns one SVG path `d` per ring, innermost first. */
export function isobarPaths(o: IsobarOptions): string[] {
  const key = JSON.stringify(o);
  const hit = cache.get(key);
  if (hit) return hit;
  const rand = mulberry32(o.seed);
  const wobble = o.wobble ?? 0.12;
  const drift = o.drift ?? 0;
  const squash = o.squash ?? 1;
  const points = o.points ?? 28;
  // Shared harmonics so neighbouring rings stay roughly parallel, like real isobars.
  const harmonics = [2, 3, 5].map((k) => ({ k, phase: rand() * Math.PI * 2, amp: 0.4 + rand() * 0.6 }));
  const driftAngle = rand() * Math.PI * 2;
  const out: string[] = [];
  for (let r = 0; r < o.rings; r++) {
    const t = o.rings === 1 ? 0 : r / (o.rings - 1);
    const radius = o.rMin + (o.rMax - o.rMin) * t ** 1.15;
    const cx = o.cx + Math.cos(driftAngle) * drift * r;
    const cy = o.cy + Math.sin(driftAngle) * drift * r;
    const ringJitter = rand() * 0.6;
    const pts: [number, number][] = [];
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      let w = 0;
      for (const h of harmonics) w += h.amp * Math.sin(h.k * a + h.phase + ringJitter * (1 - t) + t * 0.9);
      const rr = radius * (1 + (wobble * w) / 1.6);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
    }
    out.push(closedSpline(pts));
  }
  cache.set(key, out);
  return out;
}
