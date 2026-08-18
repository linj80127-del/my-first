import { NextRequest, NextResponse } from "next/server";
import { fetchAllStores } from "@/lib/scrapers";
import { getCached, getLastGood, setCache } from "@/lib/cache";
import { PromosResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("refresh") === "1";

  if (!force) {
    const cached = getCached();
    if (cached) return NextResponse.json(cached);
  }

  const results = await fetchAllStores();
  const response: PromosResponse = {
    fetchedAt: new Date().toISOString(),
    results,
  };
  setCache(response);

  // If every store failed on this attempt, prefer the last known-good snapshot over an empty page.
  const allFailed = results.every((r) => !r.ok || r.promos.length === 0);
  if (allFailed) {
    const lastGood = getLastGood();
    if (lastGood) {
      return NextResponse.json({ ...lastGood, stale: true });
    }
  }

  return NextResponse.json(response);
}
