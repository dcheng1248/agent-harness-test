import type { NamePool } from "./model/officials";

/** Test-only name pool: 10 surnames × 10 given names = 100 names. */
export const TEST_NAMES: NamePool = {
  surnames: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
  givenNames: ["春", "夏", "秋", "冬", "山", "河", "雲", "風", "松", "竹"],
  reserved: [],
};
