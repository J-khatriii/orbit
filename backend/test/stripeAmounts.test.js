import { describe, expect, it } from "vitest";
import { fromStripeAmount, toStripeAmount } from "../src/lib/stripeAmounts.js";

describe("stripe amounts", () => {
  it("passes ordinary and zero-decimal currencies through unchanged", () => {
    expect(toStripeAmount(11800, "USD")).toBe(11800);
    expect(toStripeAmount(5000, "JPY")).toBe(5000);
    expect(fromStripeAmount(11800, "USD")).toBe(11800);
    expect(fromStripeAmount(5000, "JPY")).toBe(5000);
  });

  it("scales the Icelandic and Ugandan currencies by 100, and back", () => {
    expect(toStripeAmount(500, "ISK")).toBe(50000);
    expect(toStripeAmount(2500, "UGX")).toBe(250000);
    expect(fromStripeAmount(50000, "ISK")).toBe(500);
    expect(fromStripeAmount(250000, "UGX")).toBe(2500);
  });

  it("only takes three-decimal currencies in multiples of 10", () => {
    expect(toStripeAmount(1000, "KWD")).toBe(1000);
    expect(toStripeAmount(20, "JOD")).toBe(20);
    expect(toStripeAmount(1005, "BHD")).toBeNull();
    expect(fromStripeAmount(1000, "KWD")).toBe(1000);
  });
});
