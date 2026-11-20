import { describe, expect, it } from "vitest";
import { COURT_OPTION_IDS, DEPARTMENTS, DEPARTMENT_IDS } from "../index";

// Departments are data for UC-WEB-007.
describe("court departments", () => {
  it("lists the departments and their options in order", () => {
    expect(DEPARTMENT_IDS).toEqual(["cabinet", "personnel", "revenue", "rites", "war", "justice", "works"]);
    expect(Object.keys(DEPARTMENTS)).toEqual([...DEPARTMENT_IDS]);
    expect(DEPARTMENTS.cabinet.options).toEqual(["name-heir", "change-era"]);
    expect(DEPARTMENTS.personnel.options).toEqual(["recommend-officials", "appoint-officials", "hold-exams"]);
    expect(DEPARTMENTS.revenue.options).toEqual(["take-census", "adjust-taxes", "relieve-disaster"]);
    expect(DEPARTMENTS.rites.options).toEqual(["hold-sacrifice", "conduct-diplomacy"]);
    expect(DEPARTMENTS.war.options).toEqual(["conscript-soldiers", "drill-troops"]);
    expect(DEPARTMENTS.justice.options).toEqual(["grant-amnesty", "try-major-case"]);
    expect(DEPARTMENTS.works.options).toEqual(["build", "forge-weapons"]);
  });
  it("lists each court option under exactly one department", () => {
    const all = DEPARTMENT_IDS.flatMap((d) => DEPARTMENTS[d].options);
    expect([...all].sort()).toEqual([...COURT_OPTION_IDS].sort());
    expect(new Set(all).size).toBe(all.length);
  });
});
