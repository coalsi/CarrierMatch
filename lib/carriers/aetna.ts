import { CarrierConfig } from "./types";

export const aetna: CarrierConfig = {
  id: "aetna",
  name: "Aetna",
  portalUrl: "https://www.aetnaseniorproducts.com/",
  stateExclusions: ["NY"],
  productStateExclusions: {},
  tobaccoPolicy: {
    lookbackMonths: 12,
    cigarException: false,
    vapingIsTobacco: true,
  },
  knockoutConditions: [
    "alzheimers", "dementia", "als", "huntingtons", "hiv",
    "organ_transplant", "dialysis", "terminal_illness",
    "wheelchair", "nursing_home", "adl_assistance", "oxygen_use",
    "chf", "cancer_active", "cancer_multiple", "sickle_cell",
    "cystic_fibrosis", "cerebral_palsy", "muscular_dystrophy",
    "amputation_disease", "pending_treatment", "pulmonary_fibrosis",
  ],
  underwritingTiers: [
    {
      id: "super-preferred",
      name: "Super Preferred",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 0.9,
    },
    {
      id: "preferred",
      name: "Preferred",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.0,
    },
    {
      id: "standard",
      name: "Standard",
      triggerConditions: ["parkinsons", "ms", "lupus", "copd"],
      isGraded: false,
      premiumMultiplier: 1.3,
    },
    {
      id: "modified",
      name: "Modified",
      triggerConditions: ["alcohol_abuse", "drug_abuse", "diabetes_complications", "kidney_disease", "liver_disease", "heart_attack", "stroke", "angina", "heart_surgery", "aneurysm"],
      lookbackMonths: 24,
      isGraded: true,
      premiumMultiplier: 1.6,
    },
  ],
  products: [
    {
      id: "aetna-accendo-fe",
      name: "Accendo Final Expense Whole Life",
      type: "final_expense",
      issueAgeMin: 40,
      issueAgeMax: 89,
      faceAmountMin: 2000,
      faceAmountMax: 50000,
      faceAmountMaxByAge: [
        { minAge: 40, maxAge: 55, max: 50000 },
        { minAge: 56, maxAge: 65, max: 40000 },
        { minAge: 66, maxAge: 75, max: 30000 },
        { minAge: 76, maxAge: 89, max: 25000 },
      ],
      underwritingType: "simplified",
      rateTable: {
        basisAge: "last_birthday",
        policyFeeAnnual: 40,
        monthlyFactor: 0.0875,
        rates: {
          preferred_male_nonsmoker: {
            40: 26.2, 45: 30.2, 50: 35.3, 55: 46.4, 60: 56.0, 65: 62.5,
            70: 86.1, 75: 111.9, 80: 156.3, 85: 219.8, 89: 404.6,
          },
          preferred_male_smoker: {
            40: 35.3, 45: 42.3, 50: 50.4, 55: 59.5, 60: 75.4, 65: 90.7,
            70: 133.5, 75: 175.4, 80: 257.1, 85: 378.0, 89: 650.0,
          },
          preferred_female_nonsmoker: {
            40: 23.2, 45: 25.2, 50: 27.2, 55: 35.3, 60: 43.9, 65: 50.4,
            70: 66.5, 75: 82.7, 80: 111.9, 85: 152.2, 89: 310.6,
          },
          preferred_female_smoker: {
            40: 34.3, 45: 38.3, 50: 43.3, 55: 47.4, 60: 56.8, 65: 66.5,
            70: 92.5, 75: 115.9, 80: 176.4, 85: 240.9, 89: 434.5,
          },
          standard_male_nonsmoker: {
            40: 29.2, 45: 35.3, 50: 42.3, 55: 51.4, 60: 60.4, 65: 86.7,
            70: 114.9, 75: 160.3, 80: 227.8, 85: 352.8, 89: 575.6,
          },
          standard_male_smoker: {
            40: 52.4, 45: 55.4, 50: 58.5, 55: 74.6, 60: 89.0, 65: 144.2,
            70: 204.6, 75: 305.5, 80: 398.1, 85: 565.8, 89: 917.0,
          },
          standard_female_nonsmoker: {
            40: 24.2, 45: 30.2, 50: 33.8, 55: 46.4, 60: 51.2, 65: 66.5,
            70: 88.5, 75: 107.9, 80: 158.3, 85: 247.4, 89: 441.4,
          },
          standard_female_smoker: {
            40: 34.9, 45: 43.3, 50: 54.4, 55: 62.5, 60: 70.3, 65: 98.8,
            70: 131.0, 75: 159.3, 80: 245.0, 85: 358.6, 89: 612.6,
          },
          modified_male_nonsmoker: {
            40: 36.3, 45: 43.4, 50: 54.6, 55: 62.8, 60: 76.6, 65: 113.1,
            70: 135.9, 75: 207.7,
          },
          modified_male_smoker: {
            40: 55.4, 45: 60.2, 50: 68.5, 55: 81.0, 60: 100.8, 65: 147.1,
            70: 198.3, 75: 272.0,
          },
          modified_female_nonsmoker: {
            40: 32.2, 45: 36.3, 50: 42.8, 55: 51.9, 60: 59.4, 65: 73.7,
            70: 97.6, 75: 160.9,
          },
          modified_female_smoker: {
            40: 39.3, 45: 48.8, 50: 63.8, 55: 73.7, 60: 83.6, 65: 118.4,
            70: 155.8, 75: 202.5,
          },
        },
      },
    },
  ],
};
