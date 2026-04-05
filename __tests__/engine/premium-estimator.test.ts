import { estimatePremium } from "@/lib/engine/premium-estimator";
import { aetna } from "@/lib/carriers/aetna";
import { americo } from "@/lib/carriers/americo";

describe("estimatePremium", () => {
  it("calculates exact Aetna premium from rate table", () => {
    const aetnaProduct = aetna.products[0];
    const result = estimatePremium(aetna, aetnaProduct, 50, "male", false, 15000, 1.0);

    // Rate: 35.3 per $1,000 × 15 units + $40 fee = $569.5 annual
    // Monthly: $569.5 × 0.0875 = $49.83
    expect(result).toBeDefined();
    expect(result!.min).toBeCloseTo(49.83, 0);
    expect(result!.max).toBeCloseTo(49.83, 0);
  });

  it("returns a range for carriers without rate tables", () => {
    const americoTerm = americo.products[0];
    const result = estimatePremium(americo, americoTerm, 35, "male", false, 250000, 1.0);

    expect(result).toBeDefined();
    expect(result!.min).toBeGreaterThan(0);
    expect(result!.max).toBeGreaterThan(result!.min);
  });

  it("returns higher premiums for smokers", () => {
    const americoTerm = americo.products[0];
    const nonSmoker = estimatePremium(americo, americoTerm, 35, "male", false, 250000, 1.0);
    const smoker = estimatePremium(americo, americoTerm, 35, "male", true, 250000, 2.0);

    expect(nonSmoker).toBeDefined();
    expect(smoker).toBeDefined();
    expect(smoker!.min).toBeGreaterThan(nonSmoker!.min);
  });

  it("returns higher premiums for older applicants", () => {
    const americoTerm = americo.products[0];
    const young = estimatePremium(americo, americoTerm, 30, "male", false, 250000, 1.0);
    const old = estimatePremium(americo, americoTerm, 60, "male", false, 250000, 1.0);

    expect(young).toBeDefined();
    expect(old).toBeDefined();
    expect(old!.min).toBeGreaterThan(young!.min);
  });

  it("returns lower premiums for females", () => {
    const americoTerm = americo.products[0];
    const male = estimatePremium(americo, americoTerm, 40, "male", false, 250000, 1.0);
    const female = estimatePremium(americo, americoTerm, 40, "female", false, 250000, 1.0);

    expect(male).toBeDefined();
    expect(female).toBeDefined();
    expect(female!.min).toBeLessThan(male!.min);
  });
});
