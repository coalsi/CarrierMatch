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
