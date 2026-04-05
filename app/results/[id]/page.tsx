import { notFound } from "next/navigation";
import Link from "next/link";
import { getSearch } from "@/app/actions";
import { CarrierCard } from "@/components/results/carrier-card";
import { ResultsSummary } from "@/components/results/results-summary";
import { Button } from "@/components/ui/button";
import { carriers } from "@/lib/carriers";
import { getConditionById } from "@/lib/conditions/fuzzy-matcher";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const search = await getSearch(id);

  if (!search) notFound();

  const age = Math.floor(
    (new Date().getTime() - new Date(search.dateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  const conditionNames = search.conditions
    .map((id: string) => getConditionById(id)?.name ?? id)
    .filter(Boolean);

  const eligibleCount = search.results.filter((r: { eligible: boolean }) => r.eligible).length;

  // Get portal URLs from carrier configs
  const carrierPortals: Record<string, string> = {};
  for (const c of carriers) {
    carrierPortals[c.id] = c.portalUrl;
  }

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Carrier Results</h1>
            <p className="text-sm text-slate-400 mt-1">
              {new Date(search.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/history">
              <Button variant="ghost" size="sm">History</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" size="sm">New Search</Button>
            </Link>
          </div>
        </div>

        {/* Summary bar */}
        <ResultsSummary
          age={age}
          gender={search.gender}
          state={search.state}
          tobaccoStatus={search.tobaccoStatus}
          coverageAmount={search.coverageAmount}
          conditionNames={conditionNames}
          eligibleCount={eligibleCount}
          totalCount={search.results.length}
        />

        {/* Carrier cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {search.results.map((result: {
            carrierId: string;
            carrierName: string;
            eligible: boolean;
            acceptancePct: number;
            tierPlacement: string | null;
            productResults: {
              productId: string;
              productName: string;
              productType: string;
              eligible: boolean;
              premiumEstimateMin?: number;
              premiumEstimateMax?: number;
              notes: string[];
            }[];
            declineReasons: string[];
            notes: string[];
          }) => (
            <CarrierCard
              key={result.carrierId}
              carrierId={result.carrierId}
              carrierName={result.carrierName}
              eligible={result.eligible}
              acceptancePct={result.acceptancePct}
              tierPlacement={result.tierPlacement}
              productResults={result.productResults}
              declineReasons={result.declineReasons}
              notes={result.notes}
              portalUrl={carrierPortals[result.carrierId] ?? "#"}
            />
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-600 text-center pt-4">
          Estimates only. Actual eligibility and premiums determined by carrier
          underwriting. Premium ranges are approximations based on publicly available data.
        </p>
      </div>
    </main>
  );
}
