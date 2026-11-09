import { describe, expect, it } from "vitest";
import { addDays, daysBetween, todayUtc } from "../src/utils/days.js";

describe("day helpers", () => {
  it("counts whole days between two dates", () => {
    expect(daysBetween("2026-03-01", "2026-03-11")).toBe(10);
    expect(daysBetween("2026-03-11", "2026-03-01")).toBe(-10);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-03-01", 0)).toBe("2026-03-01");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("gives today as a plain date", () => {
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
