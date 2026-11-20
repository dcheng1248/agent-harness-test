import { nextRandom } from '../rng';

/** Seeded whole number in [min, max], both inclusive. */
export function randomInt(rngState: number, min: number, max: number): { value: number; rngState: number } {
  const result = nextRandom(rngState);
  return { value: min + Math.floor(result.value * (max - min + 1)), rngState: result.rngState };
}
