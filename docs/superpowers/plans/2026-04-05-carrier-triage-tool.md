# Life Insurance Carrier Triage Tool ��� Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an agent-facing Next.js tool that matches life insurance applicants to eligible carriers based on health, demographics, and coverage needs.

**Architecture:** Static rules engine with 6 carrier configs, a deterministic matching pipeline, fuzzy health condition autocomplete, and SQLite persistence. Server Actions handle form submission and search retrieval. No auth.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), Tailwind CSS 4, Prisma + SQLite, Fuse.js, Framer Motion

---

## File Structure

```
ryan-tool/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── results/[id]/page.tsx
│   ���── history/page.tsx
│   └── actions.ts
├─�� components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── slider.tsx
│   │   ├── badge.tsx
│   │   └── gauge.tsx
│   ├── form/
│   │   ├── quote-form.tsx
│   │   ├── date-of-birth-picker.tsx
│   │   ├── gender-toggle.tsx
│   │   ├── state-selector.tsx
│   │   ├── tobacco-toggle.tsx
│   │   ├── coverage-slider.tsx
│   │   ├── product-selector.tsx
│   │   └── condition-input.tsx
│   └── results/
│       ├── carrier-card.tsx
│       ├── acceptance-gauge.tsx
│       ├── premium-estimate.tsx
│       └── results-summary.tsx
��── lib/
│   ├── carriers/
│   │   ├── types.ts
│   │   ├── americo.ts
│   │   ├── corebridge.ts
│   │   ├── transamerica.ts
│   │   ├── aetna.ts
│   │   ├── american-amicable.ts
│   │   ├── mutual-of-omaha.ts
│   │   └── index.ts
│   ├── engine/
│   │   ├── types.ts
│   │   ├── matcher.ts
│   │   ├── premium-estimator.ts
│   │   └── acceptance-scorer.ts
│   ├── conditions/
│   │   ├── master-list.ts
│   │   ├── categories.ts
│   │   └── fuzzy-matcher.ts
│   └��─ db.ts
├── prisma/
│   └── schema.prisma
├── __tests__/
│   ├── engine/
│   │   ├── matcher.test.ts
│   │   ├── premium-estimator.test.ts
│   │   └─��� acceptance-scorer.test.ts
│   └── conditions/
│       └── fuzzy-matcher.test.ts
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── .gitignore
└── jest.config.ts
```

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.gitignore`, `jest.config.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `prisma/schema.prisma`, `lib/db.ts`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx create-next-app@latest . --typescript --tailwind --eslint --app --src=false --import-alias="@/*" --turbopack --yes
```

- [ ] **Step 2: Install additional dependencies**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npm install prisma @prisma/client fuse.js framer-motion
npm install -D jest @jest/globals ts-jest @types/jest
```

- [ ] **Step 3: Create Jest config**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
};

export default config;
```

- [ ] **Step 4: Create Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Search {
  id                String   @id @default(cuid())
  createdAt         DateTime @default(now())
  dateOfBirth       DateTime
  gender            String
  state             String
  tobaccoStatus     String
  tobaccoQuitMonths Int?
  coverageAmount    Int
  productTypes      String
  conditions        String
  results           Result[]
}

model Result {
  id              String  @id @default(cuid())
  searchId        String
  search          Search  @relation(fields: [searchId], references: [id], onDelete: Cascade)
  carrierId       String
  carrierName     String
  eligible        Boolean
  acceptancePct   Int
  tierPlacement   String?
  productResults  String
  declineReasons  String?
  notes           String?
}
```

- [ ] **Step 5: Generate Prisma client and create DB**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx prisma generate
npx prisma db push
```

- [ ] **Step 6: Create Prisma client singleton**

Create `lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 7: Update .gitignore**

Append to `.gitignore`:

```
prisma/dev.db
prisma/dev.db-journal
```

- [ ] **Step 8: Set up globals.css with design tokens**

Replace `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --color-slate-950: #0f172a;
  --color-slate-900: #0e1629;
  --color-slate-800: #1e293b;
  --color-slate-700: #334155;
  --color-slate-600: #475569;
  --color-slate-500: #64748b;
  --color-slate-400: #94a3b8;
  --color-slate-300: #cbd5e1;
  --color-slate-200: #e2e8f0;
  --color-slate-100: #f1f5f9;

  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-light: #60a5fa;

  --color-success: #10b981;
  --color-success-light: #34d399;
  --color-warning: #f59e0b;
  --color-warning-light: #fbbf24;
  --color-danger: #f43f5e;
  --color-danger-light: #fb7185;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

body {
  background-color: var(--color-slate-950);
  color: var(--color-slate-200);
  font-family: var(--font-sans);
}
```

- [ ] **Step 9: Create root layout**

Replace `app/layout.tsx` with:

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarrierMatch — Life Insurance Carrier Triage",
  description: "Find eligible life insurance carriers in seconds",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Create placeholder page**

Replace `app/page.tsx` with:

```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold text-white">CarrierMatch</h1>
    </main>
  );
}
```

- [ ] **Step 11: Verify the app builds and runs**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npm run build
```

Expected: Build succeeds with zero errors.

- [ ] **Step 12: Initialize git and commit**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
git init
git add -A
git commit -m "feat: scaffold Next.js project with Prisma, Tailwind, Jest"
```

---

### Task 2: Carrier Type Definitions & Condition Master List

**Files:**
- Create: `lib/carriers/types.ts`, `lib/conditions/categories.ts`, `lib/conditions/master-list.ts`

- [ ] **Step 1: Create carrier type definitions**

Create `lib/carriers/types.ts`:

```typescript
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
  rates: Record<string, Record<number, number>>; // "male_nonsmoker" → age → rate per $1,000
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
```

- [ ] **Step 2: Create condition categories**

Create `lib/conditions/categories.ts`:

```typescript
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
```

- [ ] **Step 3: Create master condition list**

Create `lib/conditions/master-list.ts`:

