import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { Promo } from "../types";
import { STORES } from "../stores";
import { cleanText, dedupePromos, fetchHtml, parsePeriod } from "./util";
import { looksGarbled } from "./generic";

// Verified against the live page (2026-08-18): each campaign is a `.plaichi_box` card with
// a `dl` of 発券期間/引換期間 dates and two item lists — `.ticketing_item` (購入対象商品,
// what you buy) and `.exchange_item` (引換対象商品, what you get free). Each `.item` also
// has a product photo (`.item_img img`).
const CARD_SELECTOR = ".plaichi_box";

interface NamedItem {
  name: string;
  imageUrl: string | null;
}

function items(
  $: cheerio.CheerioAPI,
  card: cheerio.Cheerio<AnyNode>,
  pageUrl: string,
  kindClass: string
): NamedItem[] {
  const out: NamedItem[] = [];
  card.find(`.plaichi_item_inner.${kindClass} .item_list > .item`).each((_, el) => {
    const $el = $(el);
    const name = cleanText($el.find(".item_txt").text() || $el.text());
    if (!name) return;
    const src = $el.find(".item_img img").attr("src");
    const imageUrl = src ? new URL(src, pageUrl).toString() : null;
    out.push({ name, imageUrl });
  });
  return out;
}

// Multi-variant campaigns (e.g. "any of these 4 yogurt flavors") list every variant
// individually; showing just the first plus "他" keeps the card readable. Its photo is
// shown alongside, same as the name.
function summarize(items: NamedItem[]): NamedItem {
  if (items.length === 0) return { name: "", imageUrl: null };
  if (items.length === 1) return items[0];
  return { name: `${items[0].name} 他`, imageUrl: items[0].imageUrl };
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

    const buyItems = items($, card, url, "ticketing_item");
    const getItems = items($, card, url, "exchange_item");
    if (buyItems.length === 0) return;

    const buy = summarize(buyItems);
    const get = getItems.length > 0 ? summarize(getItems) : buy;
    if (looksGarbled(buy.name) || looksGarbled(get.name)) return;

    promos.push({
      id: `seven-eleven-${i}-${buy.name}`.slice(0, 120),
      store: "seven-eleven",
      buyItem: buy.name,
      getItem: get.name,
      buyPrice: null, // not stated on the official page
      getPrice: null,
      buyImageUrl: buy.imageUrl,
      getImageUrl: get.imageUrl,
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
  return scrapeOfficial(STORES["seven-eleven"].sourceUrl);
}
