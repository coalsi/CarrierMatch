export type ConditionCategory =
  | "cardiac"
  | "cancer"
  | "respiratory"
  | "neurological"
  | "metabolic"
  | "organ_disease"
  | "autoimmune"
  | "mental_health"
  | "substance_abuse"
  | "mobility"
  | "infectious"
  | "blood"
  | "other";

export const categoryLabels: Record<ConditionCategory, string> = {
  cardiac: "Heart & Circulatory",
  cancer: "Cancer",
  respiratory: "Respiratory",
  neurological: "Neurological",
  metabolic: "Metabolic & Endocrine",
  organ_disease: "Organ Disease",
  autoimmune: "Autoimmune",
  mental_health: "Mental Health",
  substance_abuse: "Substance Abuse",
  mobility: "Mobility & ADL",
  infectious: "Infectious Disease",
  blood: "Blood Disorders",
  other: "Other",
};

export const categoryOrder: ConditionCategory[] = [
  "cardiac",
  "cancer",
  "respiratory",
  "neurological",
  "metabolic",
  "organ_disease",
  "autoimmune",
  "mental_health",
  "substance_abuse",
  "mobility",
  "infectious",
  "blood",
  "other",
];
