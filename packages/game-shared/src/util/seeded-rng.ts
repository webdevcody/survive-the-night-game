/**
 * Deterministic PRNG for map generation (mulberry32).
 * Same seed → same sequence of `next()` values.
 */
export type SeededRng = {
  /** Uniform in [0, 1) */
  next: () => number;
};

export function createSeededRng(seed: number): SeededRng {
  let t = seed >>> 0;
  return {
    next(): number {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    },
  };
}
