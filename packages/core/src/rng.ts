export interface RandomResult {
  value: number;
  rngState: number;
}

/** Seeded generator (mulberry32). Returns a value in [0, 1) and the next state. */
export function nextRandom(rngState: number): RandomResult {
  const next = (rngState + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, rngState: next };
}