```typescript
import { ConditionCategory } from "./categories";
import { ConditionEffect } from "@/lib/carriers/types";

export interface ConditionImpact {
  effect: ConditionEffect;
  lookbackMonths?: number;
  notes?: string;
}

export interface Condition {
  id: string;
  name: string;
  aliases: string[];
  category: ConditionCategory;
  severityWeight: number;
  carrierImpact: Record<string, ConditionImpact>;
}

export const masterConditionList: Condition[] = [
  // === CARDIAC ===
  {
    id: "chf",
    name: "Congestive Heart Failure",
    aliases: ["CHF", "heart failure", "weak heart", "cardiac failure"],
    category: "cardiac",
    severityWeight: 14,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout", notes: "CHF with defibrillator is knockout; without may be graded" },
      transamerica: { effect: "graded", lookbackMonths: 24, notes: "Graded if within 2 years; standard if older" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "heart_attack",
    name: "Heart Attack",
    aliases: ["myocardial infarction", "MI", "cardiac arrest", "coronary event"],
    category: "cardiac",
    severityWeight: 12,
    carrierImpact: {
      americo: { effect: "standard_only", lookbackMonths: 24 },
      corebridge: { effect: "rated", lookbackMonths: 24 },
      transamerica: { effect: "standard_only", lookbackMonths: 24, notes: "Graded if within 2 years" },
      aetna: { effect: "modified", lookbackMonths: 12, notes: "Standard if 1-2 years; Preferred if 2+ years" },
      "american-amicable": { effect: "graded", lookbackMonths: 36, notes: "Immediate if 3+ years ago" },
      "mutual-of-omaha": { effect: "rated", lookbackMonths: 12 },
    },
  },
  {
    id: "angina",
    name: "Angina",
    aliases: ["chest pain", "angina pectoris"],
    category: "cardiac",
    severityWeight: 10,
    carrierImpact: {
      americo: { effect: "standard_only", lookbackMonths: 24 },
      corebridge: { effect: "rated", lookbackMonths: 24 },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "modified", lookbackMonths: 12, notes: "Standard if 1-2 yrs; Preferred if 2+" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated", lookbackMonths: 12 },
    },
  },
  {
    id: "stroke",
    name: "Stroke",
    aliases: ["CVA", "cerebrovascular accident", "brain attack"],
    category: "cardiac",
    severityWeight: 12,
    carrierImpact: {
      americo: { effect: "standard_only", lookbackMonths: 24 },
      corebridge: { effect: "rated", lookbackMonths: 24 },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "modified", lookbackMonths: 12, notes: "Standard if 1-2 yrs" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated", lookbackMonths: 12 },
    },
  },
  {
    id: "tia",
    name: "TIA (Mini-Stroke)",
    aliases: ["transient ischemic attack", "mini stroke", "mini-stroke"],
    category: "cardiac",
    severityWeight: 8,
    carrierImpact: {
      americo: { effect: "standard_only", lookbackMonths: 24 },
      corebridge: { effect: "rated", lookbackMonths: 24 },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "modified", lookbackMonths: 12 },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated", lookbackMonths: 12 },
    },
  },
  {
    id: "afib",
    name: "Atrial Fibrillation",
    aliases: ["AFib", "A-Fib", "irregular heartbeat", "arrhythmia"],
    category: "cardiac",
    severityWeight: 7,
    carrierImpact: {
      americo: { effect: "preferred_exclusion" },
      corebridge: { effect: "rated" },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "non_factor", notes: "Not specifically screened" },
      "american-amicable": { effect: "preferred_exclusion", notes: "Qualifies for immediate benefit" },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "cardiomyopathy",
    name: "Cardiomyopathy",
    aliases: ["enlarged heart", "heart muscle disease"],
    category: "cardiac",
    severityWeight: 12,
    carrierImpact: {
      americo: { effect: "standard_only", lookbackMonths: 24 },
      corebridge: { effect: "rated" },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "modified", lookbackMonths: 12 },
      "american-amicable": { effect: "graded", lookbackMonths: 24 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "heart_surgery",
    name: "Heart / Circulatory Surgery",
    aliases: ["bypass surgery", "CABG", "stent", "angioplasty", "pacemaker", "valve replacement", "heart valve"],
    category: "cardiac",
    severityWeight: 11,
    carrierImpact: {
      americo: { effect: "standard_only", lookbackMonths: 24 },
      corebridge: { effect: "rated" },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "modified", lookbackMonths: 12 },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "aneurysm",
    name: "Aneurysm",
    aliases: ["aortic aneurysm", "brain aneurysm", "cerebral aneurysm"],
    category: "cardiac",
    severityWeight: 11,
    carrierImpact: {
      americo: { effect: "standard_only", lookbackMonths: 24 },
      corebridge: { effect: "knockout", notes: "Brain aneurysm or recurrent TIA is knockout" },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "modified", lookbackMonths: 12 },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "hypertension",
    name: "High Blood Pressure",
    aliases: ["hypertension", "elevated blood pressure", "HBP"],
    category: "cardiac",
    severityWeight: 3,
    carrierImpact: {
      americo: { effect: "non_factor", notes: "Not a knockout; may affect tier on fully UW" },
      corebridge: { effect: "preferred_exclusion", notes: "Controlled may still get preferred" },
      transamerica: { effect: "preferred_exclusion", notes: "Controlled on meds can get preferred" },
      aetna: { effect: "non_factor", notes: "Accepted at preferred level" },
      "american-amicable": { effect: "preferred_exclusion", notes: "Meds in 10 yrs disqualifies from preferred term" },
      "mutual-of-omaha": { effect: "preferred_exclusion" },
    },
  },

  // === CANCER ===
  {
    id: "cancer_active",
    name: "Cancer (Active / Recent)",
    aliases: ["active cancer", "cancer treatment", "chemotherapy", "radiation", "chemo", "tumor", "malignant"],
    category: "cancer",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout", lookbackMonths: 24 },
      transamerica: { effect: "knockout", lookbackMonths: 24, notes: "Graded if 2-4 years" },
      aetna: { effect: "knockout", lookbackMonths: 24 },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout", lookbackMonths: 24 },
    },
  },
  {
    id: "cancer_history",
    name: "Cancer (History / Remission)",
    aliases: ["cancer survivor", "cancer remission", "prior cancer", "cancer history"],
    category: "cancer",
    severityWeight: 8,
    carrierImpact: {
      americo: { effect: "standard_only", notes: "Single occurrence, not metastatic" },
      corebridge: { effect: "rated", notes: "Depends on type, stage, time since treatment" },
      transamerica: { effect: "standard_only", lookbackMonths: 48, notes: "Standard if 4+ years" },
      aetna: { effect: "preferred_exclusion", lookbackMonths: 24, notes: "Preferred if 2+ yrs since treatment" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated", notes: "5+ year remission may get standard" },
    },
  },
  {
    id: "cancer_multiple",
    name: "Multiple Cancer Occurrences",
    aliases: ["recurring cancer", "cancer recurrence", "multiple cancers"],
    category: "cancer",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "basal_cell",
    name: "Basal Cell Skin Cancer",
    aliases: ["basal cell carcinoma", "BCC", "squamous cell skin cancer", "non-melanoma skin cancer"],
    category: "cancer",
    severityWeight: 1,
    carrierImpact: {
      americo: { effect: "non_factor" },
      corebridge: { effect: "non_factor" },
      transamerica: { effect: "non_factor" },
      aetna: { effect: "non_factor" },
      "american-amicable": { effect: "non_factor" },
      "mutual-of-omaha": { effect: "non_factor" },
    },
  },

  // === RESPIRATORY ===
  {
    id: "copd",
    name: "COPD",
    aliases: ["chronic obstructive pulmonary disease", "emphysema", "chronic bronchitis"],
    category: "respiratory",
    severityWeight: 9,
    carrierImpact: {
      americo: { effect: "standard_only", notes: "Knockout if requires oxygen" },
      corebridge: { effect: "rated" },
      transamerica: { effect: "standard_only" },
      aetna: { effect: "standard_only" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated", notes: "Knockout if requires oxygen" },
    },
  },
  {
    id: "oxygen_use",
    name: "Supplemental Oxygen Use",
    aliases: ["oxygen therapy", "home oxygen", "O2 dependent"],
    category: "respiratory",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "pulmonary_fibrosis",
    name: "Pulmonary Fibrosis",
    aliases: ["lung fibrosis", "IPF", "idiopathic pulmonary fibrosis"],
    category: "respiratory",
    severityWeight: 14,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "asthma",
    name: "Asthma",
    aliases: ["chronic asthma", "reactive airway"],
    category: "respiratory",
    severityWeight: 4,
    carrierImpact: {
      americo: { effect: "non_factor", notes: "Mild/moderate not screened" },
      corebridge: { effect: "preferred_exclusion" },
      transamerica: { effect: "standard_only", notes: "Chronic asthma" },
      aetna: { effect: "non_factor" },
      "american-amicable": { effect: "non_factor" },
      "mutual-of-omaha": { effect: "preferred_exclusion" },
    },
  },
  {
    id: "sleep_apnea",
    name: "Sleep Apnea",
    aliases: ["obstructive sleep apnea", "OSA", "CPAP"],
    category: "respiratory",
    severityWeight: 3,
    carrierImpact: {
      americo: { effect: "non_factor" },
      corebridge: { effect: "preferred_exclusion", notes: "Treated/controlled accepted favorably" },
      transamerica: { effect: "preferred_exclusion", notes: "Standard with nightly CPAP" },
      aetna: { effect: "non_factor", notes: "CPAP for sleep apnea excluded from oxygen question" },
      "american-amicable": { effect: "non_factor" },
      "mutual-of-omaha": { effect: "preferred_exclusion", notes: "Standard to Table 2 with CPAP" },
    },
  },

  // === NEUROLOGICAL ===
  {
    id: "alzheimers",
    name: "Alzheimer's Disease",
    aliases: ["Alzheimer's", "Alzheimers", "senile dementia"],
    category: "neurological",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "dementia",
    name: "Dementia",
    aliases: ["cognitive decline", "mental incapacity", "cognitive impairment"],
    category: "neurological",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "als",
    name: "ALS (Lou Gehrig's Disease)",
    aliases: ["amyotrophic lateral sclerosis", "Lou Gehrig's", "motor neuron disease"],
    category: "neurological",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "parkinsons",
    name: "Parkinson's Disease",
    aliases: ["Parkinson's", "Parkinsons"],
    category: "neurological",
    severityWeight: 11,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "graded" },
      transamerica: { effect: "standard_only" },
      aetna: { effect: "standard_only" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "ms",
    name: "Multiple Sclerosis",
    aliases: ["MS"],
    category: "neurological",
    severityWeight: 11,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "graded" },
      transamerica: { effect: "standard_only" },
      aetna: { effect: "standard_only" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "huntingtons",
    name: "Huntington's Disease",
    aliases: ["Huntington's", "Huntingtons"],
    category: "neurological",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "seizures",
    name: "Seizure Disorder / Epilepsy",
    aliases: ["epilepsy", "seizures", "convulsions"],
    category: "neurological",
    severityWeight: 7,
    carrierImpact: {
      americo: { effect: "preferred_exclusion" },
      corebridge: { effect: "rated" },
      transamerica: { effect: "standard_only", notes: "12+ seizures in 2 years" },
      aetna: { effect: "non_factor", notes: "Not specifically screened" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },

  // === METABOLIC ===
  {
    id: "diabetes_type2",
    name: "Type 2 Diabetes",
    aliases: ["diabetes", "type 2", "adult onset diabetes", "T2D", "high blood sugar"],
    category: "metabolic",
    severityWeight: 6,
    carrierImpact: {
      americo: { effect: "preferred_exclusion", notes: "Complications are knockout" },
      corebridge: { effect: "preferred_exclusion", notes: "Competitive with controlled A1C" },
      transamerica: { effect: "preferred_exclusion" },
      aetna: { effect: "non_factor", notes: "Accepted at preferred if no complications" },
      "american-amicable": { effect: "preferred_exclusion", notes: "Insulin after 50 OK; before 50 = knockout" },
      "mutual-of-omaha": { effect: "preferred_exclusion", notes: "Controlled without complications: standard" },
    },
  },
  {
    id: "diabetes_complications",
    name: "Diabetes with Complications",
    aliases: ["diabetic retinopathy", "diabetic neuropathy", "diabetic nephropathy", "diabetic coma", "insulin shock"],
    category: "metabolic",
    severityWeight: 13,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout", notes: "Diabetic amputation is knockout" },
      transamerica: { effect: "knockout", notes: "Diabetic coma/amputation is knockout" },
      aetna: { effect: "modified", lookbackMonths: 24 },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },

  // === ORGAN DISEASE ===
  {
    id: "kidney_disease",
    name: "Kidney Disease",
    aliases: ["chronic kidney disease", "CKD", "renal disease", "renal failure", "kidney failure"],
    category: "organ_disease",
    severityWeight: 12,
    carrierImpact: {
      americo: { effect: "knockout", notes: "Dialysis is absolute knockout" },
      corebridge: { effect: "graded" },
      transamerica: { effect: "standard_only", lookbackMonths: 48 },
      aetna: { effect: "modified", lookbackMonths: 24 },
      "american-amicable": { effect: "knockout", notes: "Chronic kidney disease/renal insufficiency" },
      "mutual-of-omaha": { effect: "knockout", notes: "Dialysis is knockout" },
    },
  },
  {
    id: "dialysis",
    name: "Kidney Dialysis",
    aliases: ["dialysis", "hemodialysis", "renal dialysis"],
    category: "organ_disease",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "liver_disease",
    name: "Liver Disease / Cirrhosis",
    aliases: ["cirrhosis", "liver failure", "fatty liver", "liver disease"],
    category: "organ_disease",
    severityWeight: 12,
    carrierImpact: {
      americo: { effect: "knockout", notes: "Severe liver disease" },
      corebridge: { effect: "graded" },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "modified", lookbackMonths: 24 },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "organ_transplant",
    name: "Organ Transplant",
    aliases: ["transplant", "organ recipient", "kidney transplant", "liver transplant", "heart transplant", "bone marrow transplant"],
    category: "organ_disease",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "hepatitis_c",
    name: "Hepatitis C",
    aliases: ["Hep C", "HCV"],
    category: "organ_disease",
    severityWeight: 10,
    carrierImpact: {
      americo: { effect: "standard_only" },
      corebridge: { effect: "rated" },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "non_factor", notes: "Not specifically screened" },
      "american-amicable": { effect: "graded", lookbackMonths: 24 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },

  // === AUTOIMMUNE ===
  {
    id: "lupus",
    name: "Systemic Lupus (SLE)",
    aliases: ["lupus", "SLE", "systemic lupus erythematosus"],
    category: "autoimmune",
    severityWeight: 10,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "graded" },
      transamerica: { effect: "standard_only" },
      aetna: { effect: "standard_only" },
      "american-amicable": { effect: "graded", lookbackMonths: 24 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },

  // === MENTAL HEALTH ===
  {
    id: "depression",
    name: "Depression",
    aliases: ["major depression", "clinical depression", "MDD", "major depressive disorder"],
    category: "mental_health",
    severityWeight: 3,
    carrierImpact: {
      americo: { effect: "non_factor" },
      corebridge: { effect: "preferred_exclusion", notes: "Mild may still get preferred" },
      transamerica: { effect: "preferred_exclusion", notes: "Under 50: standard within 5 years" },
      aetna: { effect: "non_factor", notes: "Accepted at preferred" },
      "american-amicable": { effect: "non_factor", notes: "Qualifies for immediate benefit" },
      "mutual-of-omaha": { effect: "preferred_exclusion", notes: "Controlled with meds: standard" },
    },
  },
  {
    id: "bipolar",
    name: "Bipolar Disorder",
    aliases: ["bipolar", "manic depression", "manic depressive"],
    category: "mental_health",
    severityWeight: 5,
    carrierImpact: {
      americo: { effect: "non_factor" },
      corebridge: { effect: "graded" },
      transamerica: { effect: "standard_only", lookbackMonths: 60, notes: "Under 50" },
      aetna: { effect: "non_factor", notes: "Accepted at preferred" },
      "american-amicable": { effect: "non_factor", notes: "Qualifies for immediate benefit" },
      "mutual-of-omaha": { effect: "preferred_exclusion" },
    },
  },
  {
    id: "schizophrenia",
    name: "Schizophrenia",
    aliases: ["psychosis", "psychotic disorder"],
    category: "mental_health",
    severityWeight: 8,
    carrierImpact: {
      americo: { effect: "non_factor" },
      corebridge: { effect: "knockout", lookbackMonths: 36 },
      transamerica: { effect: "standard_only", lookbackMonths: 60 },
      aetna: { effect: "non_factor", notes: "Accepted at preferred" },
      "american-amicable": { effect: "non_factor", notes: "Qualifies for immediate benefit" },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "ptsd",
    name: "PTSD",
    aliases: ["post-traumatic stress disorder", "post traumatic stress"],
    category: "mental_health",
    severityWeight: 4,
    carrierImpact: {
      americo: { effect: "non_factor" },
      corebridge: { effect: "preferred_exclusion" },
      transamerica: { effect: "standard_only", lookbackMonths: 60 },
      aetna: { effect: "non_factor" },
      "american-amicable": { effect: "non_factor" },
      "mutual-of-omaha": { effect: "preferred_exclusion" },
    },
  },

  // === SUBSTANCE ABUSE ===
  {
    id: "alcohol_abuse",
    name: "Alcohol Abuse",
    aliases: ["alcoholism", "alcohol dependency", "alcohol addiction", "drinking problem"],
    category: "substance_abuse",
    severityWeight: 9,
    carrierImpact: {
      americo: { effect: "standard_only", lookbackMonths: 24 },
      corebridge: { effect: "rated", lookbackMonths: 24 },
      transamerica: { effect: "standard_only", lookbackMonths: 24 },
      aetna: { effect: "modified", lookbackMonths: 24 },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated", lookbackMonths: 24 },
    },
  },
  {
    id: "drug_abuse",
    name: "Drug Abuse",
    aliases: ["substance abuse", "drug addiction", "drug dependency", "illegal drug use", "IV drug use"],
    category: "substance_abuse",
    severityWeight: 12,
    carrierImpact: {
      americo: { effect: "knockout", notes: "Active IV drug use" },
      corebridge: { effect: "rated", lookbackMonths: 24 },
      transamerica: { effect: "standard_only", lookbackMonths: 24, notes: "Illegal use within 1 yr = graded" },
      aetna: { effect: "modified", lookbackMonths: 24 },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated", lookbackMonths: 24 },
    },
  },
  {
    id: "dui",
    name: "DUI / DWI",
    aliases: ["driving under influence", "drunk driving", "DUI conviction"],
    category: "substance_abuse",
    severityWeight: 6,
    carrierImpact: {
      americo: { effect: "preferred_exclusion" },
      corebridge: { effect: "rated", lookbackMonths: 24 },
      transamerica: { effect: "preferred_exclusion" },
      aetna: { effect: "modified", lookbackMonths: 24 },
      "american-amicable": { effect: "preferred_exclusion" },
      "mutual-of-omaha": { effect: "rated", notes: "1 DUI 5+ yrs ago may get standard" },
    },
  },

  // === MOBILITY ===
  {
    id: "wheelchair",
    name: "Wheelchair Dependent",
    aliases: ["wheelchair bound", "mobility scooter", "electric scooter", "wheelchair"],
    category: "mobility",
    severityWeight: 14,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "adl_assistance",
    name: "Needs ADL Assistance",
    aliases: ["activities of daily living", "ADL", "needs help bathing", "needs help dressing", "assisted living"],
    category: "mobility",
    severityWeight: 14,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "nursing_home",
    name: "Nursing Home / Hospice",
    aliases: ["nursing facility", "skilled nursing", "hospice care", "bedridden", "confined"],
    category: "mobility",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },

  // === INFECTIOUS ===
  {
    id: "hiv",
    name: "HIV / AIDS",
    aliases: ["HIV positive", "AIDS", "ARC", "human immunodeficiency virus"],
    category: "infectious",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },

  // === BLOOD ===
  {
    id: "sickle_cell",
    name: "Sickle Cell Anemia",
    aliases: ["sickle cell disease", "sickle cell"],
    category: "blood",
    severityWeight: 13,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },

  // === OTHER ===
  {
    id: "amputation_disease",
    name: "Amputation Due to Disease",
    aliases: ["disease amputation", "diabetic amputation", "limb loss from disease"],
    category: "other",
    severityWeight: 14,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "terminal_illness",
    name: "Terminal Illness",
    aliases: ["terminal", "end stage", "life expectancy under 12 months"],
    category: "other",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "pending_treatment",
    name: "Pending Medical Tests / Surgery",
    aliases: ["awaiting surgery", "pending diagnosis", "scheduled surgery", "pending test results"],
    category: "other",
    severityWeight: 10,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "cerebral_palsy",
    name: "Cerebral Palsy",
    aliases: ["CP"],
    category: "neurological",
    severityWeight: 12,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "rated" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "rated" },
    },
  },
  {
    id: "cystic_fibrosis",
    name: "Cystic Fibrosis",
    aliases: ["CF"],
    category: "respiratory",
    severityWeight: 15,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "knockout" },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "muscular_dystrophy",
    name: "Muscular Dystrophy",
    aliases: ["MD"],
    category: "neurological",
    severityWeight: 14,
    carrierImpact: {
      americo: { effect: "knockout" },
      corebridge: { effect: "knockout" },
      transamerica: { effect: "knockout" },
      aetna: { effect: "knockout" },
      "american-amicable": { effect: "graded", lookbackMonths: 36 },
      "mutual-of-omaha": { effect: "knockout" },
    },
  },
  {
    id: "high_cholesterol",
    name: "High Cholesterol",
    aliases: ["hyperlipidemia", "elevated cholesterol", "hypercholesterolemia"],
    category: "metabolic",
    severityWeight: 2,
    carrierImpact: {
      americo: { effect: "non_factor" },
      corebridge: { effect: "non_factor", notes: "Controlled may still get preferred" },
      transamerica: { effect: "non_factor", notes: "Controlled may get preferred plus" },
      aetna: { effect: "non_factor" },
      "american-amicable": { effect: "preferred_exclusion", notes: "Meds in 10 yrs disqualifies from preferred term" },
      "mutual-of-omaha": { effect: "non_factor" },
    },
  },
  {
    id: "obesity",
    name: "Obesity",
    aliases: ["overweight", "morbid obesity", "high BMI"],
    category: "metabolic",
    severityWeight: 5,
    carrierImpact: {
      americo: { effect: "preferred_exclusion", notes: "Build chart limits apply" },
      corebridge: { effect: "preferred_exclusion", notes: "BMI up to 31.5 for preferred" },
      transamerica: { effect: "preferred_exclusion" },
      aetna: { effect: "non_factor", notes: "No build chart used" },
      "american-amicable": { effect: "preferred_exclusion", notes: "Liberal build chart" },
      "mutual-of-omaha": { effect: "preferred_exclusion" },
    },
  },
];

// Conditions that NO carrier screens for — always "not a factor"
export const nonFactorConditions: string[] = [
  "chicken pox",
  "varicella",
  "common cold",
  "flu",
  "influenza",
  "seasonal allergies",
  "hay fever",
  "allergic rhinitis",
  "minor sprain",
  "minor fracture",
  "broken bone healed",
  "corrected vision",
  "glasses",
  "contacts",
  "nearsighted",
  "farsighted",
  "mild acne",
  "acne",
  "tonsillectomy",
  "tonsils removed",
  "appendectomy",
  "appendix removed",
  "carpal tunnel",
  "wisdom teeth",
  "dental work",
  "stitches",
  "minor burn",
  "ear infection",
  "strep throat",
  "urinary tract infection",
  "UTI",
  "pink eye",
  "conjunctivitis",
  "sinus infection",
  "sinusitis",
  "cold sore",
  "herpes simplex",
  "plantar wart",
  "ingrown toenail",
  "hemorrhoids",
  "tennis elbow",
  "bunion",
  "lactose intolerance",
  "food allergy",
  "motion sickness",
  "vertigo",
  "migraines",
  "tension headache",
  "acid reflux",
  "GERD",
  "irritable bowel syndrome",
  "IBS",
  "eczema",
  "psoriasis",
  "rosacea",
  "vitamin deficiency",
  "iron deficiency",
  "anemia mild",
];
```

