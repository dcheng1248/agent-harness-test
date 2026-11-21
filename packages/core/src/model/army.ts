export interface Legion {
  id: string;
  name: string;
  general: string;
  soldiers: number;
  training: number;
  region: string;
  movedTurn: number | null;
  route: string[] | null;
}

export interface Army {
  soldiers: number;
  training: number;
  conscriptedTurn: number | null;
  drillStartTurn: number | null;
  legions: Legion[];
  legionsFormed: number;
}
