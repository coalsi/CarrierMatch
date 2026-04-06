import { carriers } from "@/lib/carriers";
import { CarrierConfig, Product, ProductType } from "@/lib/carriers/types";
import { getConditionById } from "@/lib/conditions/fuzzy-matcher";
import { QuoteInput, QuoteOutput, CarrierResult, ProductResult, ConditionEntry } from "./types";
import { estimatePremium } from "./premium-estimator";
import { scoreAcceptance } from "./acceptance-scorer";

function calculateBMI(heightInches: number, weightLbs: number): number {
  return (weightLbs / (heightInches * heightInches)) * 703;
}

function getBMINotes(bmi: number): string[] {
  const notes: string[] = [];
  if (bmi > 40) {
    notes.push(`BMI ${bmi.toFixed(1)} — may be declined or heavily rated by most carriers`);
  } else if (bmi > 35) {
    notes.push(`BMI ${bmi.toFixed(1)} — substandard rates likely at most carriers`);
  } else if (bmi > 31.5) {
    notes.push(`BMI ${bmi.toFixed(1)} — standard rates; excludes preferred at most carriers`);
  } else if (bmi > 28) {
    notes.push(`BMI ${bmi.toFixed(1)} — may exclude preferred plus at some carriers`);
  }
  return notes;
}

function getConditionEntries(input: QuoteInput): ConditionEntry[] {
  // Use new conditions array if provided, fall back to conditionIds
  if (input.conditions && input.conditions.length > 0) {
    return input.conditions;
  }
  return input.conditionIds.map((id) => ({ conditionId: id }));
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function isSmoker(input: QuoteInput, carrier: CarrierConfig): boolean {
  if (input.tobaccoStatus === "current") return true;
  if (input.tobaccoStatus === "never") return false;

  // "quit" — check against carrier's lookback
  const quitMonths = input.tobaccoQuitMonths ?? 0;
  return quitMonths < carrier.tobaccoPolicy.lookbackMonths;
}

function isStateExcluded(
  carrier: CarrierConfig,
  state: string,
  productId?: string
): boolean {
  if (carrier.stateExclusions.includes(state)) return true;
  if (productId) {
    const productExclusions = carrier.productStateExclusions[productId] ?? [];
    if (productExclusions.includes(state)) return true;
  }
  return false;
}

function hasKnockout(carrier: CarrierConfig, conditionIds: string[]): boolean {
  return conditionIds.some((cid) => carrier.knockoutConditions.includes(cid));
}

function isTobaccoTier(name: string): boolean {
  const lower = name.toLowerCase();
  // Explicitly tobacco/smoker/nicotine and NOT "non-tobacco"/"nonsmoker"/"non-nicotine"
  return (
    (lower.includes("tobacco") || lower.includes("smoker") || lower.includes("nicotine")) &&
    !lower.includes("non-tobacco") &&
    !lower.includes("non-nicotine") &&
    !lower.includes("nonsmoker") &&
    !lower.includes("non-smoker") &&
    !lower.includes("non tobacco") &&
    !lower.includes("non nicotine") &&
    !lower.includes("non smoker")
  );
}

function isNonTobaccoTier(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("non-tobacco") ||
    lower.includes("non tobacco") ||
    lower.includes("non-nicotine") ||
    lower.includes("non nicotine") ||
    lower.includes("nonsmoker") ||
    lower.includes("non-smoker") ||
    lower.includes("non smoker")
  );
}

function isNeutralTier(name: string): boolean {
  // Tiers like "Substandard", "Graded Benefit", "Return of Premium" etc.
  return !isTobaccoTier(name) && !isNonTobaccoTier(name);
}

function determineTier(
  carrier: CarrierConfig,
  conditionIds: string[],
  smoker: boolean
): { tierId: string; tierName: string; isGraded: boolean; multiplier: number } {
  const tiers = carrier.underwritingTiers;

  // Filter tiers based on tobacco status
  // Smoker: use tobacco tiers + neutral tiers (never non-tobacco tiers)
  // Non-smoker: use non-tobacco tiers + neutral tiers (never tobacco tiers)
  const applicableTiers = tiers.filter((t) => {
    if (smoker) {
      return isTobaccoTier(t.name) || isNeutralTier(t.name);
    }
    return isNonTobaccoTier(t.name) || isNeutralTier(t.name);
  });

  // If no applicable tiers found (carrier doesn't distinguish), use all tiers
  const searchTiers = applicableTiers.length > 0 ? applicableTiers : tiers;

  // Find the worst tier that any condition triggers
  let worstTierIndex = 0;
  for (const condId of conditionIds) {
    for (let i = 0; i < searchTiers.length; i++) {
      const tier = searchTiers[i];
      if (tier.triggerConditions.includes(condId) && i > worstTierIndex) {
        worstTierIndex = i;
      }
    }
  }

  const selectedTier = searchTiers[worstTierIndex] ?? tiers[0];

  return {
    tierId: selectedTier.id,
    tierName: selectedTier.name,
    isGraded: selectedTier.isGraded,
    multiplier: selectedTier.premiumMultiplier,
  };
}

