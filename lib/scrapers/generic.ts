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

// Picks a short, human-looking chunk of text to use as the product name, stripping the
// price/period fragments we already parse separately.
function guessProductName(rawText: string, price: string | null, periodText: string | null): string {
  let t = rawText;
  if (price) t = t.replace(price, " ");
  if (periodText) t = t.replace(periodText, " ");
  t = cleanText(t);
  // Truncate to something card-sized; long blocks are usually noise that slipped through.
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

// Stray control bytes (outside plain whitespace) are never legitimate in a product name —
// their presence means something upstream failed to decode cleanly.
const CONTROL_CHAR_RE = new RegExp("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]");

// Catches text that failed to decode cleanly (replacement chars, stray control bytes) so
// it never reaches the UI — a missing promo is far less confusing than a garbled one.
export function looksGarbled(text: string): boolean {
  if (text.includes("�")) return true;
  if (CONTROL_CHAR_RE.test(text)) return true;
  return false;
}

function buildPromo(
  text: string,
  store: StoreId,
  url: string,
  idx: number,
  fallbackName?: string
): Promo | null {
  if (text.length < 4) return null;
  const price = parsePrice(text);
  const { periodText, purchaseStart, purchaseEnd, redeemStart, redeemEnd } = parsePeriod(text);
  // Skip obvious noise (nav/footer links, unrelated paragraphs) with neither a price nor a date range.
  if (!price && !periodText) return null;

  const productName = fallbackName ?? guessProductName(text, price, periodText);
  if (!productName) return null;
  const { buyItem, getItem } = splitBuyGet(text, productName);

  // Defensive guard: never show a promo whose name looks like mojibake (a source
  // encoding we failed to detect correctly) — an empty result is better than garbage.
  if (looksGarbled(buyItem) || looksGarbled(getItem)) return null;

  return {
    id: `${store}-${idx}-${buyItem}`.slice(0, 120),
    store,
    buyItem,
    getItem,
    // This scraper reads one price out of an undifferentiated text blob, so it can't tell
    // whether it belongs to the buy or get item — attribute it to the buy item, since that's
    // what's actually being priced/sold; the free item's price is never stated.
    buyPrice: price,
    getPrice: null,
    periodText,
    purchaseStart,
    purchaseEnd,
    redeemStart,
    redeemEnd,
    sourceUrl: url,
  };
}

export interface GenericScrapeOptions {
  url: string;
  store: StoreId;
  cardSelectors: string[];
  requireKeyword?: RegExp;
  maxItems?: number;
}

// Scrapes card/list-style pages (typical of the convenience store chains' own campaign pages).
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
    if (requireKeyword && !requireKeyword.test(text)) return;
    const promo = buildPromo(text, store, url, i);
    if (promo) promos.push(promo);
  });

  return dedupePromos(promos);
}

export interface HeadingBlockScrapeOptions {
  url: string;
  store: StoreId;
  contentSelectors: string[];
  headingSelector?: string;
  maxItems?: number;
}

// Scrapes "まとめ" blog articles: a content block (e.g. `.entry-content`) containing a
// product name in each heading, followed by paragraph(s) with the price/period. Used as a
// fallback when the chain's own site can't be parsed (structure change, blocking, etc.).
export async function genericHeadingBlockScrape({
  url,
  store,
  contentSelectors,
  headingSelector = "h2, h3, h4",
  maxItems = 40,
}: HeadingBlockScrapeOptions): Promise<Promo[]> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  let root: cheerio.Cheerio<AnyNode> | null = null;
  for (const selector of contentSelectors) {
    const found = $(selector).first();
    if (found.length && cleanText(found.text()).length > 100) {
      root = found;
      break;
    }
  }
  if (!root) return [];

  const headings = root.find(headingSelector).toArray();
  const promos: Promo[] = [];

  headings.forEach((h, i) => {
    if (promos.length >= maxItems) return;
    const $heading = $(h);
    const headingText = cleanText($heading.text());
    // Product name headings in these articles are short; long ones are usually section titles.
    if (!headingText || headingText.length > 60) return;

    const body = cleanText($heading.nextUntil(headingSelector).text());
    const combined = cleanText(`${headingText} ${body}`);
    const promo = buildPromo(combined, store, url, i, headingText);
    if (promo) promos.push(promo);
  });

  return dedupePromos(promos);
}
