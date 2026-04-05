import { CarrierConfig, Product } from "@/lib/carriers/types";

export interface PremiumEstimate {
  min: number;
  max: number;
  isExact: boolean;
}

function interpolateRate(
  rates: Record<number, number>,
  age: number
): number | null {
  const ages = Object.keys(rates)
    .map(Number)
    .sort((a, b) => a - b);

  if (ages.length === 0) return null;

  // Exact match
  if (rates[age] !== undefined) return rates[age];

  // Below minimum
  if (age < ages[0]) return rates[ages[0]];

  // Above maximum
  if (age > ages[ages.length - 1]) return rates[ages[ages.length - 1]];

  // Interpolate between two nearest ages
  let lowerAge = ages[0];
  let upperAge = ages[ages.length - 1];

  for (let i = 0; i < ages.length - 1; i++) {
    if (ages[i] <= age && ages[i + 1] >= age) {
      lowerAge = ages[i];
      upperAge = ages[i + 1];
      break;
    }
  }

  const lowerRate = rates[lowerAge];
  const upperRate = rates[upperAge];
  const ratio = (age - lowerAge) / (upperAge - lowerAge);

  return lowerRate + (upperRate - lowerRate) * ratio;
}

function calculateFromRateTable(
  product: Product,
  age: number,
  gender: string,
  smoker: boolean,
  coverageAmount: number,
  tierMultiplier: number
): PremiumEstimate | null {
  const rateTable = product.rateTable;
  if (!rateTable) return null;

  // Build rate key
  const tierPrefix = tierMultiplier <= 1.0 ? "preferred" :
    tierMultiplier <= 1.3 ? "standard" : "modified";
  const genderKey = gender === "male" ? "male" : "female";
  const smokerKey = smoker ? "smoker" : "nonsmoker";
  const rateKey = `${tierPrefix}_${genderKey}_${smokerKey}`;

  const rates = rateTable.rates[rateKey];
  if (!rates) return null;

  const ratePerThousand = interpolateRate(rates, age);
  if (ratePerThousand === null) return null;

  const units = coverageAmount / 1000;
  const annualPremium = ratePerThousand * units + rateTable.policyFeeAnnual;
  const monthlyPremium = annualPremium * rateTable.monthlyFactor;

  return {
    min: Math.round(monthlyPremium * 100) / 100,
    max: Math.round(monthlyPremium * 100) / 100,
    isExact: true,
  };
}

function estimateFromFormula(
  age: number,
  gender: string,
  smoker: boolean,
  coverageAmount: number,
  tierMultiplier: number,
  productType: string
): PremiumEstimate {
  // Industry-average base rate per $1,000 per month (non-tobacco, male, standard)
  // Uses an exponential age curve calibrated to public sample rates
  const baseRate = 0.04 * Math.exp(0.045 * age);

  const genderFactor = gender === "female" ? 0.82 : 1.0;
  const smokerFactor = smoker ? 2.2 : 1.0;

  // Product type adjustment
  let productFactor = 1.0;
  switch (productType) {
    case "term":
      productFactor = 0.6;
      break;
    case "whole_life":
      productFactor = 2.5;
      break;
    case "iul":
      productFactor = 2.0;
      break;
    case "final_expense":
      productFactor = 3.0;
      break;
  }

  const units = coverageAmount / 1000;
  const monthlyBase =
    baseRate *
    units *
    tierMultiplier *
    genderFactor *
    smokerFactor *
    productFactor;

  // Add uncertainty range (±15%)
  const min = Math.round(monthlyBase * 0.85 * 100) / 100;
  const max = Math.round(monthlyBase * 1.15 * 100) / 100;

  return { min: Math.max(min, 5), max: Math.max(max, 10), isExact: false };
}

export function estimatePremium(
  carrier: CarrierConfig,
  product: Product,
  age: number,
  gender: string,
  smoker: boolean,
  coverageAmount: number,
  tierMultiplier: number
): PremiumEstimate | null {
  // Try exact rate table first
  const exact = calculateFromRateTable(
    product,
    age,
    gender,
    smoker,
    coverageAmount,
    tierMultiplier
  );
  if (exact) return exact;

  // Fall back to formula estimate
  return estimateFromFormula(
    age,
    gender,
    smoker,
    coverageAmount,
    tierMultiplier,
    product.type
  );
}
