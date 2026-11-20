export const STAT_IDS = ['health', 'learning', 'arts', 'resolve'] as const;
export type StatId = (typeof STAT_IDS)[number];
export type StatOwner = 'emperor' | 'nation' | 'region';

export interface StatDefinition {
  id: StatId;
  min: number;
  max: number;
  owner: StatOwner;
}

export const STAT_REGISTRY: readonly StatDefinition[] = STAT_IDS.map((id) => ({
  id,
  min: 0,
  max: 100,
  owner: 'emperor' as const,
}));

export type StatValues = Record<StatId, number>;
