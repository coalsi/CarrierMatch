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
