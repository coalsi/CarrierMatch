import { carriers } from "@/lib/carriers";
import { CarrierConfig, Product, ProductType } from "@/lib/carriers/types";
import { getConditionById } from "@/lib/conditions/fuzzy-matcher";
import { QuoteInput, QuoteOutput, CarrierResult, ProductResult } from "./types";
import { estimatePremium } from "./premium-estimator";
import { scoreAcceptance } from "./acceptance-scorer";

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

function determineTier(
  carrier: CarrierConfig,
  conditionIds: string[],
  smoker: boolean
): { tierId: string; tierName: string; isGraded: boolean; multiplier: number } {
  // Default: best available tier
  const tiers = carrier.underwritingTiers;

  // Separate tobacco and non-tobacco tiers
  const applicableTiers = tiers.filter((t) => {
    const isTobaccoTier =
      t.name.toLowerCase().includes("tobacco") ||
      t.name.toLowerCase().includes("smoker") ||
      t.name.toLowerCase().includes("nicotine");
    if (smoker) return isTobaccoTier || !t.name.toLowerCase().includes("non");
    return !isTobaccoTier || t.name.toLowerCase().includes("non");
  });

  // Find the worst tier that any condition triggers
  let worstTierIndex = 0;
  for (const condId of conditionIds) {
    for (let i = 0; i < applicableTiers.length; i++) {
      const tier = applicableTiers[i];
      if (tier.triggerConditions.includes(condId) && i > worstTierIndex) {
        worstTierIndex = i;
      }
    }
  }

  // If no conditions trigger any tier, use the best tier for the tobacco class
  const selectedTier = applicableTiers[worstTierIndex] ?? tiers[0];

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
  const conditionNames = input.conditionIds
    .map((id) => getConditionById(id)?.name ?? id)
    .filter(Boolean);

  const results: CarrierResult[] = carriers.map((carrier) => {
    const declineReasons: string[] = [];
    const notes: string[] = [];

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

    // 3. Check knockouts
    const knockout = hasKnockout(carrier, input.conditionIds);

    // 4. Determine tier (even if knocked out, for GI products)
    const tier = determineTier(carrier, input.conditionIds, smoker);

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
      ? scoreAcceptance(input.conditionIds, tier, smoker, age, carrier)
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
