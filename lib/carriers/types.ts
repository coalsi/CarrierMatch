export type ProductType = "term" | "whole_life" | "iul" | "final_expense";

export type UnderwritingType =
  | "simplified"
  | "fully_underwritten"
  | "guaranteed";

export type ConditionEffect =
  | "knockout"
  | "graded"
  | "modified"
  | "rated"
  | "standard_only"
  | "preferred_exclusion"
  | "non_factor";

export interface GradedBenefitSchedule {
  years: { year: number; benefitPct: number }[];
  accidentalDeathFullBenefit: boolean;
  returnOfPremiumPct?: number;
}

export interface RateTable {
  basisAge: "last_birthday" | "nearest_birthday";
  policyFeeAnnual: number;
  rates: Record<string, Record<number, number>>;
  monthlyFactor: number;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  issueAgeMin: number;
  issueAgeMax: number;
  issueAgeMaxSmoker?: number;
  faceAmountMin: number;
  faceAmountMax: number;
  faceAmountMaxByAge?: { minAge: number; maxAge: number; max: number }[];
  termLengths?: number[];
  underwritingType: UnderwritingType;
  gradedBenefit?: GradedBenefitSchedule;
  rateTable?: RateTable;
}

export interface TobaccoPolicy {
  lookbackMonths: number;
  preferredLookbackMonths?: number;
  cigarException: boolean;
  vapingIsTobacco: boolean;
}

export interface UnderwritingTier {
  id: string;
  name: string;
  triggerConditions: string[];
  lookbackMonths?: number;
  isGraded: boolean;
  premiumMultiplier: number;
}

export interface CarrierConfig {
  id: string;
  name: string;
  portalUrl: string;
  stateExclusions: string[];
  productStateExclusions: Record<string, string[]>;
  tobaccoPolicy: TobaccoPolicy;
  knockoutConditions: string[];
  underwritingTiers: UnderwritingTier[];
  products: Product[];
}