function evaluateProduct(
  product: Product,
  age: number,
  state: string,
  coverageAmount: number,
  requestedTypes: ProductType[],
  carrier: CarrierConfig
): { eligible: boolean; notes: string[] } {
  const notes: string[] = [];

  // Check product type
  if (!requestedTypes.includes(product.type)) {
    return { eligible: false, notes: ["Product type not requested"] };
  }

  // Check age
  if (age < product.issueAgeMin || age > product.issueAgeMax) {
    return {
      eligible: false,
      notes: [`Age ${age} outside issue range ${product.issueAgeMin}-${product.issueAgeMax}`],
    };
  }

  // Check state exclusions for this specific product
  if (isStateExcluded(carrier, state, product.id)) {
    return {
      eligible: false,
      notes: [`Product not available in ${state}`],
    };
  }

  // Check face amount
  let maxFace = product.faceAmountMax;
  if (product.faceAmountMaxByAge) {
    for (const band of product.faceAmountMaxByAge) {
      if (age >= band.minAge && age <= band.maxAge) {
        maxFace = band.max;
        break;
      }
    }
  }

  if (coverageAmount < product.faceAmountMin) {
    return {
      eligible: false,
      notes: [`Coverage $${coverageAmount.toLocaleString()} below minimum $${product.faceAmountMin.toLocaleString()}`],
    };
  }

  if (coverageAmount > maxFace) {
    notes.push(
      `Max coverage for age ${age}: $${maxFace.toLocaleString()} (requested $${coverageAmount.toLocaleString()})`
    );
  }

  if (product.gradedBenefit) {
    notes.push(
      `Graded benefit: ${product.gradedBenefit.years.map((y) => `Year ${y.year}: ${y.benefitPct}%`).join(", ")}`
    );
  }

  if (product.underwritingType === "guaranteed") {
    notes.push("Guaranteed issue — no health questions");
  }

  return { eligible: true, notes };
}

