import type { DepartmentId } from "./court";
import { PLAYER_OWNER } from "./region";
import type { GameState } from "./state";
import type { OfficialStatValues } from "./stats";

export const CENTRAL_POST_IDS = ["chancellor", "grand-general", "grand-tutor"] as const;
export type CentralPostId = (typeof CENTRAL_POST_IDS)[number];

/** The six 部 of `DEPARTMENT_IDS`, without 內閣. */
export const MINISTRY_DEPARTMENT_IDS = [
  "personnel",
  "revenue",
  "rites",
  "war",
  "justice",
  "works",
] as const satisfies readonly DepartmentId[];
export type MinistryDepartmentId = (typeof MINISTRY_DEPARTMENT_IDS)[number];

export const MINISTRY_RANKS = ["minister", "vice-minister"] as const;
export type MinistryRankId = (typeof MINISTRY_RANKS)[number];

export const REGION_OFFICES = ["governor", "commander"] as const;
export type RegionOfficeId = (typeof REGION_OFFICES)[number];

export type PostId = string;
export type PostInfo =
  | { id: PostId; group: "central"; office: CentralPostId }
  | { id: PostId; group: "ministry"; department: MinistryDepartmentId; rank: MinistryRankId }
  | { id: PostId; group: "region"; region: string; office: RegionOfficeId };

export interface Official {
  id: string;
  name: string;
  stats: OfficialStatValues;
  post: PostId | null;
  /** The 名臣 ID, or `null` for an ordinary official. */
  notable: string | null;
}

export interface NamePool {
  surnames: readonly string[];
  givenNames: readonly string[];
  /** Full names never generated, such as 名臣. */
  reserved: readonly string[];
}

/** The posts that exist now, in display order. */
export function listPosts(state: Pick<GameState, "regions">): PostInfo[] {
  const posts: PostInfo[] = CENTRAL_POST_IDS.map((office) => ({
    id: office,
    group: "central" as const,
    office,
  }));
  for (const department of MINISTRY_DEPARTMENT_IDS)
    for (const rank of MINISTRY_RANKS)
      posts.push({ id: `${department}-${rank}`, group: "ministry", department, rank });
  for (const region of state.regions) {
    if (region.owner !== PLAYER_OWNER) continue;
    for (const office of REGION_OFFICES)
      posts.push({ id: `${region.id}-${office}`, group: "region", region: region.id, office });
  }
  return posts;
}
