import * as cheerio from "cheerio";
import { Promo } from "../types";
import { STORES } from "../stores";
import { cleanText, dedupePromos, fetchHtml, parsePeriod } from "./util";
import { genericHeadingBlockScrape, looksGarbled } from "./generic";

// Verified against the live page (2026-08-18): the whole page covers a single campaign
// period (in `section.date`), with each product pair listed as `section.items ul.item_list
// > li.item`, split into `.side-buy` (what you buy) and `.side-get` (what you get free).
const DATE_SELECTOR = "section.date";
const CARD_SELECTOR = "section.items ul.item_list > li.item";

async function scrapeOfficial(url: string): Promise<Promo[]> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const dateText = cleanText($(DATE_SELECTOR).first().text());
  const { periodText, purchaseStart, purchaseEnd, redeemStart, redeemEnd } = parsePeriod(dateText);
  if (!purchaseStart) return [];

  const promos: Promo[] = [];
  $(CARD_SELECTOR).each((i, el) => {
    const card = $(el);
    const buyItem = cleanText(card.find(".side-buy .item-info").text());
    const getItem = cleanText(card.find(".side-get .item-info").text()) || buyItem;
    if (!buyItem) return;
    if (looksGarbled(buyItem) || looksGarbled(getItem)) return;

    promos.push({
      id: `family-mart-${i}-${buyItem}`.slice(0, 120),
      store: "family-mart",
      buyItem,
      getItem,
      price: null,
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
const BLOG_URL = "https://superprofitnews.main.jp/archives/20777";
const BLOG_CONTENT_SELECTORS = [".entry-content", ".post-content", "article", "main"];

export async function fetchPromos(): Promise<Promo[]> {
  try {
    const official = await scrapeOfficial(STORES["family-mart"].sourceUrl);
    if (official.length > 0) return official;
  } catch {
    // fall through to the blog fallback below
  }

  return genericHeadingBlockScrape({
    url: BLOG_URL,
    store: "family-mart",
    contentSelectors: BLOG_CONTENT_SELECTORS,
  });
}
