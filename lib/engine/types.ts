import { ProductType } from "@/lib/carriers/types";

export interface QuoteInput {
  dateOfBirth: string; // ISO date string
  gender: "male" | "female";
  state: string; // 2-letter state code
  tobaccoStatus: "never" | "quit" | "current";
  tobaccoQuitMonths?: number;
  coverageAmount: number;
  productTypes: ProductType[];
  conditionIds: string[];
}

export interface ProductResult {
  productId: string;
  productName: string;
  productType: ProductType;
  eligible: boolean;
  premiumEstimateMin?: number;
  premiumEstimateMax?: number;
  notes: string[];
}

export interface CarrierResult {
  carrierId: string;
  carrierName: string;
  portalUrl: string;
  eligible: boolean;
  acceptancePct: number;
  tierPlacement: string | null;
  productResults: ProductResult[];
  declineReasons: string[];
  notes: string[];
}

export interface QuoteOutput {
  results: CarrierResult[];
  inputSummary: {
    age: number;
    gender: string;
    state: string;
    tobaccoStatus: string;
    coverageAmount: number;
    productTypes: ProductType[];
    conditionNames: string[];
  };
}
