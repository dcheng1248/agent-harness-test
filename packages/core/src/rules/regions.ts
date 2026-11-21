import type { RegionData } from "../model/region";

/** IDs of regions whose cell shares an edge with the given region's cell, in `regions` order. */
export function regionNeighbours(regions: readonly RegionData[], id: string): string[] {
  const here = regions.find((r) => r.id === id);
  if (!here) return [];
  return regions
    .filter((r) => Math.abs(r.cell.x - here.cell.x) + Math.abs(r.cell.y - here.cell.y) === 1)
    .map((r) => r.id);
}

/** ID of the first region marked as the capital, or `null` when none is. */
export function capitalRegion(regions: readonly RegionData[]): string | null {
  return regions.find((r) => r.capital === true)?.id ?? null;
}
