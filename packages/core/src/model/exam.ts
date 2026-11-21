import type { Candidate } from "./notables";

/** The last 開科取士: the turn it was held in, and the candidates awaiting confirmation. */
export interface Exam {
  turn: number;
  candidates: Candidate[] | null;
}
