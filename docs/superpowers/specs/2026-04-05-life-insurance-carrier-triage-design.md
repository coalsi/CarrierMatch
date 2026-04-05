# Life Insurance Carrier Triage Tool — Design Spec

## Overview

An agent-facing Next.js tool that collects minimal applicant info, matches against 6 life insurance carriers' underwriting rules, and returns eligible carriers with estimated premiums, acceptance likelihood percentages, and links to carrier quoting portals. Searches are persisted for later retrieval.

## Carriers

1. **Americo** — Whole Life, Term, IUL, Final Expense (simplified issue across the board)
2. **Corebridge** (formerly AIG) — Term, IUL, GUL, Final Expense (no standalone whole life)
3. **Transamerica** — Whole Life, Term, IUL, Final Expense (7 underwriting classes)
4. **Aetna** — Final Expense ONLY (Accendo product, 4-tier system with full rate tables)
5. **American Amicable** — Whole Life, Term, IUL, Final Expense (tiered health questions)
6. **Mutual of Omaha** — Whole Life, Term, IUL, Final Expense (simplified + fully underwritten)

## Tech Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** (strict mode)
- **Tailwind CSS 4** + custom design tokens for a polished fintech look
- **Prisma** + **SQLite** (zero-config persistence)
- **Fuse.js** for fuzzy health condition autocomplete
- **Framer Motion** for subtle UI animations
- No authentication (open access for now)

## Architecture

```
ryan-tool/
├── app/
│   ├── layout.tsx                 → Root layout, global styles, fonts
│   ├── page.tsx                   → Input form (start page)
│   ├── results/[id]/page.tsx      → Results page
│   ├── history/page.tsx           → Saved searches
│   └── api/
│       ├── quote/route.ts         → POST: run matching engine, save search, return results
│       └── searches/
│           ├── route.ts           → GET: list saved searches
│           └── [id]/route.ts      → GET: single search with results
├── components/
│   ├── ui/                        → Reusable primitives (Button, Input, Card, Badge, etc.)
│   ├── form/                      → Form-specific components
│   │   ├── QuoteForm.tsx          → Main form orchestrator
│   │   ├── DateOfBirthPicker.tsx
│   │   ├── GenderToggle.tsx
│   │   ├── StateSelector.tsx
│   │   ├── TobaccoToggle.tsx
│   │   ├── CoverageSlider.tsx
│   │   ├── ProductSelector.tsx
│   │   └── ConditionInput.tsx     → Autocomplete + chip display
│   └── results/
│       ├── CarrierCard.tsx        → Single carrier result card
│       ├── AcceptanceBadge.tsx    → Likelihood percentage display
│       ├── PremiumEstimate.tsx    → Cost display with range
│       └── ResultsSummary.tsx     → Overview bar
├── lib/
│   ├── carriers/
│   │   ├── types.ts               → Carrier config type definitions
│   │   ├── americo.ts
│   │   ├── corebridge.ts
│   │   ├── transamerica.ts
│   │   ├── aetna.ts
│   │   ├── american-amicable.ts
│   │   └── mutual-of-omaha.ts
│   ├── engine/
│   │   ├── matcher.ts             → Core eligibility matching
│   │   ├── premium-estimator.ts   → Premium calculation
│   │   ├── acceptance-scorer.ts   → Likelihood scoring
│   │   └── types.ts               → Engine input/output types
│   ├── conditions/
│   │   ├── master-list.ts         → All conditions from all carriers
│   │   ├── categories.ts          → Condition categories
│   │   └── fuzzy-matcher.ts       → Fuse.js config + search
│   └── db.ts                      → Prisma client singleton
├── prisma/
│   └── schema.prisma
└── public/
    └── carriers/                  → Carrier logos (SVG)
```

## Pages

### 1. Start Page (`/`)

