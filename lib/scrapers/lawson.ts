import * as cheerio from "cheerio";
import { Promo } from "../types";
import { STORES } from "../stores";
import { cleanText, dedupePromos, fetchHtml, parsePeriod } from "./util";
import { genericHeadingBlockScrape, looksGarbled } from "./generic";

// The "buy X, get Y free" listings each live on their own detail page linked from
// STORES.lawson.sourceUrl (verified against the live site, 2026-08-18).
// Bounds how many detail pages we follow per scrape — the index lists both this week's and
// last week's campaigns, so this comfortably covers a normal week without unbounded fan-out.
const MAX_DETAIL_PAGES = 12;

// Multi-variant campaigns (e.g. "any of these 2 flavors") list every variant individually;
// showing just the first plus "他" keeps the card readable, matching the convention already
// used in lib/seedData.ts.
function summarizeNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names[0]} 他`;
}

interface DetailInfo {
  buyNames: string[];
  getNames: string[];
  purchaseStart: string | null;
  purchaseEnd: string | null;
  redeemStart: string | null;
  redeemEnd: string | null;
  periodText: string | null;
}

// Each detail page is a single `.saleInfo table` whose rows are either a "●..." header
// (naming a 発券期間/引換期間 date range) or a plain product row that belongs to whichever
// header came before it — verified against the live page structure (2026-08-18).
function parseDetailTable($: cheerio.CheerioAPI): DetailInfo {
  const rows = $(".saleInfo table tr").toArray();
  const buyNames: string[] = [];
  const getNames: string[] = [];
  let section: "purchase" | "redeem" | null = null;
  let purchaseStart: string | null = null;
  let purchaseEnd: string | null = null;
  let redeemStart: string | null = null;
  let redeemEnd: string | null = null;
  let purchaseText: string | null = null;
  let redeemText: string | null = null;

  for (const row of rows) {
    const nameText = cleanText($(row).find(".name").text());
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

    (section === "redeem" ? getNames : buyNames).push(nameText);
  }

  const periodText =
    purchaseText && redeemText ? `${purchaseText} / ${redeemText}` : (purchaseText ?? redeemText);

  return { buyNames, getNames, purchaseStart, purchaseEnd, redeemStart, redeemEnd, periodText };
}

async function scrapeDetailPage(url: string): Promise<Promo | null> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const { buyNames, getNames, purchaseStart, purchaseEnd, redeemStart, redeemEnd, periodText } =
    parseDetailTable($);
  if (!purchaseStart || buyNames.length === 0) return null;

  const buyItem = summarizeNames(buyNames);
  const getItem = getNames.length > 0 ? summarizeNames(getNames) : buyItem;
  if (looksGarbled(buyItem) || looksGarbled(getItem)) return null;

  return {
    id: `lawson-${url}`.slice(0, 120),
    store: "lawson",
    buyItem,
    getItem,
    price: null,
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

// Fallback source: a third-party deals blog that tracks this campaign, cross-checked against
// several other independent outlets (see README) for accuracy and update frequency. Used only
// when the official page can't be parsed.
const BLOG_URL = "https://superprofitnews.main.jp/archives/19415";
const BLOG_CONTENT_SELECTORS = [".entry-content", ".post-content", "article", "main"];

export async function fetchPromos(): Promise<Promo[]> {
  try {
    const official = await scrapeOfficial();
    if (official.length > 0) return official;
  } catch {
    // fall through to the blog fallback below
  }

  return genericHeadingBlockScrape({
    url: BLOG_URL,
    store: "lawson",
    contentSelectors: BLOG_CONTENT_SELECTORS,
  });
}
