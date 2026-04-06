export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSearchHistory } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatCoverage(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${(value / 1000).toFixed(0)}K`;
}

function getAcceptanceBadgeVariant(pct: number): "success" | "warning" | "danger" {
  if (pct >= 80) return "success";
  if (pct >= 60) return "warning";
  return "danger";
}

export default async function HistoryPage() {
  const searches = await getSearchHistory();

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Search History</h1>
            <p className="text-sm text-slate-400 mt-1">
              {searches.length} saved searches
            </p>
          </div>
          <Link href="/">
            <Button variant="primary" size="sm">New Search</Button>
          </Link>
        </div>

        {/* Search list */}
        {searches.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-slate-400">No searches yet.</p>
              <Link href="/" className="text-primary hover:text-primary-light text-sm mt-2 inline-block">
                Run your first search
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {searches.map((search) => (
              <Link key={search.id} href={`/results/${search.id}`}>
                <Card hover className="cursor-pointer mb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {search.age}yo {search.gender}
                        </span>
                        <Badge variant="info">{search.state}</Badge>
                        <Badge variant="info">
                          {formatCoverage(search.coverageAmount)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(search.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-300">
                        {search.topCarrier}
                      </p>
                      {search.topAcceptance > 0 && (
                        <Badge variant={getAcceptanceBadgeVariant(search.topAcceptance)}>
                          {search.topAcceptance}% likely
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
