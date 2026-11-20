import type { ActionId, ActionPointId, CentralPostId, CourtOptionId, DepartmentId, HalfSeasonId, MinistryRankId, NamePool, NotableData, PalaceId, RegionData, RegionOfficeId, StatId } from '@emperor/core';

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
  appointHeading: string;
  postGroupCentral: string;
  postGroupMinistry: string;
  postGroupRegion: string;
  postColumn: string;
  holderColumn: string;
  nameColumn: string;
  vacant: string;
  idleHeading: string;
  noIdleOfficials: string;
  appointButton: string;
  backToPosts: string;
  backToCourt: string;
  recommendHeading: string;
  notableMark: string;
  acceptCandidate: string;
  declineCandidate: string;
  recommendUsed: string;
  noCandidate: string;
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
  centralPosts: Record<CentralPostId, { name: string }>;
  ministryRanks: Record<MinistryRankId, { name: string }>;
  regionOffices: Record<RegionOfficeId, { name: string }>;
  eraNamePool: readonly string[];
  regions: readonly RegionEntry[];
  officialNames: NamePool;
  notables: readonly NotableData[];
}
