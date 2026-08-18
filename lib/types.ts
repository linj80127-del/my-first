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
  periodText: string | null; // human-readable full description (both periods, if both are known)
  purchaseStart: string | null; // ISO date — 発券/購入期間の開始（対象商品を買うと無料券がもらえる期間）
  purchaseEnd: string | null; // ISO date — 発券/購入期間の終了
  redeemStart: string | null; // ISO date — 引換期間の開始（もらった無料券を使える期間）。未確認なら null
  redeemEnd: string | null; // ISO date — 引換期間の終了。未確認なら null
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
