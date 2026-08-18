import { Promo } from "./types";

export type HighlightKind = "protein" | "tea-water";

// Best-effort keyword match against common Japanese convenience-store product naming.
// Tune these lists if real product names slip through uncaught.
const PROTEIN_KEYWORDS = ["プロテイン", "protein", "ザバス", "SAVAS"];

const WATER_KEYWORDS = [
  "ミネラルウォーター",
  "天然水",
  "い・ろ・は・す",
  "いろはす",
  "炭酸水",
  "スパークリングウォーター",
];

// Brand names that are unsweetened tea but don't literally contain the character "茶".
const TEA_BRAND_KEYWORDS = ["伊右衛門", "綾鷹"];

// Most bottled/canned tea sold at Japanese convenience stores is unsweetened (無糖) by
// default — sweetened exceptions (milk tea, chai, flavored lattes) are the rare case, so
// this excludes those instead of requiring an exhaustive allowlist of every unsweetened
// tea name (which previously missed things like "むぎ茶" written in hiragana).
const SWEETENED_TEA_KEYWORDS = [
  "ミルクティー",
  "ロイヤルミルクティー",
  "抹茶ラテ",
  "ほうじ茶ラテ",
  "紅茶ラテ",
  "チャイ",
  "加糖",
  "微糖",
];

// "茶" also shows up as a plain flavor descriptor on non-beverages (matcha ice cream,
// hojicha pudding, etc.) — those aren't a tea/water drink at all, so exclude them even
// though the sweetness rule above wouldn't catch them. "ロッテ 爽" specifically is Lotte's
// ice cream line (its 抹茶/ほうじ茶 flavors got wrongly caught by the blanket "茶" match).
const NON_BEVERAGE_KEYWORDS = [
  "ロッテ 爽",
  "アイス",
  "シャーベット",
  "ジェラート",
  "かき氷",
  "プリン",
  "ゼリー",
  "ケーキ",
  "パフェ",
];

function isTeaOrWater(text: string): boolean {
  if (WATER_KEYWORDS.some((k) => text.includes(k))) return true;
  if (NON_BEVERAGE_KEYWORDS.some((k) => text.includes(k))) return false;
  if (TEA_BRAND_KEYWORDS.some((k) => text.includes(k))) return true;
  if (!text.includes("茶")) return false;
  return !SWEETENED_TEA_KEYWORDS.some((k) => text.includes(k));
}

export function detectHighlight(promo: Promo): HighlightKind | null {
  const text = `${promo.buyItem} ${promo.getItem}`;
  const lower = text.toLowerCase();

  if (PROTEIN_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) return "protein";
  if (isTeaOrWater(text)) return "tea-water";
  return null;
}
