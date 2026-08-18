import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { Promo } from "../types";
import { STORES } from "../stores";
import { cleanText, dedupePromos, fetchHtml, parsePeriod } from "./util";
import { genericHeadingBlockScrape, looksGarbled } from "./generic";

// Verified against the live page (2026-08-18): each campaign is a `.plaichi_box` card with
// a `dl` of 発券期間/引換期間 dates and two item lists — `.ticketing_item` (購入対象商品,
// what you buy) and `.exchange_item` (引換対象商品, what you get free).
const CARD_SELECTOR = ".plaichi_box";

function itemNames($: cheerio.CheerioAPI, card: cheerio.Cheerio<AnyNode>, kindClass: string): string[] {
  const names: string[] = [];
  card.find(`.plaichi_item_inner.${kindClass} .item_list > .item`).each((_, el) => {
    const text = cleanText($(el).find(".item_txt").text() || $(el).text());
    if (text) names.push(text);
  });
  return names;
}

// Multi-variant campaigns (e.g. "any of these 4 yogurt flavors") list every variant
// individually; showing just the first plus "他" keeps the card readable, matching the
// convention already used in lib/seedData.ts.
function summarizeNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names[0]} 他`;
}

async function scrapeOfficial(url: string): Promise<Promo[]> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const promos: Promo[] = [];

  $(CARD_SELECTOR).each((i, el) => {
    const card = $(el);
    const dateText = cleanText(card.find(".plaichi_txt_date").text());
    const { periodText, purchaseStart, purchaseEnd, redeemStart, redeemEnd } = parsePeriod(dateText);
    if (!purchaseStart) return;

    const buyNames = itemNames($, card, "ticketing_item");
    const getNames = itemNames($, card, "exchange_item");
    if (buyNames.length === 0) return;

    const buyItem = summarizeNames(buyNames);
    const getItem = getNames.length > 0 ? summarizeNames(getNames) : buyItem;
    if (looksGarbled(buyItem) || looksGarbled(getItem)) return;

    promos.push({
      id: `seven-eleven-${i}-${buyItem}`.slice(0, 120),
      store: "seven-eleven",
      buyItem,
      getItem,
      buyPrice: null, // not stated on the official page
      getPrice: null,
      periodText,
      purchaseStart,
      purchaseEnd,
      redeemStart,
      redeemEnd,
      sourceUrl: url,
    });
  });

  return dedupePromos(promos);
}

// Fallback source: a third-party deals blog that tracks this campaign, cross-checked against
// several other independent outlets (see README) for accuracy and update frequency. Used only
// when the official page can't be parsed.
const BLOG_URL = "https://superprofitnews.main.jp/archives/12839";
const BLOG_CONTENT_SELECTORS = [".entry-content", ".post-content", "article", "main"];

export async function fetchPromos(): Promise<Promo[]> {
  try {
    const official = await scrapeOfficial(STORES["seven-eleven"].sourceUrl);
    if (official.length > 0) return official;
  } catch {
    // fall through to the blog fallback below
  }

  return genericHeadingBlockScrape({
    url: BLOG_URL,
    store: "seven-eleven",
    contentSelectors: BLOG_CONTENT_SELECTORS,
  });
}
