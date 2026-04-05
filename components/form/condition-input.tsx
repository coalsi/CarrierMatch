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
