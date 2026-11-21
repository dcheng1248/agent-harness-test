import type { ActionId, TaxLevelId, ActionPointId, CentralPostId, CourtOptionId, DepartmentId, HalfSeasonId, MinistryRankId, BuildingData, NamePool, NotableData, PalaceId, RegionData, RegionOfficeId, StatId } from '@emperor/core';

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
  ownerLabel: string;
  atlasHint: string;
  closeRegionPanel: string;
  legendHeading: string;
  atlasMapLabel: string;
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
  examHeading: string;
  examPickColumn: string;
  examPicked: string;
  confirmExamButton: string;
  examHeld: string;
  nextExamPrefix: string;
  nextExamSuffix: string;
  noExamCandidates: string;
  recruitHeading: string;
  releaseHeading: string;
  buildHeading: string;
  artisanTotalLabel: string;
  idleArtisansLabel: string;
  freePopulationLabel: string;
  recruitMaxLabel: string;
  personUnit: string;
  countLabel: string;
  countDown: string;
  countUp: string;
  countDownLabel: string;
  countUpLabel: string;
  recruitMax: string;
  releaseAll: string;
  confirmRecruit: string;
  confirmRelease: string;
  recruitUsed: string;
  noRecruits: string;
  noIdleArtisans: string;
  buildingColumn: string;
  requiredColumn: string;
  statusColumn: string;
  assignedColumn: string;
  statusNotStarted: string;
  statusInProgress: string;
  statusCompleted: string;
  pausedMark: string;
  etaPrefix: string;
  etaSuffix: string;
  wagesLabel: string;
  completedLabel: string;
  taxHeading: string;
  taxHint: string;
  taxSliderLabel: string;
  taxLevelLabel: string;
  expectedTaxLabel: string;
  levyHeading: string;
  levyHintPrefix: string;
  levyHintSuffix: string;
  confirmLevy: string;
  levyBack: string;
  levyResultLabel: string;
  levyUsed: string;
  sacrificeHeading: string;
  sacrificeHint: string;
  confirmSacrifice: string;
  sacrificeBack: string;
  sacrificeUsed: string;
  budgetHeading: string;
  currentTaxLabel: string;
  expectedTaxColumn: string;
  totalRow: string;
  halfYearUpkeepLabel: string;
  nextCollectionLabel: string;
}

export interface RegionEntry extends RegionData {
  name: string;
  capital: boolean;
}

export interface NationEntry {
  id: string;
  name: string;
  color: string;
}

export type BuildingCategory = 'palace' | 'ritual' | 'education' | 'garden' | 'water' | 'defense' | 'transport';

export interface BuildingEntry extends BuildingData {
  name: string;
  description: string;
  category: BuildingCategory;
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
  taxLevels: Record<TaxLevelId, { name: string }>;
  centralPosts: Record<CentralPostId, { name: string }>;
  ministryRanks: Record<MinistryRankId, { name: string }>;
  regionOffices: Record<RegionOfficeId, { name: string }>;
  eraNamePool: readonly string[];
  nations: readonly NationEntry[];
  regions: readonly RegionEntry[];
  officialNames: NamePool;
  notables: readonly NotableData[];
  buildings: readonly BuildingEntry[];
}
