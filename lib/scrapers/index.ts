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

// Seed entries are a manually researched baseline (see lib/seedData.ts), not the live
// source — an expired one would otherwise linger on screen looking current.
function activeSeedPromosFor(store: StoreId): Promo[] {
  const today = new Date().toISOString().slice(0, 10);
  return SEED_PROMOS.filter((p) => p.store === store && (!p.periodEnd || p.periodEnd >= today));
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
      const seedPromos = activeSeedPromosFor(store);
      try {
        const livePromos = await fetchFn();
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