- [ ] **Step 4: Commit**

```bash
git add lib/carriers/types.ts lib/conditions/categories.ts lib/conditions/master-list.ts
git commit -m "feat: add carrier types, condition categories, and master condition list"
```

---

### Task 3: Carrier Configuration Files

**Files:**
- Create: `lib/carriers/americo.ts`, `lib/carriers/corebridge.ts`, `lib/carriers/transamerica.ts`, `lib/carriers/aetna.ts`, `lib/carriers/american-amicable.ts`, `lib/carriers/mutual-of-omaha.ts`, `lib/carriers/index.ts`

- [ ] **Step 1: Create Americo config**

Create `lib/carriers/americo.ts`:

```typescript
import { CarrierConfig } from "./types";

export const americo: CarrierConfig = {
  id: "americo",
  name: "Americo",
  portalUrl: "https://www.americo.com/agents/",
  stateExclusions: ["NY"],
  productStateExclusions: {
    "eagle-premier": ["CA", "CT", "NY", "PA", "VT"],
    "ultra-protector-1": ["MS", "NY", "VT"],
    "ultra-protector-3": ["AR", "MA", "MN", "MS", "MT", "NY", "PA", "VT", "WA"],
  },
  tobaccoPolicy: {
    lookbackMonths: 24,
    cigarException: true,
    vapingIsTobacco: true,
  },
  knockoutConditions: [
    "organ_transplant", "ms", "als", "lupus", "alzheimers", "dementia",
    "huntingtons", "parkinsons", "amputation_disease", "liver_disease",
    "wheelchair", "nursing_home", "hospice", "oxygen_use", "adl_assistance",
    "pending_treatment", "hiv", "dialysis", "terminal_illness",
    "diabetes_complications", "cancer_active", "cancer_multiple",
    "sickle_cell", "cystic_fibrosis", "muscular_dystrophy",
    "pulmonary_fibrosis", "drug_abuse",
  ],
  underwritingTiers: [
    {
      id: "standard-non-nicotine",
      name: "Standard Non-Nicotine",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.0,
    },
    {
      id: "standard-nicotine",
      name: "Standard Nicotine",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.8,
    },
    {
      id: "eagle-select-1",
      name: "Eagle Select 1 (Final Expense)",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.0,
    },
    {
      id: "eagle-select-2",
      name: "Eagle Select 2 (Final Expense)",
      triggerConditions: ["diabetes_type2", "heart_attack", "stroke", "tia"],
      lookbackMonths: 24,
      isGraded: false,
      premiumMultiplier: 1.3,
    },
    {
      id: "eagle-select-3",
      name: "Eagle Select 3 (Guaranteed Issue)",
      triggerConditions: [],
      isGraded: true,
      premiumMultiplier: 1.8,
    },
  ],
  products: [
    {
      id: "americo-term-100",
      name: "Term 100",
      type: "term",
      issueAgeMin: 20,
      issueAgeMax: 75,
      faceAmountMin: 25000,
      faceAmountMax: 450000,
      termLengths: [15, 20, 25, 30],
      underwritingType: "simplified",
    },
    {
      id: "americo-iul",
      name: "Instant Decision IUL",
      type: "iul",
      issueAgeMin: 18,
      issueAgeMax: 65,
      faceAmountMin: 50000,
      faceAmountMax: 450000,
      underwritingType: "simplified",
    },
    {
      id: "americo-eagle-select",
      name: "Eagle Select Final Expense",
      type: "final_expense",
      issueAgeMin: 40,
      issueAgeMax: 85,
      faceAmountMin: 5000,
      faceAmountMax: 40000,
      underwritingType: "simplified",
    },
    {
      id: "americo-advantage-wl",
      name: "AdvantageWL Whole Life",
      type: "whole_life",
      issueAgeMin: 18,
      issueAgeMax: 75,
      faceAmountMin: 25000,
      faceAmountMax: 100000,
      underwritingType: "simplified",
    },
  ],
};
```

