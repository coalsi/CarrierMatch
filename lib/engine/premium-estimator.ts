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

// Known monthly premiums scraped from public carrier sites and comparison tools.
// Format: carrierId → productType → gender_tobacco → age → monthly premium for $250K coverage
// These are Preferred/Best available rates. We scale for tier, coverage, and smoker.
const KNOWN_RATES: Record<string, Record<string, Record<string, Record<number, number>>>> = {
  // Corebridge Direct — scraped from corebridgedirect.com, $250K 20yr term, Preferred Plus
  corebridge: {
    term: {
      male_nonsmoker: { 30: 15.50, 35: 17.20, 40: 20.64, 45: 30.50, 50: 43.51, 55: 62.00, 60: 95.00, 65: 145.00, 70: 225.00 },
      female_nonsmoker: { 30: 14.00, 35: 15.80, 40: 19.68, 45: 26.50, 50: 35.92, 55: 50.00, 60: 75.00, 65: 115.00, 70: 180.00 },
    },
  },
  // Transamerica — from MoneyGeek/NerdWallet public comparisons, $500K 20yr term
  // Halved to approximate $250K (not exact due to banding, but close)
  transamerica: {
    term: {
      male_nonsmoker: { 30: 13.50, 35: 15.50, 40: 19.00, 45: 27.00, 50: 40.00, 55: 58.00, 60: 88.00, 65: 135.00, 70: 210.00 },
      female_nonsmoker: { 30: 11.50, 35: 13.50, 40: 17.00, 45: 23.00, 50: 33.00, 55: 47.00, 60: 70.00, 65: 108.00, 70: 170.00 },
    },
  },
  // Mutual of Omaha — Living Promise GI final expense, from agent sites
  "mutual-of-omaha": {
    final_expense: {
      male_nonsmoker: { 45: 28.00, 50: 35.00, 55: 42.00, 60: 52.00, 65: 65.00, 70: 85.00, 75: 106.00, 80: 145.00, 85: 206.00 },
      female_nonsmoker: { 45: 22.00, 50: 27.00, 55: 33.00, 60: 40.00, 65: 50.00, 70: 66.00, 75: 82.00, 80: 116.00, 85: 165.00 },
    },
  },
};

function estimateFromKnownRates(
  carrierId: string,
  productType: string,
  age: number,
  gender: string,
  smoker: boolean,
  coverageAmount: number,
  tierMultiplier: number
): PremiumEstimate | null {
  const carrierRates = KNOWN_RATES[carrierId];
  if (!carrierRates) return null;

  const typeRates = carrierRates[productType];
  if (!typeRates) return null;

  const genderKey = gender === "male" ? "male" : "female";
  const rateKey = `${genderKey}_nonsmoker`; // base rates are nonsmoker
  const rates = typeRates[rateKey];
  if (!rates) return null;

  const baseMonthly = interpolateRate(rates, age);
  if (baseMonthly === null) return null;

  // The known rates are for $250K (term) or $10K (final expense) at best tier
  const knownCoverage = productType === "final_expense" ? 10000 : 250000;

  // Scale for actual coverage amount (roughly linear with slight discount for higher amounts)
  const coverageRatio = coverageAmount / knownCoverage;
  let scaledMonthly = baseMonthly * coverageRatio;

  // Apply tier adjustment (known rates are best/preferred, multiplier adjusts)
  // Best tier is ~0.65-0.75 multiplier, so divide by that to get "base" then multiply by actual tier
  const bestTierMultiplier = 0.7;
  scaledMonthly = (scaledMonthly / bestTierMultiplier) * tierMultiplier;

  // Smoker surcharge
  if (smoker) scaledMonthly *= 2.2;

  // Return with smaller uncertainty range (±10%) since we have real data points
  const min = Math.round(scaledMonthly * 0.9 * 100) / 100;
  const max = Math.round(scaledMonthly * 1.1 * 100) / 100;

  return { min: Math.max(min, 5), max: Math.max(max, 10), isExact: false };
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
  // 1. Try exact rate table first (Aetna has full tables)
  const exact = calculateFromRateTable(
    product,
    age,
    gender,
    smoker,
    coverageAmount,
    tierMultiplier
  );
  if (exact) return exact;

  // 2. Try carrier-specific known rates (scraped from public sites)
  const known = estimateFromKnownRates(
    carrier.id,
    product.type,
    age,
    gender,
    smoker,
    coverageAmount,
    tierMultiplier
  );
  if (known) return known;

  // 3. Fall back to generic formula estimate
  return estimateFromFormula(
    age,
    gender,
    smoker,
    coverageAmount,
    tierMultiplier,
    product.type
  );
}
