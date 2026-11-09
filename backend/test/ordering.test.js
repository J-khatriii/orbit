import { describe, expect, it } from "vitest";
import { positionAfter } from "../src/utils/ordering.js";

const column = (...positions) => {
  return positions.map((position, index) => {
    return { id: `t${index}`, position };
  });
};

describe("positionAfter", () => {
  it("puts the first task in an empty column at 1000", () => {
    expect(positionAfter(column(), null)).toEqual({ position: 1000 });
  });

  it("puts a task at the top above the first one", () => {
    expect(positionAfter(column(1000, 2000), null)).toEqual({ position: 0 });
  });

  it("puts a task after the last one", () => {
    expect(positionAfter(column(1000, 2000), "t1")).toEqual({ position: 3000 });
  });

  it("puts a task between two neighbours", () => {
    expect(positionAfter(column(1000, 2000), "t0")).toEqual({ position: 1500 });
  });

  it("asks for a respace when there is no room", () => {
    expect(positionAfter(column(1000, 1001), "t0")).toEqual({ crowded: true });
    expect(positionAfter(column(1000, 1000), "t0")).toEqual({ crowded: true });
  });

  it("reports a task that isn't in the column", () => {
    expect(positionAfter(column(1000), "nope")).toEqual({ missing: true });
  });
});
