"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge } from "@/components/ui/gauge";

interface ProductResult {
  productId: string;
  productName: string;
  productType: string;
  eligible: boolean;
  premiumEstimateMin?: number;
  premiumEstimateMax?: number;
  notes: string[];
}

interface CarrierCardProps {
  carrierId: string;
  carrierName: string;
  eligible: boolean;
  acceptancePct: number;
  tierPlacement: string | null;
  productResults: ProductResult[];
  declineReasons: string[];
  notes: string[];
  portalUrl: string;
}

const productTypeLabels: Record<string, string> = {
  term: "Term Life",
  whole_life: "Whole Life",
  iul: "IUL",
  final_expense: "Final Expense",
};

function getAcceptanceVariant(pct: number): "success" | "warning" | "danger" | "info" {
  if (pct >= 80) return "success";
  if (pct >= 60) return "warning";
  if (pct >= 40) return "warning";
  return "danger";
}

function formatPremium(min?: number, max?: number): string {
  if (min === undefined) return "N/A";
  if (min === max || max === undefined) return `$${min.toFixed(0)}/mo`;
  return `$${min.toFixed(0)} – $${max.toFixed(0)}/mo`;
}

export function CarrierCard({
  carrierName,
  eligible,
  acceptancePct,
  tierPlacement,
  productResults,
  declineReasons,
  notes,
  portalUrl,
}: CarrierCardProps) {
  const [expanded, setExpanded] = useState(false);
  const eligibleProducts = productResults.filter((p) => p.eligible);

  if (!eligible) {
    return (
      <Card className="opacity-60">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-400">{carrierName}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {declineReasons[0] ?? "Not eligible"}
            </p>
          </div>
          <Gauge value={0} size={72} />
        </div>
      </Card>
    );
  }

  return (
    <Card hover>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white">{carrierName}</h3>
          {tierPlacement && (
            <Badge variant={getAcceptanceVariant(acceptancePct)} className="mt-1">
              {tierPlacement}
            </Badge>
          )}

          {/* Eligible products */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {eligibleProducts.map((p) => (
              <Badge key={p.productId} variant="info">
                {productTypeLabels[p.productType] ?? p.productType}
              </Badge>
            ))}
          </div>

          {/* Premium range - show best available */}
          {eligibleProducts.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-slate-400">Estimated premium</p>
              <p className="text-xl font-bold text-white tabular-nums">
                {formatPremium(
                  Math.min(
                    ...eligibleProducts
                      .filter((p) => p.premiumEstimateMin !== undefined)
                      .map((p) => p.premiumEstimateMin!)
                  ),
                  Math.max(
                    ...eligibleProducts
                      .filter((p) => p.premiumEstimateMax !== undefined)
                      .map((p) => p.premiumEstimateMax!)
                  )
                )}
              </p>
            </div>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="mt-2 space-y-1">
              {notes.map((note, i) => (
                <p key={i} className="text-xs text-slate-500">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>

        <Gauge value={acceptancePct} size={88} />
      </div>

      {/* Expandable details */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide Details" : "View Details"}
        </Button>
        <a href={portalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="primary" size="sm">
            Quote on Carrier Site
          </Button>
        </a>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-slate-700 pt-4 space-y-3">
          {productResults.map((p) => (
            <div
              key={p.productId}
              className={`p-3 rounded-xl ${
                p.eligible ? "bg-slate-900/50" : "bg-slate-900/30 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    {p.productName}
                  </p>
                  <Badge variant={p.eligible ? "info" : "default"} className="mt-1">
                    {productTypeLabels[p.productType] ?? p.productType}
                  </Badge>
                </div>
                {p.eligible && (
                  <p className="text-sm font-semibold text-white tabular-nums">
                    {formatPremium(p.premiumEstimateMin, p.premiumEstimateMax)}
                  </p>
                )}
              </div>
              {p.notes.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {p.notes.map((note, i) => (
                    <p key={i} className="text-xs text-slate-500">
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
