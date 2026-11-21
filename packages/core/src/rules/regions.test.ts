import { describe, expect, it } from "vitest";
import { PLAYER_OWNER } from "../model/region";
import type { RegionData } from "../model/region";
import { regionNeighbours } from "./regions";

const start = { morale: 60, population: 1000000, prosperity: 60 };
const region = (id: string, x: number, y: number, owner: string): RegionData =>
  Object.freeze({ id, owner, cell: Object.freeze({ x, y }), start });

const fx: readonly RegionData[] = Object.freeze([
  region("n", 1, 0, PLAYER_OWNER),
  region("d", 0, 0, "foreign"),
  region("s", 1, 2, "foreign"),
  region("far", 3, 1, PLAYER_OWNER),
  region("w", 0, 1, PLAYER_OWNER),
  region("c", 1, 1, PLAYER_OWNER),
  region("e", 2, 1, "foreign"),
]);

describe("regionNeighbours", () => {
  it("UC-CORE-014 returns orthogonal neighbours in input order, skipping diagonal and distant cells", () => {
    expect(regionNeighbours(fx, "c")).toEqual(["n", "s", "w", "e"]);
  });

  it("UC-CORE-014 excludes diagonal regions", () => {
    expect(regionNeighbours(fx, "d")).toEqual(["n", "w"]);
  });

  it("UC-CORE-014 finds a single neighbour for an edge region", () => {
    expect(regionNeighbours(fx, "far")).toEqual(["e"]);
  });

  it("UC-CORE-014 gives no neighbours for a lone region", () => {
    expect(regionNeighbours([region("x", 5, 5, PLAYER_OWNER), region("y", 7, 5, "foreign")], "x")).toEqual([]);
  });

  it("UC-CORE-014 gives no neighbours for an unknown id", () => {
    expect(regionNeighbours(fx, "nope")).toEqual([]);
  });

  it("UC-CORE-014 does not mutate its input", () => {
    expect(() => regionNeighbours(fx, "c")).not.toThrow();
  });

  it("UC-CORE-014 is symmetric over every pair", () => {
    for (const a of fx) {
      for (const b of fx) {
        expect(regionNeighbours(fx, a.id).includes(b.id)).toBe(regionNeighbours(fx, b.id).includes(a.id));
      }
    }
  });
});
