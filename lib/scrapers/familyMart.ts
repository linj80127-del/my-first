import { Promo } from "../types";
import { STORES } from "../stores";
import { genericCardScrape, genericHeadingBlockScrape } from "./generic";

// Best-effort selectors for the FamilyMart "1個買うと1個もらえる" page. Site markup changes
// without notice — if this stops returning results, open the page's devtools and update this list.
const CARD_SELECTORS = [
  ".product-list li",
  ".item-list li",
  "[class*='product'] li",
  "[class*='lineup'] li",
  "main li",
  "article",
];

// Fallback source: a third-party deals blog that tracks this campaign, cross-checked against
// several other independent outlets (see README) for accuracy and update frequency. Used only
// when the official page can't be parsed.
const BLOG_URL = "https://superprofitnews.main.jp/archives/20777";
const BLOG_CONTENT_SELECTORS = [".entry-content", ".post-content", "article", "main"];

export async function fetchPromos(): Promise<Promo[]> {
  try {
    const official = await genericCardScrape({
      url: STORES["family-mart"].sourceUrl,
      store: "family-mart",
      cardSelectors: CARD_SELECTORS,
    });
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
