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
