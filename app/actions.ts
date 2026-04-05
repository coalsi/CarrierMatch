"use server";

import { prisma } from "@/lib/db";
import { runMatch } from "@/lib/engine/matcher";
import { QuoteInput } from "@/lib/engine/types";
import { ProductType } from "@/lib/carriers/types";

export async function submitQuote(input: {
  dateOfBirth: string;
  gender: string;
  state: string;
  tobaccoStatus: string;
  tobaccoQuitMonths?: number;
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
    coverageAmount: input.coverageAmount,
    productTypes: input.productTypes,
    conditionIds: input.conditionIds,
  };

  const output = runMatch(quoteInput);

  const search = await prisma.search.create({
    data: {
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender,
      state: input.state,
      tobaccoStatus: input.tobaccoStatus,
      tobaccoQuitMonths: input.tobaccoQuitMonths,
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
}

export async function getSearch(id: string) {
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
}

export async function getSearchHistory() {
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
}

export async function deleteSearch(id: string) {
  await prisma.search.delete({ where: { id } });
}
