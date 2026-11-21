export interface BuildingData {
  id: string;
  required: number;
}

export interface BuildingState {
  id: string;
  required: number;
  progress: number;
  assigned: number;
}

export interface Works {
  artisans: number;
  recruitedTurn: number | null;
  buildings: BuildingState[];
}

export type BuildingStatus = "not-started" | "in-progress" | "completed";

export function buildingStatus(b: BuildingState): BuildingStatus {
  if (b.progress >= b.required) return "completed";
  return b.progress === 0 && b.assigned === 0 ? "not-started" : "in-progress";
}

export function halfSeasonsToFinish(b: BuildingState): number | null {
  if (b.assigned <= 0 || buildingStatus(b) === "completed") return null;
  return Math.ceil((b.required - b.progress) / b.assigned);
}

/** Adds each building's assignment to its progress; finished buildings free their 工匠. */
export function advanceBuildings(buildings: readonly BuildingState[]): {
  buildings: BuildingState[];
  completed: string[];
} {
  const completed: string[] = [];
  const next = buildings.map((b) => {
    if (buildingStatus(b) === "completed") return { ...b };
    const progress = Math.min(b.required, b.progress + b.assigned);
    if (progress >= b.required) {
      completed.push(b.id);
      return { ...b, progress, assigned: 0 };
    }
    return { ...b, progress };
  });
  return { buildings: next, completed };
}
