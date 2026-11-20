export const EMPEROR_STAT_IDS = [
  "health",
  "learning",
  "arts",
  "resolve",
] as const;
export const NATION_STAT_IDS = ["treasury"] as const;
export const REGION_STAT_IDS = ["morale", "population", "prosperity"] as const;
export const STAT_IDS = [
  ...EMPEROR_STAT_IDS,
  ...NATION_STAT_IDS,
  ...REGION_STAT_IDS,
] as const;

export type EmperorStatId = (typeof EMPEROR_STAT_IDS)[number];
export type NationStatId = (typeof NATION_STAT_IDS)[number];
export type RegionStatId = (typeof REGION_STAT_IDS)[number];
export type StatId = EmperorStatId | NationStatId | RegionStatId;
export type StatOwner = "emperor" | "nation" | "region";

export interface StatDefinition {
  id: StatId;
  min: number;
  max: number;
  owner: StatOwner;
}

export const STAT_REGISTRY: readonly StatDefinition[] = [
  { id: "health", min: 0, max: 100, owner: "emperor" },
  { id: "learning", min: 0, max: 100, owner: "emperor" },
  { id: "arts", min: 0, max: 100, owner: "emperor" },
  { id: "resolve", min: 0, max: 100, owner: "emperor" },
  { id: "treasury", min: -Infinity, max: Infinity, owner: "nation" },
  { id: "morale", min: 0, max: 100, owner: "region" },
  { id: "population", min: 0, max: Infinity, owner: "region" },
  { id: "prosperity", min: 0, max: 100, owner: "region" },
];

export type StatValues = Record<EmperorStatId, number>;
export type NationStatValues = Record<NationStatId, number>;
export type RegionStatValues = Record<RegionStatId, number>;
