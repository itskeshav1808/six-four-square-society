import { describe, expect, it } from "vitest";
import { batchPricing, draftExpiryWarning, lineTotal } from "@/lib/entry-batch-pricing";

describe("batch pricing", () => {
  it("charges full price for 1 to 4 entries", () => {
    expect(batchPricing(1, 1500, 5, 300)).toEqual({ unlocked: false, discountPerEntry: 0, perEntry: 1500, total: 1500 });
    expect(batchPricing(4, 1500, 5, 300).total).toBe(6000);
  });

  it("applies the flat discount to every entry once 5 are added", () => {
    const p = batchPricing(5, 1500, 5, 300);
    expect(p.unlocked).toBe(true);
    expect(p.perEntry).toBe(1200);
    expect(p.total).toBe(6000);
    expect(batchPricing(6, 1500, 5, 300).perEntry).toBe(1200);
  });

  it("retrofits mixed category fees in one batch", () => {
    const p = lineTotal([1000, 1500, 1500, 2000, 1000], 5, 300);
    expect(p.unlocked).toBe(true);
    expect(p.lines).toEqual([700, 1200, 1200, 1700, 700]);
    expect(p.total).toBe(5500);
  });
});

describe("draft expiry warning", () => {
  it("warns inside 48 hours and marks expired after the timestamp", () => {
    const soon = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
    expect(draftExpiryWarning(soon).approaching).toBe(true);
    const past = new Date(Date.now() - 1000).toISOString();
    expect(draftExpiryWarning(past).expired).toBe(true);
  });
});
