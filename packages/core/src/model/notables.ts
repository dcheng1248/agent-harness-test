import type { EmperorStatId, OfficialStatValues } from "./stats";

export type NotableType = "civil" | "military" | "both";

export interface NotableGate {
  stat: EmperorStatId;
  min: number;
}

export interface NotableData {
  id: string;
  name: string;
  type: NotableType;
  stats: OfficialStatValues;
  gate: NotableGate;
}

export interface Candidate {
  name: string;
  stats: OfficialStatValues;
  notable: string | null;
}

export interface Recommendation {
  turn: number;
  candidate: Candidate | null;
}
