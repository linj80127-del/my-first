import * as cheerio from "cheerio";
import { Promo } from "../types";
import { STORES } from "../stores";
import { cleanText, dedupePromos, fetchHtml, parsePeriod, parsePrice } from "./util";
import { looksGarbled } from "./generic";

// The "buy X, get Y free" listings each live on their own detail page linked from
// STORES.lawson.sourceUrl (verified against the live site, 2026-08-18).
// Bounds how many detail pages we follow per scrape — the index lists both this week's and
// last week's campaigns, so this comfortably covers a normal week without unbounded fan-out.
const MAX_DETAIL_PAGES = 12;

interface NamedItem {
  name: string;
  price: string | null;
}

// Multi-variant campaigns (e.g. "any of these 2 flavors") list every variant individually;
// showing just the first plus "他" keeps the card readable. Its price is shown alongside —
// the variants aren't always same-priced, but this is the best single price a summarized
// name can honestly carry.
function summarizeItems(items: NamedItem[]): NamedItem {
  if (items.length === 0) return { name: "", price: null };
  if (items.length === 1) return items[0];
  return { name: `${items[0].name} 他`, price: items[0].price };
}

interface DetailInfo {
  buyItems: NamedItem[];
  getItems: NamedItem[];
  purchaseStart: string | null;
  purchaseEnd: string | null;
  redeemStart: string | null;
  redeemEnd: string | null;
  periodText: string | null;
}

// Each detail page is a single `.saleInfo table` whose rows are either a "●..." header
// (naming a 発券期間/引換期間 date range) or a plain product row — with its own `.price`
// cell — that belongs to whichever header came before it, verified against the live page
// structure (2026-08-18).
function parseDetailTable($: cheerio.CheerioAPI): DetailInfo {
  const rows = $(".saleInfo table tr").toArray();
  const buyItems: NamedItem[] = [];
  const getItems: NamedItem[] = [];
  let section: "purchase" | "redeem" | null = null;
  let purchaseStart: string | null = null;
  let purchaseEnd: string | null = null;
  let redeemStart: string | null = null;
  let redeemEnd: string | null = null;
  let purchaseText: string | null = null;
  let redeemText: string | null = null;

  for (const row of rows) {
    const $row = $(row);
    const nameText = cleanText($row.find(".name").text());
    if (!nameText) continue;

    if (nameText.startsWith("●")) {
      const period = parsePeriod(nameText);
      if (!period.purchaseStart) continue;
      if (nameText.includes("引換期間")) {
        section = "redeem";
        redeemStart = period.purchaseStart;
        redeemEnd = period.purchaseEnd;
        redeemText = period.periodText;
      } else {
        section = "purchase";
        purchaseStart = period.purchaseStart;
        purchaseEnd = period.purchaseEnd;
        purchaseText = period.periodText;
      }
      continue;
    }

    const price = parsePrice(cleanText($row.find(".price").text()));
    (section === "redeem" ? getItems : buyItems).push({ name: nameText, price });
  }

  const periodText =
    purchaseText && redeemText ? `${purchaseText} / ${redeemText}` : (purchaseText ?? redeemText);

  return { buyItems, getItems, purchaseStart, purchaseEnd, redeemStart, redeemEnd, periodText };
}

async function scrapeDetailPage(url: string): Promise<Promo | null> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const { buyItems, getItems, purchaseStart, purchaseEnd, redeemStart, redeemEnd, periodText } =
    parseDetailTable($);
  if (!purchaseStart || buyItems.length === 0) return null;

  const buy = summarizeItems(buyItems);
  const get = getItems.length > 0 ? summarizeItems(getItems) : buy;
  if (looksGarbled(buy.name) || looksGarbled(get.name)) return null;

  return {
    id: `lawson-${url}`.slice(0, 120),
    store: "lawson",
    buyItem: buy.name,
    getItem: get.name,
    buyPrice: buy.price,
    getPrice: get.price,
    periodText,
    purchaseStart,
    purchaseEnd,
    redeemStart,
    redeemEnd,
    sourceUrl: url,
  };
}

async function scrapeOfficial(): Promise<Promo[]> {
  const indexUrl = STORES.lawson.sourceUrl;
  const indexHtml = await fetchHtml(indexUrl);
  const $ = cheerio.load(indexHtml);

  // Only "buy N, get N free" campaigns (e.g. "飲料1本もらえる") — excludes discount-coupon
  // campaigns like "パン値引券がもらえる" (get a coupon, not a product), which are a
  // different promo shape than this app tracks.
  const FREE_ITEM_RE = /[0-9０-９]+\s*(?:本|個)\s*もらえる/;
  const hrefs = new Set<string>();
  $("a[href*='/recommend/sale/detail/']").each((_, el) => {
    const text = cleanText($(el).text());
    const href = $(el).attr("href");
    if (href && FREE_ITEM_RE.test(text)) hrefs.add(new URL(href, indexUrl).toString());
  });

  const targets = Array.from(hrefs).slice(0, MAX_DETAIL_PAGES);
  const settled = await Promise.allSettled(targets.map(scrapeDetailPage));
  const promos = settled
    .filter((r): r is PromiseFulfilledResult<Promo | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((p): p is Promo => p !== null);

  return dedupePromos(promos);
}

// No third-party fallback: an unparsed page means no promos for this run rather than
// mixing in less reliable data (a blog fallback previously showed mangled article-intro
// text as if it were a product name when the official scrape failed on Vercel — see the
// commit that removed it).
export async function fetchPromos(): Promise<Promo[]> {
  return scrapeOfficial();
}
