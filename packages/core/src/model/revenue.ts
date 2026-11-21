export const TAX_LEVEL_IDS = ["very-light", "light", "normal", "heavy", "very-heavy"] as const;
export type TaxLevelId = (typeof TAX_LEVEL_IDS)[number];

export interface Revenue {
  taxLevel: TaxLevelId;
  leviedTurn: number | null;
}
