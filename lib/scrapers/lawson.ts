import { Promo } from "../types";
import { STORES } from "../stores";
import { genericCardScrape, genericHeadingBlockScrape } from "./generic";

// Best-effort selectors for Lawson's campaign listing. Site markup changes without notice —
// if this stops returning results, open the page's devtools and update this list.
const CARD_SELECTORS = [
  ".campaignList li",
  ".campaign-list li",
  ".p-campaign__item",
  "[class*='campaign'] li",
  "main li",
  "article",
];

// Fallback source: a third-party deals blog that tracks this campaign, cross-checked against
// several other independent outlets (see README) for accuracy and update frequency. Used only
// when the official page can't be parsed.
const BLOG_URL = "https://superprofitnews.main.jp/archives/19415";
const BLOG_CONTENT_SELECTORS = [".entry-content", ".post-content", "article", "main"];

export async function fetchPromos(): Promise<Promo[]> {
  try {
    const official = await genericCardScrape({
      url: STORES.lawson.sourceUrl,
      store: "lawson",
      cardSelectors: CARD_SELECTORS,
    });
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
