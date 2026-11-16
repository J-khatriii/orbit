import { describe, expect, it } from "vitest";
import {
  calculateTotals,
  exponentOf,
  lineTotal,
  parseQuantityMilli,
  taxAmount,
} from "../src/lib/money.js";

describe("money", () => {
  it("rounds a line total half up", () => {
    expect(lineTotal(1500, 1000)).toBe(1500); // 1.5 x 10.00
    expect(lineTotal(3000, 3333)).toBe(9999);
    expect(lineTotal(335, 100)).toBe(34); // 33.5 rounds up
    expect(lineTotal(333, 100)).toBe(33); // 33.3 rounds down
    expect(lineTotal(1, 49)).toBe(0); // 0.049 rounds down
  });

  it("is exact where floating point is not", () => {
    // 0.1 x 3 and 1.1 x 100 go wrong with ordinary decimals.
    expect(lineTotal(100, 3)).toBe(0);
    expect(lineTotal(1100, 100)).toBe(110);
    expect(lineTotal(1000, 999_999_999_999)).toBe(999_999_999_999);
  });

  it("rounds tax half up from basis points", () => {
    expect(taxAmount(10000, 1800)).toBe(1800);
    expect(taxAmount(999, 750)).toBe(75); // 74.925
    expect(taxAmount(1, 5000)).toBe(1); // 0.5 rounds up
    expect(taxAmount(12345, 0)).toBe(0);
  });

  it("calculates the totals of an invoice", () => {
    const totals = calculateTotals(
      [
        { quantityMilli: 2000, unitPriceMinor: 5000 },
        { quantityMilli: 1500, unitPriceMinor: 3333 },
      ],
      1800,
    );

    expect(totals.lineTotals).toEqual([10000, 5000]);
    expect(totals.subtotal).toBe(15000);
    expect(totals.taxAmount).toBe(2700);
    expect(totals.total).toBe(17700);
  });

  it("gives zeros for an invoice with no lines", () => {
    expect(calculateTotals([], 1800)).toEqual({
      lineTotals: [],
      subtotal: 0,
      taxAmount: 0,
      total: 0,
    });
  });

  it("refuses a line total that is too large", () => {
    expect(() => {
      return lineTotal(1_000_000_000, 100_000_000_000);
    }).toThrow(RangeError);
  });

  it("reads quantities with up to three decimals", () => {
    expect(parseQuantityMilli("1")).toBe(1000);
    expect(parseQuantityMilli("1.5")).toBe(1500);
    expect(parseQuantityMilli(2.25)).toBe(2250);
    expect(parseQuantityMilli("0.001")).toBe(1);
    expect(parseQuantityMilli("1000000")).toBe(1_000_000_000);
  });

  it("refuses quantities that aren't valid", () => {
    for (const bad of ["1.2345", "abc", "-1", "0", "1000001", "", 1e-7, 1e21, "1e3"]) {
      expect(parseQuantityMilli(bad)).toBeNull();
    }
  });

  it("knows how many decimals a currency has", () => {
    expect(exponentOf("USD")).toBe(2);
    expect(exponentOf("JPY")).toBe(0);
    expect(exponentOf("KWD")).toBe(3);
  });
});
