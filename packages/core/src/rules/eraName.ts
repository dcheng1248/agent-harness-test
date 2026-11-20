import { randomInt } from './random';

export function isValidEraName(name: string): boolean {
  return /^\p{Script=Han}{2}$/u.test(name);
}

export function drawEraNameSuggestions(seed: number, pool: readonly string[], count = 3): string[] {
  const items = [...pool];
  let rngState = (seed ^ 0x9e3779b9) >>> 0;
  const take = Math.min(count, items.length);
  for (let i = 0; i < take; i += 1) {
    const draw = randomInt(rngState, i, items.length - 1);
    rngState = draw.rngState;
    const picked = items[draw.value] as string;
    items[draw.value] = items[i] as string;
    items[i] = picked;
  }
  return items.slice(0, take);
}
