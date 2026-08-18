import { Promo, StoreId, StoreResult } from "../types";
import { SEED_PROMOS } from "../seedData";
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

// Seed entries are a manually researched baseline (see lib/seedData.ts), not the live
// source.
function seedPromosFor(store: StoreId): Promo[] {
  return SEED_PROMOS.filter((p) => p.store === store);
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
      const seedPromos = seedPromosFor(store).filter(isCurrentlyPurchasable);
      try {
        const livePromos = (await fetchFn()).filter(isCurrentlyPurchasable);
        return {
          store,
          ok: true,
          promos: dedupeByProduct([...livePromos, ...seedPromos]),
          error: null,
          fetchedAt,
        } as StoreResult;
      } catch (err) {
        // A live-fetch failure still isn't a dead end as long as the seed baseline covers it.
        return {
          store,
          ok: seedPromos.length > 0,
          promos: seedPromos,
          error: err instanceof Error ? err.message : String(err),
          fetchedAt,
        } as StoreResult;
      }
    })
  );
}
