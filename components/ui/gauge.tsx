"use client";

import { useEffect, useState } from "react";

interface GaugeProps {
  value: number; // 0-100
  size?: number;
  label?: string;
}

function getColor(value: number): string {
  if (value >= 80) return "#10b981"; // emerald
  if (value >= 60) return "#f59e0b"; // amber
  if (value >= 40) return "#f97316"; // orange
  if (value >= 20) return "#f43f5e"; // rose
  return "#64748b"; // slate
}

function getLabel(value: number): string {
  if (value >= 80) return "Highly Likely";
  if (value >= 60) return "Likely";
  if (value >= 40) return "Possible";
  if (value >= 20) return "Unlikely";
  return "Not Eligible";
}

export function Gauge({ value, size = 100, label }: GaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const color = getColor(value);
  const displayLabel = label ?? getLabel(value);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedValue / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-700"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color }}
          >
            {animatedValue}%
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-400">{displayLabel}</span>
    </div>
  );
}
