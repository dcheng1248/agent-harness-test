import type { ActionId, ActionPointId, CourtOptionId, DepartmentId, HalfSeasonId, PalaceId, RegionData, StatId } from '@emperor/core';

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
  mapImageAlt: string;
  backToMap: string;
  noActions: string;
  continueButton: string;
  summarySuffix: string;
  nextTurnPrefix: string;
  noChange: string;
  endingHeading: string;
  eraLabel: string;
  restartButton: string;
  atlasButton: string;
  atlasHeading: string;
  closeAtlas: string;
  regionColumn: string;
  capitalMark: string;
  taelUnit: string;
  taxIncomeLabel: string;
  upkeepLabel: string;
  leaveCourt: string;
  leaveCourtLabel: string;
  notYetOpen: string;
}

export interface RegionEntry extends RegionData {
  name: string;
  capital: boolean;
}

/** 宣政殿 has no panel, so it alone may lack a description. */
interface PalaceText {
  name: string;
  imageAlt: string;
}

export interface GameText {
  statLabels: Record<StatId, string>;
  actionPointLabels: Record<ActionPointId, string>;
  halfSeasonLabels: Record<HalfSeasonId, string>;
  palaces: { [K in PalaceId]: PalaceText & (K extends 'xuanzheng' ? { description?: string } : { description: string }) };
  actions: Record<ActionId, { name: string }>;
  departments: Record<DepartmentId, { label: string; name: string }>;
  courtOptions: Record<CourtOptionId, { name: string }>;
  eraNamePool: readonly string[];
  regions: readonly RegionEntry[];
}
