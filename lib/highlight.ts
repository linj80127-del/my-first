import { Promo } from "./types";

export type HighlightKind = "protein" | "unsweetened";

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

// Black (無糖) coffee — wanted alongside tea/water, but only the actually-unsweetened kind;
// lattes, cafe au lait, and other milk/sugar coffee drinks don't count.
const BLACK_COFFEE_KEYWORDS = ["ブラック", "無糖コーヒー", "アメリカーノ"];
const SWEETENED_COFFEE_KEYWORDS = ["カフェラテ", "カフェオレ", "ラテ", "微糖", "加糖"];
// "ブラックサンダー" is a chocolate snack brand, not coffee — the bare "ブラック" match
// would otherwise misfire on it the same way "抹茶" misfired on Lotte's ice cream.
const BLACK_COFFEE_EXCLUDE_KEYWORDS = ["ブラックサンダー"];

// Deliberately excludes zero-calorie/diet soda (e.g. コカ・コーラ ゼロ) — those are
// artificially sweetened, not the "naturally unsweetened" drinks this highlight is for.
// NOT "コーラ" itself — "コカ・コーラ" is also the brand behind plenty of actual tea/coffee
// (綾鷹, ジョージア), and that substring would wrongly exclude all of it.
const NEVER_HIGHLIGHT_KEYWORDS = ["ゼロ"];

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

function isUnsweetenedTeaOrWater(text: string): boolean {
  if (WATER_KEYWORDS.some((k) => text.includes(k))) return true;
  if (TEA_BRAND_KEYWORDS.some((k) => text.includes(k))) return true;
  if (!text.includes("茶")) return false;
  return !SWEETENED_TEA_KEYWORDS.some((k) => text.includes(k));
}

function isBlackCoffee(text: string): boolean {
  if (BLACK_COFFEE_EXCLUDE_KEYWORDS.some((k) => text.includes(k))) return false;
  if (!BLACK_COFFEE_KEYWORDS.some((k) => text.includes(k))) return false;
  return !SWEETENED_COFFEE_KEYWORDS.some((k) => text.includes(k));
}

function isUnsweetenedDrink(text: string): boolean {
  if (NEVER_HIGHLIGHT_KEYWORDS.some((k) => text.includes(k))) return false;
  if (NON_BEVERAGE_KEYWORDS.some((k) => text.includes(k))) return false;
  return isUnsweetenedTeaOrWater(text) || isBlackCoffee(text);
}

export function detectHighlight(promo: Promo): HighlightKind | null {
  const text = `${promo.buyItem} ${promo.getItem}`;
  const lower = text.toLowerCase();

  if (PROTEIN_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) return "protein";
  if (isUnsweetenedDrink(text)) return "unsweetened";
  return null;
}
