import { runMatch } from "@/lib/engine/matcher";
import { QuoteInput } from "@/lib/engine/types";

const healthyApplicant: QuoteInput = {
  dateOfBirth: "1980-06-15",
  gender: "male",
  state: "TX",
  tobaccoStatus: "never",
  coverageAmount: 250000,
  productTypes: ["term", "whole_life", "iul", "final_expense"],
  conditionIds: [],
};

describe("runMatch", () => {
  it("returns results for all 6 carriers for a healthy TX applicant", () => {
    const output = runMatch(healthyApplicant);
    expect(output.results.length).toBe(6);
    expect(output.results.every((r) => r.eligible)).toBe(true);
  });

  it("excludes carriers not available in NY", () => {
    const nyApplicant: QuoteInput = {
      ...healthyApplicant,
      state: "NY",
    };
    const output = runMatch(nyApplicant);
    const eligibleCarriers = output.results.filter((r) => r.eligible);
    const carrierIds = eligibleCarriers.map((r) => r.carrierId);
    expect(carrierIds).not.toContain("americo");
    expect(carrierIds).not.toContain("aetna");
  });

  it("gives higher acceptance to healthy applicants than those with conditions", () => {
    const healthyOutput = runMatch(healthyApplicant);
    const sickApplicant: QuoteInput = {
      ...healthyApplicant,
      conditionIds: ["copd", "diabetes_type2"],
    };
    const sickOutput = runMatch(sickApplicant);

    const healthyAvg =
      healthyOutput.results.reduce((s, r) => s + r.acceptancePct, 0) /
      healthyOutput.results.length;
    const sickAvg =
      sickOutput.results.reduce((s, r) => s + r.acceptancePct, 0) /
      sickOutput.results.length;

    expect(healthyAvg).toBeGreaterThan(sickAvg);
  });

  it("declines all carriers for an applicant with ALS", () => {
    const alsApplicant: QuoteInput = {
      ...healthyApplicant,
      conditionIds: ["als"],
    };
    const output = runMatch(alsApplicant);
    const fullyEligible = output.results.filter(
      (r) => r.eligible && r.acceptancePct > 50
    );
    expect(fullyEligible.length).toBe(0);
  });

  it("returns only final_expense products for Aetna", () => {
    const output = runMatch(healthyApplicant);
    const aetnaResult = output.results.find((r) => r.carrierId === "aetna");
    expect(aetnaResult).toBeDefined();
    if (aetnaResult) {
      const eligibleProducts = aetnaResult.productResults.filter((p) => p.eligible);
      expect(eligibleProducts.every((p) => p.productType === "final_expense")).toBe(true);
    }
  });

  it("calculates correct age from DOB", () => {
    const output = runMatch(healthyApplicant);
    expect(output.inputSummary.age).toBe(45);
  });

  it("gives lower acceptance scores for current tobacco users", () => {
    const nonSmokerOutput = runMatch(healthyApplicant);
    const smokerApplicant: QuoteInput = {
      ...healthyApplicant,
      tobaccoStatus: "current",
    };
    const smokerOutput = runMatch(smokerApplicant);

    const nonSmokerAvg =
      nonSmokerOutput.results.reduce((s, r) => s + r.acceptancePct, 0) /
      nonSmokerOutput.results.length;
    const smokerAvg =
      smokerOutput.results.reduce((s, r) => s + r.acceptancePct, 0) /
      smokerOutput.results.length;

    expect(smokerAvg).toBeLessThan(nonSmokerAvg);
  });
});
