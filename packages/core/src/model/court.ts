export const DEPARTMENT_IDS = ['cabinet', 'personnel', 'revenue', 'rites', 'war', 'justice', 'works'] as const;
export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

export const COURT_OPTION_IDS = [
  'name-heir',
  'change-era',
  'recommend-officials',
  'appoint-officials',
  'hold-exams',
  'take-census',
  'adjust-taxes',
  'relieve-disaster',
  'hold-sacrifice',
  'conduct-diplomacy',
  'conscript-soldiers',
  'drill-troops',
  'grant-amnesty',
  'try-major-case',
  'recruit-artisans',
  'release-artisans',
  'build',
  'forge-weapons',
] as const;
export type CourtOptionId = (typeof COURT_OPTION_IDS)[number];

export const DEPARTMENTS: Record<DepartmentId, { options: readonly CourtOptionId[] }> = {
  cabinet: { options: ['name-heir', 'change-era'] },
  personnel: { options: ['recommend-officials', 'appoint-officials', 'hold-exams'] },
  revenue: { options: ['take-census', 'adjust-taxes', 'relieve-disaster'] },
  rites: { options: ['hold-sacrifice', 'conduct-diplomacy'] },
  war: { options: ['conscript-soldiers', 'drill-troops'] },
  justice: { options: ['grant-amnesty', 'try-major-case'] },
  works: { options: ['recruit-artisans', 'release-artisans', 'build', 'forge-weapons'] },
};
