export type StoreId = "seven-eleven" | "lawson" | "family-mart";

export interface StoreMeta {
  id: StoreId;
  name: string;
  color: string; // tailwind bg class for the badge
  sourceUrl: string;
}

export interface Promo {
  id: string;
  store: StoreId;
  buyItem: string;
  getItem: string;
  price: string | null;
  periodText: string | null;
  periodStart: string | null; // ISO date, if parseable
  periodEnd: string | null; // ISO date, if parseable
  sourceUrl: string;
}

export interface StoreResult {
  store: StoreId;
  ok: boolean;
  promos: Promo[];
  error: string | null;
  fetchedAt: string;
}

export interface PromosResponse {
  fetchedAt: string;
  results: StoreResult[];
}
