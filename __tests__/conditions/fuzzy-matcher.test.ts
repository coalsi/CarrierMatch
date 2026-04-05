import { searchConditions, isNonFactor } from "@/lib/conditions/fuzzy-matcher";

describe("searchConditions", () => {
  it("finds exact match by name", () => {
    const results = searchConditions("Congestive Heart Failure");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("chf");
  });

  it("finds match by alias", () => {
    const results = searchConditions("CHF");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("chf");
  });

  it("finds fuzzy match", () => {
    const results = searchConditions("hart failure");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("chf");
  });

  it("returns grouped results by category", () => {
    const results = searchConditions("diabetes");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.category === "metabolic")).toBe(true);
  });

  it("returns empty array for gibberish", () => {
    const results = searchConditions("xyzzzqqq");
    expect(results.length).toBe(0);
  });

  it("limits results to maxResults", () => {
    const results = searchConditions("a", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe("isNonFactor", () => {
  it("identifies chicken pox as non-factor", () => {
    expect(isNonFactor("chicken pox")).toBe(true);
  });

  it("identifies allergies as non-factor", () => {
    expect(isNonFactor("seasonal allergies")).toBe(true);
  });

  it("does not flag heart failure as non-factor", () => {
    expect(isNonFactor("heart failure")).toBe(false);
  });

  it("handles fuzzy matching for non-factors", () => {
    expect(isNonFactor("chickenpox")).toBe(true);
  });
});
