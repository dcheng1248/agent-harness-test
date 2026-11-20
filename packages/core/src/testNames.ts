import type { NamePool } from "./model/officials";
import type { NotableData } from "./model/notables";

/** Test-only name pool: 10 surnames × 10 given names = 100 names. */
export const TEST_NAMES: NamePool = {
  surnames: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
  givenNames: ["春", "夏", "秋", "冬", "山", "河", "雲", "風", "松", "竹"],
  reserved: [],
};

/** Test-only 名臣 list. Names use characters not in `TEST_NAMES`, so they never collide. */
export const TEST_NOTABLES: readonly NotableData[] = [
  {
    id: "civil",
    name: "文臣",
    type: "civil",
    stats: { administration: 90, military: 20, ambition: 10, loyalty: 90 },
    gate: { stat: "learning", min: 20 },
  },
  {
    id: "military",
    name: "武將",
    type: "military",
    stats: { administration: 20, military: 90, ambition: 30, loyalty: 80 },
    gate: { stat: "resolve", min: 20 },
  },
  {
    id: "both",
    name: "全才",
    type: "both",
    stats: { administration: 85, military: 85, ambition: 40, loyalty: 85 },
    gate: { stat: "learning", min: 20 },
  },
  {
    id: "locked",
    name: "隱士",
    type: "civil",
    stats: { administration: 95, military: 10, ambition: 0, loyalty: 95 },
    gate: { stat: "health", min: 101 },
  },
];
