import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { Promo, StoreId } from "../types";
import { cleanText, dedupePromos, fetchHtml, parsePeriod, parsePrice } from "./util";

// "Aを買うとBがもらえる" type phrasing -> split into a buy item and a (possibly different) get item.
const BUY_GET_RE =
  /(.{2,30}?)(?:を)?(?:買うと|購入で|購入すると|お買い上げで)(.{2,30}?)(?:が|を)?(?:もらえる|プレゼント|無料|進呈)/;

function splitBuyGet(text: string, fallbackName: string): { buyItem: string; getItem: string } {
  const m = text.match(BUY_GET_RE);
  if (m) {
    return { buyItem: cleanText(m[1]), getItem: cleanText(m[2]) };
  }
  // Most "1個買うと1個もらえる" (プライチ) campaigns give the same product for free.
  return { buyItem: fallbackName, getItem: fallbackName };
}

// Picks the first short, human-looking line out of a card's text to use as the product name,
// stripping the price/period fragments we already parse separately.
function guessProductName(rawText: string, price: string | null, periodText: string | null): string {
  let t = rawText;
  if (price) t = t.replace(price, " ");
  if (periodText) t = t.replace(periodText, " ");
  t = cleanText(t);
  // Truncate to something card-sized; long blocks are usually noise (nav/footer) that slipped through.
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

export interface GenericScrapeOptions {
  url: string;
  store: StoreId;
  cardSelectors: string[];
  requireKeyword?: RegExp;
  maxItems?: number;
}

export async function genericCardScrape({
  url,
  store,
  cardSelectors,
  requireKeyword,
  maxItems = 40,
}: GenericScrapeOptions): Promise<Promo[]> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  let cards: cheerio.Cheerio<AnyNode> | null = null;
  for (const selector of cardSelectors) {
    const found = $(selector);
    if (found.length >= 2 && found.length <= 300) {
      cards = found;
      break;
    }
  }
  if (!cards) return [];

  const promos: Promo[] = [];
  cards.each((i, el) => {
    if (promos.length >= maxItems) return;
    const text = cleanText($(el).text());
    if (text.length < 4) return;
    if (requireKeyword && !requireKeyword.test(text)) return;

    const price = parsePrice(text);
    const { periodText, periodStart, periodEnd } = parsePeriod(text);
    // Skip obvious noise (nav/footer links etc.) that has neither a price nor a date range.
    if (!price && !periodText) return;

    const productName = guessProductName(text, price, periodText);
    if (!productName) return;
    const { buyItem, getItem } = splitBuyGet(text, productName);

    promos.push({
      id: `${store}-${i}-${buyItem}`.slice(0, 120),
      store,
      buyItem,
      getItem,
      price,
      periodText,
      periodStart,
      periodEnd,
      sourceUrl: url,
    });
  });

  return dedupePromos(promos);
}
