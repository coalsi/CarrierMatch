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
