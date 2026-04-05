import { scoreAcceptance } from "@/lib/engine/acceptance-scorer";
import { americo } from "@/lib/carriers/americo";

describe("scoreAcceptance", () => {
  const bestTier = {
    tierId: "standard-non-nicotine",
    tierName: "Standard Non-Nicotine",
    isGraded: false,
    multiplier: 1.0,
  };

  it("gives high score to healthy non-smoker", () => {
    const score = scoreAcceptance([], bestTier, false, 40, americo);
    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(99);
  });

  it("gives lower score for smokers", () => {
    const nonSmoker = scoreAcceptance([], bestTier, false, 40, americo);
    const smoker = scoreAcceptance([], bestTier, true, 40, americo);
    expect(smoker).toBeLessThan(nonSmoker);
  });

  it("gives lower score for more conditions", () => {
    const none = scoreAcceptance([], bestTier, false, 40, americo);
    const one = scoreAcceptance(["heart_attack"], bestTier, false, 40, americo);
    const two = scoreAcceptance(["heart_attack", "copd"], bestTier, false, 40, americo);
    expect(one).toBeLessThan(none);
    expect(two).toBeLessThan(one);
  });

  it("gives low score for graded tier", () => {
    const gradedTier = {
      tierId: "graded",
      tierName: "Graded Benefit",
      isGraded: true,
      multiplier: 1.8,
    };
    const score = scoreAcceptance(["copd"], gradedTier, false, 60, americo);
    expect(score).toBeLessThanOrEqual(60);
  });

  it("never returns exactly 100", () => {
    const score = scoreAcceptance([], bestTier, false, 30, americo);
    expect(score).toBeLessThan(100);
  });

  it("never returns below 0", () => {
    const badTier = {
      tierId: "substandard",
      tierName: "Substandard",
      isGraded: false,
      multiplier: 3.0,
    };
    const score = scoreAcceptance(
      ["copd", "diabetes_type2", "heart_attack", "stroke", "alcohol_abuse"],
      badTier,
      true,
      78,
      americo
    );
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
