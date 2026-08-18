import { Promo } from "./types";

export type HighlightKind = "protein" | "tea-water";

// Best-effort keyword match against common Japanese convenience-store product naming.
// Tune these lists if real product names slip through uncaught.
const PROTEIN_KEYWORDS = ["プロテイン", "protein", "ザバス", "SAVAS"];

const TEA_WATER_KEYWORDS = [
  // unsweetened tea
  "無糖茶",
  "緑茶",
  "烏龍茶",
  "ウーロン茶",
  "麦茶",
  "紅茶",
  "ほうじ茶",
  "玄米茶",
  "そば茶",
  "お〜いお茶",
  "おーいお茶",
  "伊右衛門",
  "綾鷹",
  "生茶",
  "爽健美茶",
  // water
  "ミネラルウォーター",
  "天然水",
  "い・ろ・は・す",
  "いろはす",
];

export function detectHighlight(promo: Promo): HighlightKind | null {
  const text = `${promo.buyItem} ${promo.getItem}`;
  const lower = text.toLowerCase();

  if (PROTEIN_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) return "protein";
  if (TEA_WATER_KEYWORDS.some((k) => text.includes(k))) return "tea-water";
  return null;
}
