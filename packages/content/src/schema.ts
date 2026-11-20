import type { ActionId, ActionPointId, HalfSeasonId, PalaceId, StatId } from '@emperor/core';

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
}

export interface GameText {
  statLabels: Record<StatId, string>;
  actionPointLabels: Record<ActionPointId, string>;
  halfSeasonLabels: Record<HalfSeasonId, string>;
  palaces: Record<PalaceId, { name: string; description: string }>;
  actions: Record<ActionId, { name: string }>;
  eraNamePool: readonly string[];
}