- [ ] **Step 2: Create Corebridge config**

Create `lib/carriers/corebridge.ts`:

```typescript
import { CarrierConfig } from "./types";

export const corebridge: CarrierConfig = {
  id: "corebridge",
  name: "Corebridge Financial",
  portalUrl: "https://www.corebridgefinancial.com/financial-professional",
  stateExclusions: [],
  productStateExclusions: {},
  tobaccoPolicy: {
    lookbackMonths: 12,
    cigarException: true,
    vapingIsTobacco: true,
  },
  knockoutConditions: [
    "alzheimers", "dementia", "als", "huntingtons", "hiv",
    "organ_transplant", "dialysis", "terminal_illness",
    "wheelchair", "nursing_home", "adl_assistance", "oxygen_use",
    "cancer_active", "cancer_multiple", "sickle_cell",
    "cystic_fibrosis", "muscular_dystrophy", "pulmonary_fibrosis",
    "amputation_disease", "pending_treatment",
  ],
  underwritingTiers: [
    {
      id: "preferred-plus-nt",
      name: "Preferred Plus Non-Tobacco",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 0.7,
    },
    {
      id: "preferred-nt",
      name: "Preferred Non-Tobacco",
      triggerConditions: ["hypertension", "high_cholesterol", "sleep_apnea"],
      isGraded: false,
      premiumMultiplier: 0.85,
    },
    {
      id: "standard-nt",
      name: "Standard Non-Tobacco",
      triggerConditions: ["diabetes_type2", "depression", "afib", "asthma", "obesity"],
      isGraded: false,
      premiumMultiplier: 1.0,
    },
    {
      id: "preferred-tobacco",
      name: "Preferred Tobacco",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.6,
    },
    {
      id: "standard-tobacco",
      name: "Standard Tobacco",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 2.0,
    },
    {
      id: "substandard",
      name: "Substandard (Table Rated)",
      triggerConditions: ["heart_attack", "stroke", "cancer_history", "copd", "kidney_disease", "liver_disease"],
      isGraded: false,
      premiumMultiplier: 2.5,
    },
    {
      id: "simplinow-max",
      name: "SimpliNow Legacy Max (Day-1 FE)",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.2,
    },
    {
      id: "simplinow-graded",
      name: "SimpliNow Legacy (Graded FE)",
      triggerConditions: ["parkinsons", "ms", "bipolar", "lupus", "schizophrenia", "alcohol_abuse", "drug_abuse"],
      isGraded: true,
      premiumMultiplier: 1.6,
    },
  ],
  products: [
    {
      id: "corebridge-select-a-term",
      name: "Select-a-Term",
      type: "term",
      issueAgeMin: 20,
      issueAgeMax: 80,
      faceAmountMin: 100000,
      faceAmountMax: 5000000,
      termLengths: [10, 15, 20, 25, 30],
      underwritingType: "fully_underwritten",
    },
    {
      id: "corebridge-max-accumulator-iul",
      name: "Max Accumulator+ IUL",
      type: "iul",
      issueAgeMin: 18,
      issueAgeMax: 80,
      faceAmountMin: 50000,
      faceAmountMax: 5000000,
      underwritingType: "fully_underwritten",
    },
    {
      id: "corebridge-simplinow-max",
      name: "SimpliNow Legacy Max",
      type: "final_expense",
      issueAgeMin: 50,
      issueAgeMax: 80,
      faceAmountMin: 5000,
      faceAmountMax: 35000,
      underwritingType: "simplified",
    },
    {
      id: "corebridge-gi-wl",
      name: "Guaranteed Issue Whole Life",
      type: "final_expense",
      issueAgeMin: 50,
      issueAgeMax: 80,
      faceAmountMin: 5000,
      faceAmountMax: 25000,
      underwritingType: "guaranteed",
      gradedBenefit: {
        years: [
          { year: 1, benefitPct: 0 },
          { year: 2, benefitPct: 0 },
          { year: 3, benefitPct: 100 },
        ],
        accidentalDeathFullBenefit: true,
        returnOfPremiumPct: 110,
      },
    },
  ],
};
```

- [ ] **Step 3: Create Transamerica config**

Create `lib/carriers/transamerica.ts`:

```typescript
import { CarrierConfig } from "./types";

export const transamerica: CarrierConfig = {
  id: "transamerica",
  name: "Transamerica",
  portalUrl: "https://www.transamerica.com/agent",
  stateExclusions: [],
  productStateExclusions: {
    "transamerica-trendsetter": ["NY"],
    "transamerica-lifetime-wl": ["NY"],
    "transamerica-ffiul": ["NY"],
    "transamerica-fe-express": ["CA", "NY", "PA"],
  },
  tobaccoPolicy: {
    lookbackMonths: 12,
    preferredLookbackMonths: 36,
    cigarException: true,
    vapingIsTobacco: true,
  },
  knockoutConditions: [
    "alzheimers", "dementia", "als", "huntingtons", "hiv",
    "organ_transplant", "dialysis", "terminal_illness",
    "wheelchair", "nursing_home", "adl_assistance", "oxygen_use",
    "cancer_active", "cancer_multiple", "sickle_cell",
    "cystic_fibrosis", "cerebral_palsy", "amputation_disease",
    "pending_treatment", "pulmonary_fibrosis", "diabetes_complications",
  ],
  underwritingTiers: [
    {
      id: "preferred-plus-ns",
      name: "Preferred Plus Nonsmoker",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 0.65,
    },
    {
      id: "preferred-ns",
      name: "Preferred Nonsmoker",
      triggerConditions: ["hypertension", "high_cholesterol"],
      isGraded: false,
      premiumMultiplier: 0.8,
    },
    {
      id: "standard-plus-ns",
      name: "Standard Plus Nonsmoker",
      triggerConditions: ["sleep_apnea", "asthma", "obesity"],
      isGraded: false,
      premiumMultiplier: 0.9,
    },
    {
      id: "standard-ns",
      name: "Standard Nonsmoker",
      triggerConditions: [
        "diabetes_type2", "copd", "parkinsons", "ms", "heart_attack",
        "stroke", "angina", "afib", "depression", "bipolar",
      ],
      isGraded: false,
      premiumMultiplier: 1.0,
    },
    {
      id: "preferred-smoker",
      name: "Preferred Smoker",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.5,
    },
    {
      id: "standard-smoker",
      name: "Standard Smoker",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 2.0,
    },
    {
      id: "substandard",
      name: "Substandard (Table Rated)",
      triggerConditions: ["cancer_history", "kidney_disease", "liver_disease", "alcohol_abuse", "drug_abuse"],
      isGraded: false,
      premiumMultiplier: 2.5,
    },
  ],
  products: [
    {
      id: "transamerica-trendsetter",
      name: "Trendsetter Super Term",
      type: "term",
      issueAgeMin: 18,
      issueAgeMax: 80,
      issueAgeMaxSmoker: 80,
      faceAmountMin: 25000,
      faceAmountMax: 10000000,
      termLengths: [10, 15, 20, 25, 30],
      underwritingType: "fully_underwritten",
    },
    {
      id: "transamerica-lifetime-wl",
      name: "Lifetime Whole Life",
      type: "whole_life",
      issueAgeMin: 0,
      issueAgeMax: 80,
      faceAmountMin: 25000,
      faceAmountMax: 2000000,
      underwritingType: "fully_underwritten",
    },
    {
      id: "transamerica-ffiul",
      name: "Financial Foundation IUL",
      type: "iul",
      issueAgeMin: 0,
      issueAgeMax: 85,
      faceAmountMin: 25000,
      faceAmountMax: 2000000,
      underwritingType: "fully_underwritten",
    },
    {
      id: "transamerica-fe-express",
      name: "FE Express Solution",
      type: "final_expense",
      issueAgeMin: 18,
      issueAgeMax: 85,
      faceAmountMin: 5000,
      faceAmountMax: 50000,
      faceAmountMaxByAge: [
        { minAge: 18, maxAge: 75, max: 50000 },
        { minAge: 76, maxAge: 85, max: 25000 },
      ],
      underwritingType: "simplified",
    },
    {
      id: "transamerica-easy-solution",
      name: "Easy Solution (Graded)",
      type: "final_expense",
      issueAgeMin: 18,
      issueAgeMax: 80,
      faceAmountMin: 1000,
      faceAmountMax: 25000,
      underwritingType: "simplified",
      gradedBenefit: {
        years: [
          { year: 1, benefitPct: 30 },
          { year: 2, benefitPct: 60 },
          { year: 3, benefitPct: 100 },
        ],
        accidentalDeathFullBenefit: true,
      },
    },
  ],
};
```

- [ ] **Step 4: Create Aetna config**

Create `lib/carriers/aetna.ts`:

```typescript
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
```

- [ ] **Step 5: Create American Amicable config**

Create `lib/carriers/american-amicable.ts`:

