"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DateOfBirthInput } from "./date-of-birth-input";
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
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [state, setState] = useState("");
  const [tobaccoStatus, setTobaccoStatus] = useState<"never" | "quit" | "current">("never");
  const [tobaccoQuitMonths, setTobaccoQuitMonths] = useState<number>(12);
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInchesRemainder, setHeightInchesRemainder] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [coverageAmount, setCoverageAmount] = useState(250000);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [conditionIds, setConditionIds] = useState<string[]>([]);

  // Build ISO date and calculate age
  const dob =
    dobYear.length === 4 && dobMonth.length >= 1 && dobDay.length >= 1
      ? `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`
      : "";

  const age =
    dob && !isNaN(new Date(dob).getTime())
      ? Math.floor(
          (new Date().getTime() - new Date(dob).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null;

  // Calculate total height in inches and BMI for display
  const totalHeightInches =
    heightFeet && heightInchesRemainder
      ? parseInt(heightFeet) * 12 + parseInt(heightInchesRemainder)
      : heightFeet
        ? parseInt(heightFeet) * 12
        : undefined;
  const bmi =
    totalHeightInches && weightLbs
      ? (parseInt(weightLbs) / (totalHeightInches * totalHeightInches)) * 703
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dob || !state || dobYear.length !== 4) return;

    setLoading(true);
    try {
      const searchId = await submitQuote({
        dateOfBirth: dob,
        gender,
        state,
        tobaccoStatus,
        tobaccoQuitMonths: tobaccoStatus === "quit" ? tobaccoQuitMonths : undefined,
        heightInches: totalHeightInches,
        weightLbs: weightLbs ? parseInt(weightLbs) : undefined,
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
            <DateOfBirthInput
              month={dobMonth}
              day={dobDay}
              year={dobYear}
              onMonthChange={setDobMonth}
              onDayChange={setDobDay}
              onYearChange={setDobYear}
              age={age}
            />
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
            <div />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Height <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="5"
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value.replace(/\D/g, "").slice(0, 1))}
                    className="w-14 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-center placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                    maxLength={1}
                  />
                  <span className="text-slate-500 text-sm">ft</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="10"
                    value={heightInchesRemainder}
                    onChange={(e) => setHeightInchesRemainder(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="w-14 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-center placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                    maxLength={2}
                  />
                  <span className="text-slate-500 text-sm">in</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Weight <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="180"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className="w-20 bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-center placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                  maxLength={3}
                />
                <span className="text-slate-500 text-sm">lbs</span>
                {bmi !== null && (
                  <span className={`text-xs ml-2 ${
                    bmi > 35 ? "text-danger" : bmi > 30 ? "text-warning" : "text-slate-500"
                  }`}>
                    BMI: {bmi.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
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
