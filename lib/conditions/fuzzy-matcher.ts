import Fuse from "fuse.js";
import { masterConditionList, nonFactorConditions, Condition } from "./master-list";
import { ConditionCategory } from "./categories";

export interface ConditionSearchResult {
  id: string;
  name: string;
  category: ConditionCategory;
  score: number;
}

const fuseIndex = new Fuse(masterConditionList, {
  keys: [
    { name: "name", weight: 2 },
    { name: "aliases", weight: 1.5 },
    { name: "id", weight: 0.5 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
});

const nonFactorFuse = new Fuse(
  nonFactorConditions.map((name) => ({ name })),
  {
    keys: ["name"],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
  }
);

export function searchConditions(
  query: string,
  maxResults: number = 10
): ConditionSearchResult[] {
  if (!query || query.trim().length === 0) return [];

  const results = fuseIndex.search(query.trim(), { limit: maxResults });

  return results.map((r) => ({
    id: r.item.id,
    name: r.item.name,
    category: r.item.category,
    score: 1 - (r.score ?? 0),
  }));
}

export function isNonFactor(query: string): boolean {
  if (!query || query.trim().length === 0) return false;

  const results = nonFactorFuse.search(query.trim(), { limit: 1 });
  return results.length > 0 && (results[0].score ?? 1) < 0.35;
}

export function getConditionById(id: string): Condition | undefined {
  return masterConditionList.find((c) => c.id === id);
}

export function getAllConditions(): Condition[] {
  return masterConditionList;
}
