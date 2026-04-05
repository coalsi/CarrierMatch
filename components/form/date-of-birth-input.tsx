"use client";

import { useRef } from "react";

interface DateOfBirthInputProps {
  month: string;
  day: string;
  year: string;
  onMonthChange: (v: string) => void;
  onDayChange: (v: string) => void;
  onYearChange: (v: string) => void;
  age: number | null;
}

export function DateOfBirthInput({
  month,
  day,
  year,
  onMonthChange,
  onDayChange,
  onYearChange,
  age,
}: DateOfBirthInputProps) {
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  function handleMonth(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 2);
    onMonthChange(digits);
    // Auto-advance to day when 2 digits entered
    if (digits.length === 2) {
      dayRef.current?.focus();
    }
  }

  function handleDay(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 2);
    onDayChange(digits);
    // Auto-advance to year when 2 digits entered
    if (digits.length === 2) {
      yearRef.current?.focus();
    }
  }

  function handleYear(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    onYearChange(digits);
  }

  function handleDayKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && day === "") {
      onMonthChange(month);
      const monthInput = (e.currentTarget.previousElementSibling?.previousElementSibling as HTMLInputElement);
      monthInput?.focus();
    }
  }

  function handleYearKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && year === "") {
      onDayChange(day);
      dayRef.current?.focus();
    }
  }

  const fieldClass =
    "bg-transparent text-center text-slate-200 placeholder:text-slate-600 focus:outline-none tabular-nums";

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        Date of Birth
      </label>
      <div className="flex items-center bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all duration-200">
        <input
          type="text"
          inputMode="numeric"
          placeholder="MM"
          value={month}
          onChange={(e) => handleMonth(e.target.value)}
          className={`${fieldClass} w-8`}
          maxLength={2}
          autoComplete="off"
        />
        <span className="text-slate-600 mx-1">/</span>
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          placeholder="DD"
          value={day}
          onChange={(e) => handleDay(e.target.value)}
          onKeyDown={handleDayKeyDown}
          className={`${fieldClass} w-8`}
          maxLength={2}
          autoComplete="off"
        />
        <span className="text-slate-600 mx-1">/</span>
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          placeholder="YYYY"
          value={year}
          onChange={(e) => handleYear(e.target.value)}
          onKeyDown={handleYearKeyDown}
          className={`${fieldClass} w-12`}
          maxLength={4}
          autoComplete="off"
        />
        {age !== null && age > 0 && (
          <span className="ml-auto text-xs text-slate-500 whitespace-nowrap">
            Age: {age}
          </span>
        )}
      </div>
    </div>
  );
}
