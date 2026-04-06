"use server";

import { prisma } from "@/lib/db";
import { runMatch } from "@/lib/engine/matcher";
import { QuoteInput, QuoteOutput } from "@/lib/engine/types";
import { ProductType } from "@/lib/carriers/types";

// In-memory cache for when DB is unavailable (Vercel cold starts)
const memoryCache = new Map<string, { input: Record<string, unknown>; output: QuoteOutput; createdAt: Date }>();

export async function submitQuote(input: {
  dateOfBirth: string;
  gender: string;
  state: string;
  tobaccoStatus: string;
  tobaccoQuitMonths?: number;
  heightInches?: number;
  weightLbs?: number;
  coverageAmount: number;
  productTypes: ProductType[];
  conditionIds: string[];
}): Promise<string> {
  const quoteInput: QuoteInput = {
    dateOfBirth: input.dateOfBirth,
    gender: input.gender as "male" | "female",
    state: input.state,
    tobaccoStatus: input.tobaccoStatus as "never" | "quit" | "current",
    tobaccoQuitMonths: input.tobaccoQuitMonths,
    heightInches: input.heightInches,
    weightLbs: input.weightLbs,
    coverageAmount: input.coverageAmount,
    productTypes: input.productTypes,
    conditionIds: input.conditionIds,
  };

  const output = runMatch(quoteInput);

  // Try to persist to DB, fall back to memory cache
  try {
    const search = await prisma.search.create({
      data: {
        dateOfBirth: new Date(input.dateOfBirth),
        gender: input.gender,
        state: input.state,
        tobaccoStatus: input.tobaccoStatus,
        tobaccoQuitMonths: input.tobaccoQuitMonths,
        heightInches: input.heightInches,
        weightLbs: input.weightLbs,
        coverageAmount: input.coverageAmount,
        productTypes: input.productTypes.join(",") || "all",
        conditions: JSON.stringify(input.conditionIds),
        results: {
          create: output.results.map((r) => ({
            carrierId: r.carrierId,
            carrierName: r.carrierName,
            eligible: r.eligible,
            acceptancePct: r.acceptancePct,
            tierPlacement: r.tierPlacement,
            productResults: JSON.stringify(r.productResults),
            declineReasons: JSON.stringify(r.declineReasons),
            notes: JSON.stringify(r.notes),
          })),
        },
      },
    });
    return search.id;
  } catch {
    // DB unavailable — use memory cache
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    memoryCache.set(id, { input: input as unknown as Record<string, unknown>, output, createdAt: new Date() });
    return id;
  }
}

export async function getSearch(id: string) {
  // Check memory cache first
  const cached = memoryCache.get(id);
  if (cached) {
    const input = cached.input;
    return {
      id,
      createdAt: cached.createdAt,
      dateOfBirth: new Date(input.dateOfBirth as string),
      gender: input.gender as string,
      state: input.state as string,
      tobaccoStatus: input.tobaccoStatus as string,
      coverageAmount: input.coverageAmount as number,
      conditions: (input.conditionIds as string[]) ?? [],
      results: cached.output.results.map((r) => ({
        id: `mem_${r.carrierId}`,
        searchId: id,
        carrierId: r.carrierId,
        carrierName: r.carrierName,
        eligible: r.eligible,
        acceptancePct: r.acceptancePct,
        tierPlacement: r.tierPlacement,
        productResults: r.productResults,
        declineReasons: r.declineReasons,
        notes: r.notes,
      })),
    };
  }

  try {
    const search = await prisma.search.findUnique({
      where: { id },
      include: { results: true },
    });

    if (!search) return null;

    return {
      ...search,
      conditions: JSON.parse(search.conditions) as string[],
      results: search.results.map((r) => ({
        ...r,
        productResults: JSON.parse(r.productResults),
        declineReasons: r.declineReasons ? JSON.parse(r.declineReasons) : [],
        notes: r.notes ? JSON.parse(r.notes) : [],
      })),
    };
  } catch {
    return null;
  }
}

export async function getSearchHistory() {
  try {
    const searches = await prisma.search.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        results: {
          where: { eligible: true },
          orderBy: { acceptancePct: "desc" },
          take: 1,
        },
      },
    });

    return searches.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      gender: s.gender,
      state: s.state,
      coverageAmount: s.coverageAmount,
      age: Math.floor(
        (new Date().getTime() - new Date(s.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      ),
      topCarrier: s.results[0]?.carrierName ?? "No match",
      topAcceptance: s.results[0]?.acceptancePct ?? 0,
    }));
  } catch {
    // DB unavailable — return memory cache entries
    return Array.from(memoryCache.entries()).map(([id, entry]) => {
      const input = entry.input;
      const topResult = entry.output.results.find((r) => r.eligible);
      const dob = new Date(input.dateOfBirth as string);
      return {
        id,
        createdAt: entry.createdAt,
        gender: input.gender as string,
        state: input.state as string,
        coverageAmount: input.coverageAmount as number,
        age: Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
        topCarrier: topResult?.carrierName ?? "No match",
        topAcceptance: topResult?.acceptancePct ?? 0,
      };
    });
  }
}

export async function deleteSearch(id: string) {
  await prisma.search.delete({ where: { id } });
}