export function runMatch(input: QuoteInput): QuoteOutput {
  const age = calculateAge(input.dateOfBirth);
  const conditionEntries = getConditionEntries(input);
  const activeConditionIds = conditionEntries.map((c) => c.conditionId);
  const conditionNames = activeConditionIds
    .map((id) => getConditionById(id)?.name ?? id)
    .filter(Boolean);

  // Calculate BMI if height/weight provided
  const bmi =
    input.heightInches && input.weightLbs
      ? calculateBMI(input.heightInches, input.weightLbs)
      : null;

  const results: CarrierResult[] = carriers.map((carrier) => {
    const declineReasons: string[] = [];
    const notes: string[] = [];

    // 0. BMI notes
    if (bmi !== null) {
      notes.push(...getBMINotes(bmi));
      // BMI > 40 is effectively a knockout for most carriers
      if (bmi > 45) {
        return {
          carrierId: carrier.id,
          carrierName: carrier.name,
          portalUrl: carrier.portalUrl,
          eligible: false,
          acceptancePct: 0,
          tierPlacement: null,
          productResults: [],
          declineReasons: [`BMI ${bmi.toFixed(1)} exceeds maximum build chart limits`],
          notes: [],
        };
      }
    }

    // 1. State check
    if (isStateExcluded(carrier, input.state)) {
      return {
        carrierId: carrier.id,
        carrierName: carrier.name,
        portalUrl: carrier.portalUrl,
        eligible: false,
        acceptancePct: 0,
        tierPlacement: null,
        productResults: [],
        declineReasons: [`Not available in ${input.state}`],
        notes: [],
      };
    }

    // 2. Determine smoker status
    const smoker = isSmoker(input, carrier);

    // 3. Check knockouts — respect lookback windows if recency provided
    const knockout = conditionEntries.some((entry) => {
      if (!carrier.knockoutConditions.includes(entry.conditionId)) return false;
      // If no recency provided, treat as current/active (knockout)
      if (entry.diagnosedMonthsAgo === undefined) return true;
      // Some conditions are always knockout regardless of recency
      const condition = getConditionById(entry.conditionId);
      if (!condition) return true;
      const impact = condition.carrierImpact[carrier.id];
      if (!impact) return false;
      // If no lookback specified for this carrier, it's a lifetime knockout
      if (!impact.lookbackMonths) return true;
      // Only knockout if within the lookback window
      return entry.diagnosedMonthsAgo <= impact.lookbackMonths;
    });

    // 4. Determine tier (even if knocked out, for GI products)
    const tier = determineTier(carrier, activeConditionIds, smoker);

    if (knockout) {
      // Check if carrier has guaranteed issue products
      const giProducts = carrier.products.filter(
        (p) => p.underwritingType === "guaranteed"
      );

      if (giProducts.length > 0) {
        const giResults: ProductResult[] = giProducts.map((product) => {
          const evalResult = evaluateProduct(
            product,
            age,
            input.state,
            input.coverageAmount,
            input.productTypes.length > 0 ? input.productTypes : ["term", "whole_life", "iul", "final_expense"],
            carrier
          );

          const premium = evalResult.eligible
            ? estimatePremium(carrier, product, age, input.gender, smoker, input.coverageAmount, 2.0)
            : undefined;

          return {
            productId: product.id,
            productName: product.name,
            productType: product.type,
            eligible: evalResult.eligible,
            premiumEstimateMin: premium?.min,
            premiumEstimateMax: premium?.max,
            notes: [...evalResult.notes, "Guaranteed issue only due to health conditions"],
          };
        });

        const anyEligible = giResults.some((r) => r.eligible);

        return {
          carrierId: carrier.id,
          carrierName: carrier.name,
          portalUrl: carrier.portalUrl,
          eligible: anyEligible,
          acceptancePct: anyEligible ? 15 : 0,
          tierPlacement: "Guaranteed Issue",
          productResults: giResults,
          declineReasons: anyEligible ? [] : ["No guaranteed issue products match criteria"],
          notes: ["Standard products declined due to health conditions; guaranteed issue may be available"],
        };
      }

      return {
        carrierId: carrier.id,
        carrierName: carrier.name,
        portalUrl: carrier.portalUrl,
        eligible: false,
        acceptancePct: 0,
        tierPlacement: null,
        productResults: [],
        declineReasons: ["Health conditions disqualify from all products"],
        notes: [],
      };
    }

    // 5. Evaluate each product
    const requestedTypes =
      input.productTypes.length > 0
        ? input.productTypes
        : (["term", "whole_life", "iul", "final_expense"] as ProductType[]);

    const productResults: ProductResult[] = carrier.products.map((product) => {
      const evalResult = evaluateProduct(
        product,
        age,
        input.state,
        input.coverageAmount,
        requestedTypes,
        carrier
      );

      const premium = evalResult.eligible
        ? estimatePremium(
            carrier,
            product,
            age,
            input.gender,
            smoker,
            Math.min(input.coverageAmount, product.faceAmountMax),
            tier.multiplier
          )
        : undefined;

      return {
        productId: product.id,
        productName: product.name,
        productType: product.type,
        eligible: evalResult.eligible,
        premiumEstimateMin: premium?.min,
        premiumEstimateMax: premium?.max,
        notes: evalResult.notes,
      };
    });

    const anyEligible = productResults.some((r) => r.eligible);

    // 6. Score acceptance
    const acceptancePct = anyEligible
      ? scoreAcceptance(activeConditionIds, tier, smoker, age, carrier, bmi)
      : 0;

    return {
      carrierId: carrier.id,
      carrierName: carrier.name,
      portalUrl: carrier.portalUrl,
      eligible: anyEligible,
      acceptancePct,
      tierPlacement: anyEligible ? tier.tierName : null,
      productResults,
      declineReasons: anyEligible ? [] : ["No products match age/coverage/state criteria"],
      notes,
    };
  });

  // Sort by acceptance percentage (highest first)
  results.sort((a, b) => b.acceptancePct - a.acceptancePct);

  return {
    results,
    inputSummary: {
      age,
      gender: input.gender,
      state: input.state,
      tobaccoStatus: input.tobaccoStatus,
      coverageAmount: input.coverageAmount,
      productTypes:
        input.productTypes.length > 0
          ? input.productTypes
          : ["term", "whole_life", "iul", "final_expense"],
      conditionNames,
    },
  };
}
