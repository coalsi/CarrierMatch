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
