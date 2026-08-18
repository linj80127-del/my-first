import * as cheerio from "cheerio";
import { Promo } from "../types";
import { STORES } from "../stores";
import { cleanText, dedupePromos, fetchHtml, parsePeriod } from "./util";
import { looksGarbled } from "./generic";

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

    const buySrc = card.find(".side-buy .item-img img").attr("src");
    const getSrc = card.find(".side-get .item-img img").attr("src");

    promos.push({
      id: `family-mart-${i}-${buyItem}`.slice(0, 120),
      store: "family-mart",
      buyItem,
      getItem,
      buyPrice: null, // not stated on the official page
      getPrice: null,
      buyImageUrl: buySrc ? new URL(buySrc, url).toString() : null,
      getImageUrl: getSrc ? new URL(getSrc, url).toString() : null,
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

// No third-party fallback: an unparsed page means no promos for this run rather than
// mixing in less reliable data (a blog fallback previously showed mangled article-intro
// text as if it were a product name when the official scrape failed on Vercel — see the
// commit that removed it).
export async function fetchPromos(): Promise<Promo[]> {
  return scrapeOfficial(STORES["family-mart"].sourceUrl);
}