```typescript
import { CarrierConfig } from "./types";

export const americanAmicable: CarrierConfig = {
  id: "american-amicable",
  name: "American Amicable",
  portalUrl: "https://www.americanamicable.com/v4/login.html",
  stateExclusions: ["NY", "MT", "MN", "NH", "ME"],
  productStateExclusions: {},
  tobaccoPolicy: {
    lookbackMonths: 12,
    preferredLookbackMonths: 36,
    cigarException: true,
    vapingIsTobacco: true,
  },
  knockoutConditions: [
    "alzheimers", "dementia", "als", "huntingtons", "hiv",
    "organ_transplant", "dialysis", "terminal_illness",
    "wheelchair", "nursing_home", "adl_assistance", "oxygen_use",
    "chf", "cancer_active", "cancer_multiple", "sickle_cell",
    "amputation_disease", "pending_treatment",
    "diabetes_complications", "kidney_disease",
  ],
  underwritingTiers: [
    {
      id: "preferred-nt",
      name: "Preferred Non-Tobacco",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 0.7,
    },
    {
      id: "standard-nt",
      name: "Standard Non-Tobacco",
      triggerConditions: ["hypertension", "high_cholesterol", "diabetes_type2", "obesity"],
      isGraded: false,
      premiumMultiplier: 1.0,
    },
    {
      id: "standard-tobacco",
      name: "Standard Tobacco",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.8,
    },
    {
      id: "immediate",
      name: "Immediate Benefit (Final Expense)",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.0,
    },
    {
      id: "graded",
      name: "Graded Benefit",
      triggerConditions: [
        "heart_attack", "stroke", "angina", "aneurysm", "heart_surgery",
        "cancer_history", "copd", "parkinsons", "ms", "cerebral_palsy",
        "muscular_dystrophy", "seizures", "liver_disease",
      ],
      lookbackMonths: 36,
      isGraded: true,
      premiumMultiplier: 1.5,
    },
    {
      id: "rop",
      name: "Return of Premium",
      triggerConditions: [
        "angina", "stroke", "tia", "cardiomyopathy", "lupus",
        "hepatitis_c", "copd", "alcohol_abuse", "drug_abuse",
      ],
      lookbackMonths: 24,
      isGraded: true,
      premiumMultiplier: 1.8,
    },
  ],
  products: [
    {
      id: "aa-term-made-simple",
      name: "Term Made Simple",
      type: "term",
      issueAgeMin: 18,
      issueAgeMax: 75,
      faceAmountMin: 50000,
      faceAmountMax: 500000,
      termLengths: [10, 15, 20, 30],
      underwritingType: "simplified",
    },
    {
      id: "aa-senior-choice",
      name: "Senior Choice Whole Life",
      type: "final_expense",
      issueAgeMin: 50,
      issueAgeMax: 85,
      faceAmountMin: 2500,
      faceAmountMax: 35000,
      faceAmountMaxByAge: [
        { minAge: 50, maxAge: 75, max: 35000 },
        { minAge: 76, maxAge: 85, max: 20000 },
      ],
      underwritingType: "simplified",
    },
    {
      id: "aa-intelligent-choice-iul",
      name: "Intelligent Choice IUL",
      type: "iul",
      issueAgeMin: 18,
      issueAgeMax: 75,
      faceAmountMin: 25000,
      faceAmountMax: 500000,
      underwritingType: "simplified",
    },
    {
      id: "aa-easy-ul",
      name: "Easy UL",
      type: "whole_life",
      issueAgeMin: 0,
      issueAgeMax: 85,
      faceAmountMin: 10000,
      faceAmountMax: 500000,
      underwritingType: "simplified",
    },
  ],
};
```

- [ ] **Step 6: Create Mutual of Omaha config**

Create `lib/carriers/mutual-of-omaha.ts`:

```typescript
import { CarrierConfig } from "./types";

export const mutualOfOmaha: CarrierConfig = {
  id: "mutual-of-omaha",
  name: "Mutual of Omaha",
  portalUrl: "https://www.mutualofomaha.com/broker",
  stateExclusions: [],
  productStateExclusions: {
    "moo-living-promise": ["NY"],
  },
  tobaccoPolicy: {
    lookbackMonths: 12,
    preferredLookbackMonths: 36,
    cigarException: true,
    vapingIsTobacco: true,
  },
  knockoutConditions: [
    "alzheimers", "dementia", "als", "huntingtons", "hiv",
    "organ_transplant", "dialysis", "terminal_illness",
    "wheelchair", "nursing_home", "adl_assistance", "oxygen_use",
    "chf", "cancer_active", "cancer_multiple", "sickle_cell",
    "cystic_fibrosis", "amputation_disease", "pending_treatment",
    "pulmonary_fibrosis", "drug_abuse",
  ],
  underwritingTiers: [
    {
      id: "preferred-best-nt",
      name: "Preferred Best Non-Tobacco",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 0.6,
    },
    {
      id: "preferred-nt",
      name: "Preferred Non-Tobacco",
      triggerConditions: ["high_cholesterol"],
      isGraded: false,
      premiumMultiplier: 0.75,
    },
    {
      id: "standard-plus-nt",
      name: "Standard Plus Non-Tobacco",
      triggerConditions: ["hypertension", "sleep_apnea", "obesity"],
      isGraded: false,
      premiumMultiplier: 0.9,
    },
    {
      id: "standard-nt",
      name: "Standard Non-Tobacco",
      triggerConditions: [
        "diabetes_type2", "copd", "depression", "bipolar", "asthma",
        "heart_attack", "stroke", "afib", "seizures", "parkinsons", "ms",
        "alcohol_abuse", "dui", "cancer_history", "liver_disease", "hepatitis_c",
      ],
      isGraded: false,
      premiumMultiplier: 1.0,
    },
    {
      id: "preferred-tobacco",
      name: "Preferred Tobacco",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 1.6,
    },
    {
      id: "standard-tobacco",
      name: "Standard Tobacco",
      triggerConditions: [],
      isGraded: false,
      premiumMultiplier: 2.0,
    },
    {
      id: "substandard",
      name: "Substandard (Table Rated)",
      triggerConditions: ["heart_surgery", "aneurysm", "cardiomyopathy", "lupus", "schizophrenia"],
      isGraded: false,
      premiumMultiplier: 2.5,
    },
  ],
  products: [
    {
      id: "moo-term-express",
      name: "Term Life Express",
      type: "term",
      issueAgeMin: 18,
      issueAgeMax: 65,
      faceAmountMin: 25000,
      faceAmountMax: 300000,
      termLengths: [10, 15, 20, 30],
      underwritingType: "simplified",
    },
    {
      id: "moo-living-promise",
      name: "Living Promise (GI Whole Life)",
      type: "final_expense",
      issueAgeMin: 45,
      issueAgeMax: 85,
      faceAmountMin: 2000,
      faceAmountMax: 25000,
      underwritingType: "guaranteed",
      gradedBenefit: {
        years: [
          { year: 1, benefitPct: 0 },
          { year: 2, benefitPct: 0 },
          { year: 3, benefitPct: 100 },
        ],
        accidentalDeathFullBenefit: true,
        returnOfPremiumPct: 110,
      },
    },
    {
      id: "moo-iul",
      name: "Life Protection Advantage IUL",
      type: "iul",
      issueAgeMin: 0,
      issueAgeMax: 75,
      faceAmountMin: 25000,
      faceAmountMax: 1000000,
      underwritingType: "fully_underwritten",
    },
    {
      id: "moo-whole-life",
      name: "Whole Life",
      type: "whole_life",
      issueAgeMin: 18,
      issueAgeMax: 80,
      faceAmountMin: 25000,
      faceAmountMax: 500000,
      underwritingType: "fully_underwritten",
    },
  ],
};
```

- [ ] **Step 7: Create carrier index**

Create `lib/carriers/index.ts`:

```typescript
import { CarrierConfig } from "./types";
import { americo } from "./americo";
import { corebridge } from "./corebridge";
import { transamerica } from "./transamerica";
import { aetna } from "./aetna";
import { americanAmicable } from "./american-amicable";
import { mutualOfOmaha } from "./mutual-of-omaha";

export const carriers: CarrierConfig[] = [
  americo,
  corebridge,
  transamerica,
  aetna,
  americanAmicable,
  mutualOfOmaha,
];

export const carrierMap: Record<string, CarrierConfig> = Object.fromEntries(
  carriers.map((c) => [c.id, c])
);
```

- [ ] **Step 8: Commit**

```bash
git add lib/carriers/
git commit -m "feat: add all 6 carrier configuration files with underwriting rules"
```

---

### Task 4: Fuzzy Condition Matcher

**Files:**
- Create: `lib/conditions/fuzzy-matcher.ts`, `__tests__/conditions/fuzzy-matcher.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/conditions/fuzzy-matcher.test.ts`:

```typescript
import { searchConditions, isNonFactor } from "@/lib/conditions/fuzzy-matcher";

describe("searchConditions", () => {
  it("finds exact match by name", () => {
    const results = searchConditions("Congestive Heart Failure");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("chf");
  });

  it("finds match by alias", () => {
    const results = searchConditions("CHF");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("chf");
  });

  it("finds fuzzy match", () => {
    const results = searchConditions("hart failure");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("chf");
  });

  it("returns grouped results by category", () => {
    const results = searchConditions("diabetes");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.category === "metabolic")).toBe(true);
  });

  it("returns empty array for gibberish", () => {
    const results = searchConditions("xyzzzqqq");
    expect(results.length).toBe(0);
  });

  it("limits results to maxResults", () => {
    const results = searchConditions("a", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe("isNonFactor", () => {
  it("identifies chicken pox as non-factor", () => {
    expect(isNonFactor("chicken pox")).toBe(true);
  });

  it("identifies allergies as non-factor", () => {
    expect(isNonFactor("seasonal allergies")).toBe(true);
  });

  it("does not flag heart failure as non-factor", () => {
    expect(isNonFactor("heart failure")).toBe(false);
  });

  it("handles fuzzy matching for non-factors", () => {
    expect(isNonFactor("chickenpox")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest __tests__/conditions/fuzzy-matcher.test.ts --verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement fuzzy matcher**

Create `lib/conditions/fuzzy-matcher.ts`:

```typescript
import Fuse from "fuse.js";
import { masterConditionList, nonFactorConditions, Condition } from "./master-list";
import { ConditionCategory } from "./categories";

export interface ConditionSearchResult {
  id: string;
  name: string;
  category: ConditionCategory;
  score: number;
}

