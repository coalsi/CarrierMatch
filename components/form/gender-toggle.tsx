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
