import { Promo, StoreId, StoreResult } from "../types";
import * as sevenEleven from "./sevenEleven";
import * as lawson from "./lawson";
import * as familyMart from "./familyMart";

const SCRAPERS = {
  "seven-eleven": sevenEleven.fetchPromos,
  lawson: lawson.fetchPromos,
  "family-mart": familyMart.fetchPromos,
} as const;

// Only show promos you can still act on today — i.e. still inside the 発券/購入期間 (the
// window during which buying the item actually gets you the free-item voucher). A promo
// whose purchase window already closed is stale even if its 引換期間 (using an
// already-issued voucher) is technically still open, and an unparsed purchase window is
// treated as "still current" rather than hidden.
function isCurrentlyPurchasable(promo: Promo): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (promo.purchaseStart && promo.purchaseStart > today) return false;
  if (promo.purchaseEnd && promo.purchaseEnd < today) return false;
  return true;
}

function dedupeByProduct(promos: Promo[]): Promo[] {
  const seen = new Set<string>();
  const out: Promo[] = [];
  for (const p of promos) {
    const key = `${p.buyItem}__${p.getItem}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export async function fetchAllStores(): Promise<StoreResult[]> {
  const entries = Object.entries(SCRAPERS) as [StoreId, () => Promise<Promo[]>][];

  return Promise.all(
    entries.map(async ([store, fetchFn]) => {
      const fetchedAt = new Date().toISOString();
      try {
        const livePromos = (await fetchFn()).filter(isCurrentlyPurchasable);
        return {
          store,
          ok: true,
          promos: dedupeByProduct(livePromos),
          error: null,
          fetchedAt,
        } as StoreResult;
      } catch (err) {
        // No fallback data source — an honest "couldn't fetch this" beats silently mixing
        // in a third-party baseline that can drift stale or, worse, be mis-scraped itself.
        return {
          store,
          ok: false,
          promos: [],
          error: err instanceof Error ? err.message : String(err),
          fetchedAt,
        } as StoreResult;
      }
    })
  );
}
