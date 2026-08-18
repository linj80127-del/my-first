import { Promo, StoreResult } from "../types";
import * as sevenEleven from "./sevenEleven";
import * as lawson from "./lawson";
import * as familyMart from "./familyMart";

const SCRAPERS = {
  "seven-eleven": sevenEleven.fetchPromos,
  lawson: lawson.fetchPromos,
  "family-mart": familyMart.fetchPromos,
} as const;

export async function fetchAllStores(): Promise<StoreResult[]> {
  const entries = Object.entries(SCRAPERS) as [keyof typeof SCRAPERS, () => Promise<Promo[]>][];

  return Promise.all(
    entries.map(async ([store, fetchFn]) => {
      const fetchedAt = new Date().toISOString();
      try {
        const promos = await fetchFn();
        return { store, ok: true, promos, error: null, fetchedAt } as StoreResult;
      } catch (err) {
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
