import type { ActionId, ActionPointId, HalfSeasonId, PalaceId, RegionData, StatId } from '@emperor/core';

export interface UiText {
  gameTitle: string;
  titleImageAlt: string;
  startButton: string;
  eraHeading: string;
  eraPrompt: string;
  eraInputLabel: string;
  eraConfirm: string;
  eraError: string;
  mapHeading: string;
  backToMap: string;
  continueButton: string;
  summarySuffix: string;
  nextTurnPrefix: string;
  noChange: string;
  endingHeading: string;
  eraLabel: string;
  restartButton: string;
  atlasButton: string;
  atlasHeading: string;
  regionColumn: string;
  capitalMark: string;
  taelUnit: string;
  taxIncomeLabel: string;
  upkeepLabel: string;
}

export interface RegionEntry extends RegionData {
  name: string;
  capital: boolean;
}

export interface GameText {
  statLabels: Record<StatId, string>;
  actionPointLabels: Record<ActionPointId, string>;
  halfSeasonLabels: Record<HalfSeasonId, string>;
  palaces: Record<PalaceId, { name: string; description: string }>;
  actions: Record<ActionId, { name: string }>;
  eraNamePool: readonly string[];
  regions: readonly RegionEntry[];
}