const fuseIndex = new Fuse(masterConditionList, {
  keys: [
    { name: "name", weight: 2 },
    { name: "aliases", weight: 1.5 },
    { name: "id", weight: 0.5 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
});

const nonFactorFuse = new Fuse(
  nonFactorConditions.map((name) => ({ name })),
  {
    keys: ["name"],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
  }
);

export function searchConditions(
  query: string,
  maxResults: number = 10
): ConditionSearchResult[] {
  if (!query || query.trim().length === 0) return [];

  const results = fuseIndex.search(query.trim(), { limit: maxResults });

  return results.map((r) => ({
    id: r.item.id,
    name: r.item.name,
    category: r.item.category,
    score: 1 - (r.score ?? 0),
  }));
}

export function isNonFactor(query: string): boolean {
  if (!query || query.trim().length === 0) return false;

  const results = nonFactorFuse.search(query.trim(), { limit: 1 });
  return results.length > 0 && (results[0].score ?? 1) < 0.35;
}

export function getConditionById(id: string): Condition | undefined {
  return masterConditionList.find((c) => c.id === id);
}

export function getAllConditions(): Condition[] {
  return masterConditionList;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest __tests__/conditions/fuzzy-matcher.test.ts --verbose
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/conditions/fuzzy-matcher.ts __tests__/conditions/
git commit -m "feat: add fuzzy condition matcher with Fuse.js"
```

---

### Task 5: Matching Engine

**Files:**
- Create: `lib/engine/types.ts`, `lib/engine/matcher.ts`, `__tests__/engine/matcher.test.ts`

- [ ] **Step 1: Create engine types**

Create `lib/engine/types.ts`:

```typescript
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
```

- [ ] **Step 2: Write failing matcher tests**

Create `__tests__/engine/matcher.test.ts`:

```typescript
import { runMatch } from "@/lib/engine/matcher";
import { QuoteInput } from "@/lib/engine/types";

const healthyApplicant: QuoteInput = {
  dateOfBirth: "1980-06-15",
  gender: "male",
  state: "TX",
  tobaccoStatus: "never",
  coverageAmount: 250000,
  productTypes: ["term", "whole_life", "iul", "final_expense"],
  conditionIds: [],
};

describe("runMatch", () => {
  it("returns results for all 6 carriers for a healthy TX applicant", () => {
    const output = runMatch(healthyApplicant);
    expect(output.results.length).toBe(6);
    expect(output.results.every((r) => r.eligible)).toBe(true);
  });

  it("excludes carriers not available in NY", () => {
    const nyApplicant: QuoteInput = {
      ...healthyApplicant,
      state: "NY",
    };
    const output = runMatch(nyApplicant);
    const eligibleCarriers = output.results.filter((r) => r.eligible);
    const carrierIds = eligibleCarriers.map((r) => r.carrierId);
    expect(carrierIds).not.toContain("americo");
    expect(carrierIds).not.toContain("aetna");
  });

  it("gives higher acceptance to healthy applicants than those with conditions", () => {
    const healthyOutput = runMatch(healthyApplicant);
    const sickApplicant: QuoteInput = {
      ...healthyApplicant,
      conditionIds: ["copd", "diabetes_type2"],
    };
    const sickOutput = runMatch(sickApplicant);

    const healthyAvg =
      healthyOutput.results.reduce((s, r) => s + r.acceptancePct, 0) /
      healthyOutput.results.length;
    const sickAvg =
      sickOutput.results.reduce((s, r) => s + r.acceptancePct, 0) /
      sickOutput.results.length;

    expect(healthyAvg).toBeGreaterThan(sickAvg);
  });

  it("declines all carriers for an applicant with ALS", () => {
    const alsApplicant: QuoteInput = {
      ...healthyApplicant,
      conditionIds: ["als"],
    };
    const output = runMatch(alsApplicant);
    // All carriers should either be ineligible or only offer guaranteed issue
    const fullyEligible = output.results.filter(
      (r) => r.eligible && r.acceptancePct > 50
    );
    expect(fullyEligible.length).toBe(0);
  });

  it("returns only final_expense products for Aetna", () => {
    const output = runMatch(healthyApplicant);
    const aetnaResult = output.results.find((r) => r.carrierId === "aetna");
    expect(aetnaResult).toBeDefined();
    if (aetnaResult) {
      const eligibleProducts = aetnaResult.productResults.filter((p) => p.eligible);
      expect(eligibleProducts.every((p) => p.productType === "final_expense")).toBe(true);
    }
  });

  it("calculates correct age from DOB", () => {
    const output = runMatch(healthyApplicant);
    // Born 1980-06-15, current date context is 2026-04-05 => age 45
    expect(output.inputSummary.age).toBe(45);
  });

  it("applies smoker rates for current tobacco users", () => {
    const smokerApplicant: QuoteInput = {
      ...healthyApplicant,
      tobaccoStatus: "current",
    };
    const output = runMatch(smokerApplicant);
    output.results.forEach((r) => {
      if (r.eligible && r.tierPlacement) {
        expect(
          r.tierPlacement.toLowerCase().includes("tobacco") ||
          r.tierPlacement.toLowerCase().includes("smoker") ||
          r.tierPlacement.toLowerCase().includes("nicotine")
        ).toBe(true);
      }
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest __tests__/engine/matcher.test.ts --verbose
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement the matcher**

Create `lib/engine/matcher.ts`:

```typescript
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
```

- [ ] **Step 5: Commit**

```bash
git add lib/engine/types.ts lib/engine/matcher.ts __tests__/engine/matcher.test.ts
git commit -m "feat: add matching engine with state/age/condition evaluation"
```

---

### Task 6: Premium Estimator

**Files:**
- Create: `lib/engine/premium-estimator.ts`, `__tests__/engine/premium-estimator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/engine/premium-estimator.test.ts`:

```typescript
import { estimatePremium } from "@/lib/engine/premium-estimator";
import { aetna } from "@/lib/carriers/aetna";
import { americo } from "@/lib/carriers/americo";

describe("estimatePremium", () => {
  it("calculates exact Aetna premium from rate table", () => {
    const aetnaProduct = aetna.products[0]; // Accendo FE
    const result = estimatePremium(aetna, aetnaProduct, 50, "male", false, 15000, 1.0);

    // Rate: 35.3 per $1,000 × 15 units + $40 fee = $569.5 annual
    // Monthly: $569.5 × 0.0875 = $49.83
    expect(result).toBeDefined();
    expect(result!.min).toBeCloseTo(49.83, 0);
    expect(result!.max).toBeCloseTo(49.83, 0);
  });

  it("returns a range for carriers without rate tables", () => {
    const americoTerm = americo.products[0]; // Term 100
    const result = estimatePremium(americo, americoTerm, 35, "male", false, 250000, 1.0);

    expect(result).toBeDefined();
    expect(result!.min).toBeGreaterThan(0);
    expect(result!.max).toBeGreaterThan(result!.min);
  });

  it("returns higher premiums for smokers", () => {
    const americoTerm = americo.products[0];
    const nonSmoker = estimatePremium(americo, americoTerm, 35, "male", false, 250000, 1.0);
    const smoker = estimatePremium(americo, americoTerm, 35, "male", true, 250000, 2.0);

    expect(nonSmoker).toBeDefined();
    expect(smoker).toBeDefined();
    expect(smoker!.min).toBeGreaterThan(nonSmoker!.min);
  });

  it("returns higher premiums for older applicants", () => {
    const americoTerm = americo.products[0];
    const young = estimatePremium(americo, americoTerm, 30, "male", false, 250000, 1.0);
    const old = estimatePremium(americo, americoTerm, 60, "male", false, 250000, 1.0);

    expect(young).toBeDefined();
    expect(old).toBeDefined();
    expect(old!.min).toBeGreaterThan(young!.min);
  });

  it("returns lower premiums for females", () => {
    const americoTerm = americo.products[0];
    const male = estimatePremium(americo, americoTerm, 40, "male", false, 250000, 1.0);
    const female = estimatePremium(americo, americoTerm, 40, "female", false, 250000, 1.0);

    expect(male).toBeDefined();
    expect(female).toBeDefined();
    expect(female!.min).toBeLessThan(male!.min);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest __tests__/engine/premium-estimator.test.ts --verbose
```

Expected: FAIL.

- [ ] **Step 3: Implement premium estimator**

Create `lib/engine/premium-estimator.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest __tests__/engine/premium-estimator.test.ts --verbose
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/engine/premium-estimator.ts __tests__/engine/premium-estimator.test.ts
git commit -m "feat: add premium estimator with rate table + formula fallback"
```

---

### Task 7: Acceptance Scorer

**Files:**
- Create: `lib/engine/acceptance-scorer.ts`, `__tests__/engine/acceptance-scorer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/engine/acceptance-scorer.test.ts`:

```typescript
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
    const one = scoreAcceptance(["hypertension"], bestTier, false, 40, americo);
    const two = scoreAcceptance(["hypertension", "diabetes_type2"], bestTier, false, 40, americo);
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest __tests__/engine/acceptance-scorer.test.ts --verbose
```

Expected: FAIL.

- [ ] **Step 3: Implement acceptance scorer**

Create `lib/engine/acceptance-scorer.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest __tests__/engine/acceptance-scorer.test.ts --verbose
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Now run ALL engine tests together**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest --verbose
```

Expected: All tests pass across all test files.

- [ ] **Step 6: Commit**

```bash
git add lib/engine/acceptance-scorer.ts __tests__/engine/acceptance-scorer.test.ts
git commit -m "feat: add acceptance likelihood scorer"
```

---

### Task 8: UI Primitives (Button, Card, Input, Badge, Gauge, Select, Slider)

**Files:**
- Create: all files in `components/ui/`

- [ ] **Step 1: Create Button component**

Create `components/ui/button.tsx`:

```typescript
"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className = "", disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25",
      secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
      ghost: "hover:bg-slate-800 text-slate-400 hover:text-slate-200",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-5 py-2.5 text-sm",
      lg: "px-8 py-3.5 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

- [ ] **Step 2: Create Card component**

Create `components/ui/card.tsx`:

```typescript
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 ${
          hover ? "transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
```

- [ ] **Step 3: Create Input component**

Create `components/ui/input.tsx`:

```typescript
"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 ${
            error ? "border-danger focus:ring-danger/50" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
```

- [ ] **Step 4: Create Select component**

Create `components/ui/select.tsx`:

```typescript
"use client";

import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";
```

- [ ] **Step 5: Create Slider component**

Create `components/ui/slider.tsx`:

```typescript
"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  displayValue?: string;
  onValueChange?: (value: number) => void;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, displayValue, onValueChange, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-slate-300">
              {label}
            </label>
            {displayValue && (
              <span className="text-sm font-semibold text-primary-light tabular-nums">
                {displayValue}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary ${className}`}
          onChange={(e) => onValueChange?.(Number(e.target.value))}
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";
```

- [ ] **Step 6: Create Badge component**

Create `components/ui/badge.tsx`:

```typescript
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const variantClasses = {
  default: "bg-slate-700 text-slate-300",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};

export function Badge({ variant = "default", children, className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 7: Create Gauge component (acceptance likelihood)**

Create `components/ui/gauge.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

interface GaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
}

function getColor(value: number): string {
  if (value >= 80) return "#10b981"; // emerald
  if (value >= 60) return "#f59e0b"; // amber
  if (value >= 40) return "#f97316"; // orange
  if (value >= 20) return "#f43f5e"; // rose
  return "#64748b"; // slate
}

function getLabel(value: number): string {
  if (value >= 80) return "Highly Likely";
  if (value >= 60) return "Likely";
  if (value >= 40) return "Possible";
  if (value >= 20) return "Unlikely";
  return "Not Eligible";
}

export function Gauge({ value, size = 100, label }: GaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const color = getColor(value);
  const displayLabel = label ?? getLabel(value);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedValue / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-700"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color }}
          >
            {animatedValue}%
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-400">{displayLabel}</span>
    </div>
  );
}
```

- [ ] **Step 8: Verify build**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npm run build
```

Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add components/ui/
git commit -m "feat: add UI primitives (Button, Card, Input, Select, Slider, Badge, Gauge)"
```

---

### Task 9: Quote Form Components

**Files:**
- Create: all files in `components/form/`

- [ ] **Step 1: Create GenderToggle**

Create `components/form/gender-toggle.tsx`:

```typescript
"use client";

interface GenderToggleProps {
  value: "male" | "female";
  onChange: (value: "male" | "female") => void;
}

export function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">Gender</label>
      <div className="flex bg-slate-900/80 border border-slate-700 rounded-xl p-1">
        {(["male", "female"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              value === option
                ? "bg-primary text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {option === "male" ? "Male" : "Female"}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TobaccoToggle**

Create `components/form/tobacco-toggle.tsx`:

```typescript
"use client";

interface TobaccoToggleProps {
  status: "never" | "quit" | "current";
  quitMonths?: number;
  onStatusChange: (status: "never" | "quit" | "current") => void;
  onQuitMonthsChange: (months: number) => void;
}

const quitOptions = [
  { value: 6, label: "< 6 months" },
  { value: 12, label: "6-12 months" },
  { value: 24, label: "1-2 years" },
  { value: 36, label: "2-3 years" },
  { value: 60, label: "3-5 years" },
  { value: 120, label: "5+ years" },
];

export function TobaccoToggle({
  status,
  quitMonths,
  onStatusChange,
  onQuitMonthsChange,
}: TobaccoToggleProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        Tobacco / Nicotine Use
      </label>
      <div className="flex bg-slate-900/80 border border-slate-700 rounded-xl p-1">
        {(["never", "quit", "current"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onStatusChange(option)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              status === option
                ? "bg-primary text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {option === "never" ? "Never" : option === "quit" ? "Quit" : "Current"}
          </button>
        ))}
      </div>
      {status === "quit" && (
        <div className="pl-1">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            How long ago?
          </label>
          <div className="flex flex-wrap gap-2">
            {quitOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onQuitMonthsChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  quitMonths === opt.value
                    ? "bg-primary/20 text-primary-light border border-primary/30"
                    : "bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ProductSelector**

Create `components/form/product-selector.tsx`:

```typescript
"use client";

import { ProductType } from "@/lib/carriers/types";

interface ProductSelectorProps {
  selected: ProductType[];
  onChange: (selected: ProductType[]) => void;
}

const productOptions: { value: ProductType; label: string }[] = [
  { value: "term", label: "Term Life" },
  { value: "whole_life", label: "Whole Life" },
  { value: "iul", label: "IUL" },
  { value: "final_expense", label: "Final Expense" },
];

export function ProductSelector({ selected, onChange }: ProductSelectorProps) {
  const allSelected = selected.length === 0;

  function toggle(type: ProductType) {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  }

  function selectAll() {
    onChange([]);
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        Product Types
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            allSelected
              ? "bg-primary/20 text-primary-light border border-primary/30"
              : "bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600"
          }`}
        >
          Show All
        </button>
        {productOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              !allSelected && selected.includes(opt.value)
                ? "bg-primary/20 text-primary-light border border-primary/30"
                : "bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ConditionInput**

Create `components/form/condition-input.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { searchConditions, isNonFactor, getConditionById } from "@/lib/conditions/fuzzy-matcher";
import { categoryLabels } from "@/lib/conditions/categories";

interface ConditionInputProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ConditionInput({ selectedIds, onChange }: ConditionInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; name: string; category: string; score: number }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [nonFactorMessage, setNonFactorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    setNonFactorMessage(null);

    if (value.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Check if it's a non-factor first
    if (isNonFactor(value)) {
      setNonFactorMessage(
        `"${value}" is not tracked by any carrier — will not affect results`
      );
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const matches = searchConditions(value, 8);
    setResults(matches);
    setShowDropdown(matches.length > 0);
  }

  function addCondition(id: string) {
    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id]);
    }
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function removeCondition(id: string) {
    onChange(selectedIds.filter((cid) => cid !== id));
  }

  // Group results by category
  const groupedResults = results.reduce(
    (acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    },
    {} as Record<string, typeof results>
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Health Conditions
      </label>

      {/* Selected condition chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const condition = getConditionById(id);
            if (!condition) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300"
              >
                {condition.name}
                <button
                  type="button"
                  onClick={() => removeCondition(id)}
                  className="text-slate-500 hover:text-slate-200 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Type a health condition..."
          className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
        />

        {/* Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl shadow-black/30 max-h-64 overflow-y-auto"
          >
            {Object.entries(groupedResults).map(([category, items]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50 sticky top-0">
                  {categoryLabels[category as keyof typeof categoryLabels] ?? category}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addCondition(item.id)}
                    disabled={selectedIds.includes(item.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedIds.includes(item.id)
                        ? "text-slate-600 cursor-not-allowed"
                        : "text-slate-300 hover:bg-slate-700/50 cursor-pointer"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Non-factor message */}
      {nonFactorMessage && (
        <p className="text-sm text-slate-500 italic">{nonFactorMessage}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create QuoteForm (orchestrator)**

Create `components/form/quote-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { GenderToggle } from "./gender-toggle";
import { TobaccoToggle } from "./tobacco-toggle";
import { ProductSelector } from "./product-selector";
import { ConditionInput } from "./condition-input";
import { ProductType } from "@/lib/carriers/types";
import { submitQuote } from "@/app/actions";

const US_STATES = [
  { value: "", label: "Select a state..." },
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" }, { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" }, { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" }, { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" }, { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" }, { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" }, { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" }, { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

function formatCoverage(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${(value / 1000).toFixed(0)}K`;
}

export function QuoteForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [state, setState] = useState("");
  const [tobaccoStatus, setTobaccoStatus] = useState<"never" | "quit" | "current">("never");
  const [tobaccoQuitMonths, setTobaccoQuitMonths] = useState<number>(12);
  const [coverageAmount, setCoverageAmount] = useState(250000);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [conditionIds, setConditionIds] = useState<string[]>([]);

  // Calculate age for display
  const age = dob
    ? Math.floor(
        (new Date().getTime() - new Date(dob).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dob || !state) return;

    setLoading(true);
    try {
      const searchId = await submitQuote({
        dateOfBirth: dob,
        gender,
        state,
        tobaccoStatus,
        tobaccoQuitMonths: tobaccoStatus === "quit" ? tobaccoQuitMonths : undefined,
        coverageAmount,
        productTypes,
        conditionIds,
      });
      router.push(`/results/${searchId}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-white">Applicant Info</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Input
                label="Date of Birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                max={new Date().toISOString().split("T")[0]}
              />
              {age !== null && age > 0 && (
                <p className="text-xs text-slate-500 pl-1">Age: {age}</p>
              )}
            </div>
            <GenderToggle value={gender} onChange={setGender} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select
              label="State of Residence"
              value={state}
              onChange={(e) => setState(e.target.value)}
              options={US_STATES}
              required
            />
            <div /> {/* spacer */}
          </div>

          {state === "NY" && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-400">
              New York has limited carrier availability. Several carriers do not operate in NY.
            </div>
          )}

          <TobaccoToggle
            status={tobaccoStatus}
            quitMonths={tobaccoQuitMonths}
            onStatusChange={setTobaccoStatus}
            onQuitMonthsChange={setTobaccoQuitMonths}
          />
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-white">Coverage</h2>

          <Slider
            label="Coverage Amount"
            displayValue={formatCoverage(coverageAmount)}
            min={5000}
            max={2000000}
            step={5000}
            value={coverageAmount}
            onValueChange={setCoverageAmount}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Or enter exact amount:</span>
            <input
              type="number"
              value={coverageAmount}
              onChange={(e) => setCoverageAmount(Number(e.target.value))}
              min={5000}
              max={2000000}
              className="w-32 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <ProductSelector selected={productTypes} onChange={setProductTypes} />
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-white">Health Conditions</h2>
          <p className="text-sm text-slate-400">
            Add any known health conditions. Conditions not tracked by carriers will be
            flagged as non-factors.
          </p>
          <ConditionInput selectedIds={conditionIds} onChange={setConditionIds} />
        </div>
      </Card>

      <Button type="submit" size="lg" loading={loading} className="w-full">
        Find Eligible Carriers
      </Button>
    </form>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/form/
git commit -m "feat: add form components (gender, tobacco, product, condition input, quote form)"
```

---

### Task 10: Server Actions & API

**Files:**
- Create: `app/actions.ts`

- [ ] **Step 1: Create server actions**

Create `app/actions.ts`:

```typescript
"use server";

import { prisma } from "@/lib/db";
import { runMatch } from "@/lib/engine/matcher";
import { QuoteInput } from "@/lib/engine/types";
import { ProductType } from "@/lib/carriers/types";

export async function submitQuote(input: {
  dateOfBirth: string;
  gender: string;
  state: string;
  tobaccoStatus: string;
  tobaccoQuitMonths?: number;
  coverageAmount: number;
  productTypes: ProductType[];
  conditionIds: string[];
}): Promise<string> {
  const quoteInput: QuoteInput = {
    dateOfBirth: input.dateOfBirth,
    gender: input.gender as "male" | "female",
    state: input.state,
    tobaccoStatus: input.tobaccoStatus as "never" | "quit" | "current",
    tobaccoQuitMonths: input.tobaccoQuitMonths,
    coverageAmount: input.coverageAmount,
    productTypes: input.productTypes,
    conditionIds: input.conditionIds,
  };

  const output = runMatch(quoteInput);

  const search = await prisma.search.create({
    data: {
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender,
      state: input.state,
      tobaccoStatus: input.tobaccoStatus,
      tobaccoQuitMonths: input.tobaccoQuitMonths,
      coverageAmount: input.coverageAmount,
      productTypes: input.productTypes.join(",") || "all",
      conditions: JSON.stringify(input.conditionIds),
      results: {
        create: output.results.map((r) => ({
          carrierId: r.carrierId,
          carrierName: r.carrierName,
          eligible: r.eligible,
          acceptancePct: r.acceptancePct,
          tierPlacement: r.tierPlacement,
          productResults: JSON.stringify(r.productResults),
          declineReasons: JSON.stringify(r.declineReasons),
          notes: JSON.stringify(r.notes),
        })),
      },
    },
  });

  return search.id;
}

export async function getSearch(id: string) {
  const search = await prisma.search.findUnique({
    where: { id },
    include: { results: true },
  });

  if (!search) return null;

  return {
    ...search,
    conditions: JSON.parse(search.conditions) as string[],
    results: search.results.map((r) => ({
      ...r,
      productResults: JSON.parse(r.productResults),
      declineReasons: r.declineReasons ? JSON.parse(r.declineReasons) : [],
      notes: r.notes ? JSON.parse(r.notes) : [],
    })),
  };
}

export async function getSearchHistory() {
  const searches = await prisma.search.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      results: {
        where: { eligible: true },
        orderBy: { acceptancePct: "desc" },
        take: 1,
      },
    },
  });

  return searches.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    gender: s.gender,
    state: s.state,
    coverageAmount: s.coverageAmount,
    age: Math.floor(
      (new Date().getTime() - new Date(s.dateOfBirth).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    ),
    topCarrier: s.results[0]?.carrierName ?? "No match",
    topAcceptance: s.results[0]?.acceptancePct ?? 0,
  }));
}

export async function deleteSearch(id: string) {
  await prisma.search.delete({ where: { id } });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions.ts
git commit -m "feat: add server actions for quote submission, search retrieval, and history"
```

---

### Task 11: Results Page Components & Page

**Files:**
- Create: `components/results/carrier-card.tsx`, `components/results/results-summary.tsx`, `app/results/[id]/page.tsx`

- [ ] **Step 1: Create CarrierCard**

Create `components/results/carrier-card.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge } from "@/components/ui/gauge";

interface ProductResult {
  productId: string;
  productName: string;
  productType: string;
  eligible: boolean;
  premiumEstimateMin?: number;
  premiumEstimateMax?: number;
  notes: string[];
}

interface CarrierCardProps {
  carrierId: string;
  carrierName: string;
  eligible: boolean;
  acceptancePct: number;
  tierPlacement: string | null;
  productResults: ProductResult[];
  declineReasons: string[];
  notes: string[];
  portalUrl: string;
}

const productTypeLabels: Record<string, string> = {
  term: "Term Life",
  whole_life: "Whole Life",
  iul: "IUL",
  final_expense: "Final Expense",
};

function getAcceptanceVariant(pct: number): "success" | "warning" | "danger" | "info" {
  if (pct >= 80) return "success";
  if (pct >= 60) return "warning";
  if (pct >= 40) return "warning";
  return "danger";
}

function formatPremium(min?: number, max?: number): string {
  if (min === undefined) return "N/A";
  if (min === max || max === undefined) return `$${min.toFixed(0)}/mo`;
  return `$${min.toFixed(0)} – $${max.toFixed(0)}/mo`;
}

export function CarrierCard({
  carrierName,
  eligible,
  acceptancePct,
  tierPlacement,
  productResults,
  declineReasons,
  notes,
  portalUrl,
}: CarrierCardProps) {
  const [expanded, setExpanded] = useState(false);
  const eligibleProducts = productResults.filter((p) => p.eligible);

  if (!eligible) {
    return (
      <Card className="opacity-60">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-400">{carrierName}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {declineReasons[0] ?? "Not eligible"}
            </p>
          </div>
          <Gauge value={0} size={72} />
        </div>
      </Card>
    );
  }

  return (
    <Card hover>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white">{carrierName}</h3>
          {tierPlacement && (
            <Badge variant={getAcceptanceVariant(acceptancePct)} className="mt-1">
              {tierPlacement}
            </Badge>
          )}

          {/* Eligible products */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {eligibleProducts.map((p) => (
              <Badge key={p.productId} variant="info">
                {productTypeLabels[p.productType] ?? p.productType}
              </Badge>
            ))}
          </div>

          {/* Premium range - show best available */}
          {eligibleProducts.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-slate-400">Estimated premium</p>
              <p className="text-xl font-bold text-white tabular-nums">
                {formatPremium(
                  Math.min(
                    ...eligibleProducts
                      .filter((p) => p.premiumEstimateMin !== undefined)
                      .map((p) => p.premiumEstimateMin!)
                  ),
                  Math.max(
                    ...eligibleProducts
                      .filter((p) => p.premiumEstimateMax !== undefined)
                      .map((p) => p.premiumEstimateMax!)
                  )
                )}
              </p>
            </div>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="mt-2 space-y-1">
              {notes.map((note, i) => (
                <p key={i} className="text-xs text-slate-500">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>

        <Gauge value={acceptancePct} size={88} />
      </div>

      {/* Expandable details */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide Details" : "View Details"}
        </Button>
        <a href={portalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="primary" size="sm">
            Quote on Carrier Site
          </Button>
        </a>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-slate-700 pt-4 space-y-3">
          {productResults.map((p) => (
            <div
              key={p.productId}
              className={`p-3 rounded-xl ${
                p.eligible ? "bg-slate-900/50" : "bg-slate-900/30 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    {p.productName}
                  </p>
                  <Badge variant={p.eligible ? "info" : "default"} className="mt-1">
                    {productTypeLabels[p.productType] ?? p.productType}
                  </Badge>
                </div>
                {p.eligible && (
                  <p className="text-sm font-semibold text-white tabular-nums">
                    {formatPremium(p.premiumEstimateMin, p.premiumEstimateMax)}
                  </p>
                )}
              </div>
              {p.notes.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {p.notes.map((note, i) => (
                    <p key={i} className="text-xs text-slate-500">
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Create ResultsSummary**

Create `components/results/results-summary.tsx`:

```typescript
import { Badge } from "@/components/ui/badge";

interface ResultsSummaryProps {
  age: number;
  gender: string;
  state: string;
  tobaccoStatus: string;
  coverageAmount: number;
  conditionNames: string[];
  eligibleCount: number;
  totalCount: number;
}

function formatCoverage(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${(value / 1000).toFixed(0)}K`;
}

export function ResultsSummary({
  age,
  gender,
  state,
  tobaccoStatus,
  coverageAmount,
  conditionNames,
  eligibleCount,
  totalCount,
}: ResultsSummaryProps) {
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">{age} yr old {gender}</Badge>
        <Badge variant="info">{state}</Badge>
        <Badge variant={tobaccoStatus === "never" ? "success" : tobaccoStatus === "current" ? "danger" : "warning"}>
          {tobaccoStatus === "never" ? "Non-Tobacco" : tobaccoStatus === "current" ? "Tobacco User" : "Former Tobacco"}
        </Badge>
        <Badge variant="info">{formatCoverage(coverageAmount)}</Badge>
        {conditionNames.map((name) => (
          <Badge key={name} variant="warning">{name}</Badge>
        ))}
      </div>
      <p className="text-sm text-slate-400 mt-2">
        <span className="text-white font-semibold">{eligibleCount}</span> of{" "}
        <span className="text-white font-semibold">{totalCount}</span> carriers
        eligible
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create results page**

Create `app/results/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSearch } from "@/app/actions";
import { CarrierCard } from "@/components/results/carrier-card";
import { ResultsSummary } from "@/components/results/results-summary";
import { Button } from "@/components/ui/button";
import { carriers } from "@/lib/carriers";
import { getConditionById } from "@/lib/conditions/fuzzy-matcher";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const search = await getSearch(id);

  if (!search) notFound();

  const age = Math.floor(
    (new Date().getTime() - new Date(search.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  const conditionNames = search.conditions
    .map((id: string) => getConditionById(id)?.name ?? id)
    .filter(Boolean);

  const eligibleCount = search.results.filter((r: { eligible: boolean }) => r.eligible).length;

  // Get portal URLs from carrier configs
  const carrierPortals: Record<string, string> = {};
  for (const c of carriers) {
    carrierPortals[c.id] = c.portalUrl;
  }

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Carrier Results</h1>
            <p className="text-sm text-slate-400 mt-1">
              {new Date(search.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/history">
              <Button variant="ghost" size="sm">History</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" size="sm">New Search</Button>
            </Link>
          </div>
        </div>

        {/* Summary bar */}
        <ResultsSummary
          age={age}
          gender={search.gender}
          state={search.state}
          tobaccoStatus={search.tobaccoStatus}
          coverageAmount={search.coverageAmount}
          conditionNames={conditionNames}
          eligibleCount={eligibleCount}
          totalCount={search.results.length}
        />

        {/* Carrier cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {search.results.map((result: {
            carrierId: string;
            carrierName: string;
            eligible: boolean;
            acceptancePct: number;
            tierPlacement: string | null;
            productResults: {
              productId: string;
              productName: string;
              productType: string;
              eligible: boolean;
              premiumEstimateMin?: number;
              premiumEstimateMax?: number;
              notes: string[];
            }[];
            declineReasons: string[];
            notes: string[];
          }) => (
            <CarrierCard
              key={result.carrierId}
              carrierId={result.carrierId}
              carrierName={result.carrierName}
              eligible={result.eligible}
              acceptancePct={result.acceptancePct}
              tierPlacement={result.tierPlacement}
              productResults={result.productResults}
              declineReasons={result.declineReasons}
              notes={result.notes}
              portalUrl={carrierPortals[result.carrierId] ?? "#"}
            />
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-600 text-center pt-4">
          Estimates only. Actual eligibility and premiums determined by carrier
          underwriting. Premium ranges are approximations based on publicly available data.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/results/ app/results/
git commit -m "feat: add results page with carrier cards, gauges, and premium estimates"
```

---

### Task 12: Start Page & History Page

**Files:**
- Modify: `app/page.tsx`
- Create: `app/history/page.tsx`

- [ ] **Step 1: Build the start page**

Replace `app/page.tsx` with:

```typescript
import Link from "next/link";
import { QuoteForm } from "@/components/form/quote-form";

export default function Home() {
  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            CarrierMatch
          </h1>
          <p className="text-slate-400">
            Find the right life insurance carrier in seconds
          </p>
          <Link
            href="/history"
            className="inline-block text-sm text-primary hover:text-primary-light transition-colors"
          >
            View search history
          </Link>
        </div>

        {/* Form */}
        <QuoteForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build the history page**

Create `app/history/page.tsx`:

```typescript
import Link from "next/link";
import { getSearchHistory, deleteSearch } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatCoverage(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${(value / 1000).toFixed(0)}K`;
}

function getAcceptanceBadgeVariant(pct: number): "success" | "warning" | "danger" {
  if (pct >= 80) return "success";
  if (pct >= 60) return "warning";
  return "danger";
}

export default async function HistoryPage() {
  const searches = await getSearchHistory();

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Search History</h1>
            <p className="text-sm text-slate-400 mt-1">
              {searches.length} saved searches
            </p>
          </div>
          <Link href="/">
            <Button variant="primary" size="sm">New Search</Button>
          </Link>
        </div>

        {/* Search list */}
        {searches.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-slate-400">No searches yet.</p>
              <Link href="/" className="text-primary hover:text-primary-light text-sm mt-2 inline-block">
                Run your first search
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {searches.map((search) => (
              <Link key={search.id} href={`/results/${search.id}`}>
                <Card hover className="cursor-pointer mb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {search.age}yo {search.gender}
                        </span>
                        <Badge variant="info">{search.state}</Badge>
                        <Badge variant="info">
                          {formatCoverage(search.coverageAmount)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(search.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-300">
                        {search.topCarrier}
                      </p>
                      {search.topAcceptance > 0 && (
                        <Badge variant={getAcceptanceBadgeVariant(search.topAcceptance)}>
                          {search.topAcceptance}% likely
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/history/
git commit -m "feat: add start page with quote form and search history page"
```

---

### Task 13: Build Verification & Fix

**Files:** All files from previous tasks

- [ ] **Step 1: Run the full build**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npm run build
```

- [ ] **Step 2: Fix any TypeScript or build errors**

Read the build output. For each error:
1. Identify the file and line
2. Fix the issue
3. Re-run `npm run build`

Repeat until the build succeeds with zero errors.

- [ ] **Step 3: Run all tests**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npx jest --verbose
```

Fix any test failures.

- [ ] **Step 4: Start the dev server and verify pages load**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
npm run dev
```

Navigate to:
- `http://localhost:3000` — Start page loads, form renders
- Fill out form and submit — redirects to results page
- `http://localhost:3000/history` — History page loads

- [ ] **Step 5: Final commit**

```bash
cd /Users/coreysilvia/Projects/ryan-tool
git add -A
git commit -m "fix: resolve build errors, all tests passing, production ready"
```
