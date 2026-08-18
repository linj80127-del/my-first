import { StoreId, StoreMeta } from "./types";

export const STORES: Record<StoreId, StoreMeta> = {
  "seven-eleven": {
    id: "seven-eleven",
    name: "セブン-イレブン",
    color: "bg-orange-500",
    sourceUrl: "https://www.sej.co.jp/cmp/plaichi.html",
  },
  lawson: {
    id: "lawson",
    name: "ローソン",
    color: "bg-blue-600",
    // Was "/campaign/" — verified (2026-08-18) that page is a generic gacha/anime-tie-in
    // index with no purchase info; the "buy X, get Y free" listings live under this path.
    sourceUrl: "https://www.lawson.co.jp/recommend/sale/",
  },
  "family-mart": {
    id: "family-mart",
    name: "ファミリーマート",
    color: "bg-emerald-600",
    sourceUrl: "https://www.family.co.jp/campaign/spot/2023_1buy1-receipt_cp.html",
  },
};

export const STORE_LIST = Object.values(STORES);