Single-page form. Dark slate background (#0f172a) with a floating card form. Modern fintech aesthetic.

**Header area:**
- App name/logo
- Subtle tagline: "Find the right carrier in seconds"
- Link to search history

**Form fields (in order):**

| Field | Type | Details |
|-------|------|---------|
| Date of Birth | Date picker | Calculate age for matching. Display calculated age next to input. |
| Gender | Segmented control | Male / Female |
| State | Searchable dropdown | All 50 states + DC. Show warning if NY selected (limited availability). |
| Tobacco/Nicotine | Segmented control | Never / Quit / Current User. If "Quit" → show "How long ago?" dropdown (6mo, 1yr, 2yr, 3yr, 5yr+) |
| Coverage Amount | Range slider + number input | $5,000 – $2,000,000. Slider snaps to common amounts. Manual override allowed. |
| Product Types | Multi-select chips | Whole Life / Term Life / IUL / Show All (default) |
| Health Conditions | Autocomplete + tags | See Condition Input spec below |

**Condition Input behavior:**
- Text field with placeholder "Type a health condition..."
- As user types, fuzzy-matched suggestions appear in a dropdown
- Suggestions grouped by category (Cardiac, Cancer, Respiratory, Neurological, etc.)
- Selecting a suggestion adds it as a chip/tag below the input
- Chips are dismissible (X button)
- If typed text doesn't match any condition in the master list → show "Not tracked by any carrier — will not affect results" message
- Conditions that ARE in the master list but don't affect ANY carrier negatively → show chip with "Not a factor" subtle label

**CTA Button:** "Find Eligible Carriers" — full width, prominent, with loading state animation.

### 2. Results Page (`/results/[id]`)

Displays after form submission. The search is saved and given an ID for later retrieval.

**Layout:**
- Top: Summary bar showing input snapshot (age, gender, state, tobacco, coverage, conditions entered)
- Below: Carrier result cards in a grid (2 columns on desktop, 1 on mobile)

**Each Carrier Card shows:**
- Carrier logo + name
- Acceptance likelihood: large circular gauge (0-100%) with color coding:
  - 80-100%: Green — "Highly Likely"
  - 60-79%: Yellow — "Likely"
  - 40-59%: Orange — "Possible"
  - 20-39%: Red — "Unlikely"
  - 0-19%: Gray — "Not Eligible"
- Eligible products listed as badges (Whole Life, Term, IUL, Final Expense)
- Estimated monthly premium range (e.g., "$45 – $62/mo")
- Key notes (e.g., "Graded benefit — 2yr waiting period", "Preferred Non-Tobacco class")
- "Quote on Carrier Site" button linking to carrier's agent portal
- Expandable details: specific product names, tier placement, any restrictions

**Sorting:** Cards sorted by acceptance likelihood (highest first). Cards with 0% shown collapsed at bottom with "Not Eligible" label and reason.

**Actions:**
- "New Search" button
- "Save & Share" (copies link)
- Print-friendly view

### 3. History Page (`/history`)

Simple table/list of past searches.

**Columns:**
- Date/time
- Applicant snapshot (age, gender, state)
- Top carrier match + likelihood
- Coverage amount
- "View Results" link

**Features:**
- Search/filter by date
- Delete individual searches
- Most recent first

## Data Model

### Carrier Config Type

```typescript
interface CarrierConfig {
  id: string
  name: string
  logo: string
  portalUrl: string
  products: Product[]
  stateExclusions: string[]              // state codes where NOT available
  productStateExclusions: Record<string, string[]>  // per-product state exclusions
  tobaccoPolicy: TobaccoPolicy
  underwritingTiers: UnderwritingTier[]  // ordered best to worst
  knockoutConditions: string[]           // condition IDs → auto decline
  buildChart?: BuildChart                // height/weight limits if applicable
}

interface Product {
  id: string
  name: string
  type: 'term' | 'whole_life' | 'iul' | 'final_expense'
  issueAgeMin: number
  issueAgeMax: number
  issueAgeMaxSmoker?: number
  faceAmountMin: number
  faceAmountMax: number
  faceAmountMaxByAge?: Record<string, number>  // age range → max
  termLengths?: number[]                        // for term products
  underwritingType: 'simplified' | 'fully_underwritten' | 'guaranteed'
  gradedBenefit?: GradedBenefitSchedule
  rateTable?: RateTable                         // if we have actual rates
  rateEstimateMultiplier?: number               // for carriers without rate tables
}

interface TobaccoPolicy {
  lookbackMonths: number
  preferredLookbackMonths?: number  // longer lookback for preferred class
  cigarException: boolean
  vapingIsTobacco: boolean
  marijuanaPolicy: 'tobacco' | 'separate' | 'non_factor'
}

interface UnderwritingTier {
  id: string
  name: string                          // e.g., "Preferred Plus Non-Tobacco"
  triggerConditions: string[]           // condition IDs that place you here
  lookbackMonths?: number              // conditions only count within this window
  isGraded: boolean
  premiumMultiplier: number            // relative to base rate
}

interface RateTable {
  basisAge: 'last_birthday' | 'nearest_birthday'
  policyFee?: number
  rates: Record<string, Record<number, number>>  // class → age → rate per $1,000
  modalFactors: Record<string, number>            // payment mode → factor
}
```

### Database Schema (Prisma)

```prisma
model Search {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  // Input fields
  dateOfBirth DateTime
  gender      String
  state       String
  tobaccoStatus String            // "never" | "quit" | "current"
  tobaccoQuitMonths Int?          // months since quit, if applicable
  coverageAmount Int
  productTypes String             // comma-separated: "term,whole_life,iul"
  conditions   String             // JSON array of condition IDs

  // Results
  results     Result[]
}

model Result {
  id              String  @id @default(cuid())
  searchId        String
  search          Search  @relation(fields: [searchId], references: [id], onDelete: Cascade)

  carrierId       String
  carrierName     String

  eligible        Boolean
  acceptancePct   Int                // 0-100
  tierPlacement   String?            // e.g., "Preferred Non-Tobacco"

  // Per-product results stored as JSON
  productResults  String             // JSON: array of { productId, eligible, premiumEstMin, premiumEstMax, notes }

  declineReasons  String?            // JSON array of reasons if not eligible
  notes           String?            // JSON array of notes/warnings
}
```

## Matching Engine

### Flow

```
Input → Age Calculator → State Filter → Product Filter → Condition Evaluator → Tier Placement → Premium Estimator → Acceptance Scorer → Ranked Results
```

### Step-by-step:

1. **Calculate age** from DOB (age last birthday for most; age nearest birthday for Mutual of Omaha)
2. **State filter**: Eliminate carriers not available in applicant's state
3. **Product filter**: For each remaining carrier, filter to products that match:
   - Requested product types
   - Age within issue age range
   - Coverage amount within min/max
4. **Knockout check**: If applicant has ANY condition on carrier's knockout list → carrier eliminated (or moved to guaranteed issue if available)
5. **Tier placement**: Walk through carrier's underwriting tiers from best to worst. Place applicant in the best tier where none of their conditions are disqualifying for that tier. Account for lookback periods.
6. **Tobacco adjustment**: Apply tobacco rate class based on carrier's specific policy and applicant's tobacco status + quit timeline
7. **Premium estimation**:
   - Carriers with rate tables (Aetna, partial Americo): calculate exact premiums
   - Carriers without: estimate using industry-average rates adjusted by tier multiplier
8. **Acceptance scoring**: Calculate likelihood percentage based on:
   - Tier placement (higher tier = higher score)
   - Number of conditions vs knockout threshold
   - Whether any conditions are borderline
   - Tobacco status impact
   - Age relative to product limits

### Acceptance Score Algorithm

Base score starts at 95% (healthy applicant, no conditions) and deducts based on risk factors:

```
score = 95

// Tier-based deductions
if tier == "standard": score -= 10
if tier == "substandard": score -= 25
if tier == "graded": score -= 35
if tier == "guaranteed_issue": score -= 50

// Condition-based deductions
for each condition:
  if condition is rated (not knockout, not irrelevant):
    score -= conditionSeverityWeight  // 2-15 points per condition

// Tobacco deduction
if current_smoker: score -= 5
if quit < 12 months: score -= 3

// Age proximity to limits
if age within 5 years of product max: score -= 5
if age within 2 years of product max: score -= 10

// Multiple conditions compound
if ratedConditionCount >= 3: score -= 10 (additional)

score = clamp(score, 0, 99)  // never 100% — we're estimating
```

This produces a directional score, not an actuarial guarantee. Clearly labeled as an estimate.

## Master Condition List

Compiled from all 6 carriers' underwriting questions. Each condition has:

```typescript
interface Condition {
  id: string                    // e.g., "chf"
  name: string                  // "Congestive Heart Failure"
  aliases: string[]             // ["CHF", "heart failure", "weak heart"]
  category: ConditionCategory
  severityWeight: number        // 1-15, used in acceptance scoring
  carrierImpact: Record<string, ConditionImpact>  // carrierId → impact
}

type ConditionCategory =
  | 'cardiac'
  | 'cancer'
  | 'respiratory'
  | 'neurological'
  | 'metabolic'      // diabetes, thyroid, etc.
  | 'organ_disease'  // kidney, liver
  | 'autoimmune'
  | 'mental_health'
  | 'substance_abuse'
  | 'mobility'
  | 'infectious'     // HIV, hepatitis
  | 'other'

interface ConditionImpact {
  effect: 'knockout' | 'graded' | 'rated' | 'standard' | 'preferred_exclusion' | 'non_factor'
  lookbackMonths?: number       // only counts if within this window
  notes?: string
}
```

### Conditions that are KNOCKOUT across ALL carriers (auto-decline):
- Alzheimer's / Dementia
- ALS (Lou Gehrig's Disease)
- HIV/AIDS
- Currently on dialysis
- Organ transplant (pending)
- Currently hospitalized / nursing home / hospice
- Terminal illness
- Huntington's Disease

### Conditions that are KNOCKOUT for SOME but accepted by others:
- Congestive Heart Failure: Knockout at Aetna, Americo; graded at Corebridge, American Amicable
- Multiple Sclerosis: Knockout at Americo; Standard at Aetna, Transamerica; accepted at others
- Parkinson's: Knockout at Americo; Standard at Aetna, Transamerica
- COPD: Standard at most; knockout only if oxygen-dependent
- Cancer (recent): 2-year lookback at most carriers; 4-year at Transamerica for graded

### Conditions that NO carrier screens for (non-factors):
- Chicken pox (varicella)
- Common cold / flu history
- Seasonal allergies
- Minor sprains / fractures (healed)
- Corrected vision (glasses/contacts)
- Mild acne
- Tonsillectomy
- Appendectomy (without complications)
- Carpal tunnel (treated)

These will show "Not a factor — no carrier screens for this condition" in the UI.

## Premium Estimation

### Carriers with actual rate data:

**Aetna:** Full rate tables per $1,000 by age, gender, tobacco, and tier. Formula:
```
annual = (ratePerThousand × units) + $40 policy fee
monthly = annual × 0.0875
```

**Americo (Term/CBO):** Formula:
```
annual = (faceAmount / 1000) × rate + $90 policy fee
monthly = annual × 0.095
```

### Carriers without public rate tables (Corebridge, Transamerica, American Amicable, Mutual of Omaha):

Use industry-average base rates adjusted by:
- Carrier competitiveness factor (derived from sample rates found in research)
- Tier multiplier (preferred = 0.7×, standard = 1.0×, substandard = 1.5×, graded = 1.8×)
- Tobacco multiplier (2.0–2.5× for smokers)
- Age factor (exponential curve)
- Gender factor (females ~15-20% lower)

Base rate formula (industry average, per $1,000, monthly, non-tobacco male, standard):
```
baseRate = 0.05 × e^(0.04 × age)  // exponential age curve
```

Adjusted:
```
monthlyPremium = baseRate × (faceAmount / 1000) × tierMultiplier × tobaccoMultiplier × genderFactor × carrierFactor + policyFee
```

We present these as RANGES (±15%) to communicate uncertainty. Where we have real rates, we show exact numbers.

## Carrier Portal Links

| Carrier | Agent Portal URL |
|---------|-----------------|
| Americo | https://www.americo.com/agents/ |
| Corebridge | https://www.corebridgefinancial.com/financial-professional |
| Transamerica | https://www.transamerica.com/agent |
| Aetna | https://www.aetnaseniorproducts.com/ |
| American Amicable | https://www.americanamicable.com/v4/login.html |
| Mutual of Omaha | https://www.mutualofomaha.com/broker |

## UI Design Direction

**Color palette:**
- Background: Slate 950 (#0f172a) to Slate 900 (#0e1629)
- Cards: Slate 800 (#1e293b) with subtle border (Slate 700)
- Primary accent: Blue 500 (#3b82f6) — CTAs, active states
- Success: Emerald 500 (#10b981) — high acceptance scores
- Warning: Amber 500 (#f59e0b) — medium scores
- Danger: Rose 500 (#f43f5e) — low scores, declines
- Text: White for headings, Slate 300 for body, Slate 500 for muted

**Typography:**
- Font: Inter (clean, modern, excellent at small sizes)
- Headings: Semibold
- Body: Regular
- Numbers/percentages: Tabular nums, medium weight

**Component style:**
- Rounded corners (lg/xl)
- Subtle glass-morphism on cards (backdrop-blur + low opacity background)
- Soft shadows, no hard edges
- Micro-animations: field focus glow, card hover lift, score gauge animation, chip enter/exit
- Loading states: skeleton screens, not spinners

**Responsive:** Mobile-first. Form stacks to single column. Result cards single column on mobile.

## Non-Goals (Explicitly Out of Scope)

- Authentication / user accounts
- Actual carrier API integration (we link to portals instead)
- Policy application submission
- Compliance / regulatory disclaimers (agent-only tool)
- Multi-language support
- Accessibility beyond reasonable defaults (agent tool, not consumer-facing)
