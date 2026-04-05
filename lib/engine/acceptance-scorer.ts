import { CarrierConfig } from "@/lib/carriers/types";
import { getConditionById } from "@/lib/conditions/fuzzy-matcher";

interface TierInfo {
  tierId: string;
  tierName: string;
  isGraded: boolean;
  multiplier: number;
}

export function scoreAcceptance(
  conditionIds: string[],
  tier: TierInfo,
  smoker: boolean,
  age: number,
  carrier: CarrierConfig
): number {
  let score = 95;

  // Tier-based deductions
  if (tier.multiplier > 2.0) {
    score -= 25; // substandard
  } else if (tier.isGraded) {
    score -= 35; // graded benefit
  } else if (tier.multiplier > 1.5) {
    score -= 15; // tobacco standard
  } else if (tier.multiplier > 1.0) {
    score -= 10; // standard
  } else if (tier.multiplier > 0.85) {
    score -= 3; // preferred (not best)
  }

  // Condition-based deductions
  let ratedCount = 0;
  for (const condId of conditionIds) {
    const condition = getConditionById(condId);
    if (!condition) continue;

    const impact = condition.carrierImpact[carrier.id];
    if (!impact || impact.effect === "non_factor") continue;

    ratedCount++;
    // Deduct based on severity weight, scaled down
    const deduction = Math.min(condition.severityWeight * 0.8, 12);
    score -= deduction;
  }

  // Multiple conditions compound
  if (ratedCount >= 3) score -= 10;
  else if (ratedCount >= 2) score -= 5;

  // Smoker deduction
  if (smoker) score -= 5;

  // Age proximity to typical product max (80)
  if (age >= 78) score -= 10;
  else if (age >= 75) score -= 5;
  else if (age >= 70) score -= 3;

  // Clamp to valid range
  return Math.max(0, Math.min(99, Math.round(score)));
}
