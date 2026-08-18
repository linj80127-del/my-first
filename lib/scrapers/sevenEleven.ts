import { Promo } from "../types";
import { STORES } from "../stores";
import { genericCardScrape } from "./generic";

// Best-effort selectors for the SEJ "プライチ" page. Site markup changes without notice —
// if this stops returning results, open the page's devtools and update this list.
const CARD_SELECTORS = [
  ".cmp-plaichi__item",
  ".plaichi-item",
  ".p-plaichi__item",
  "[class*='plaichi'] li",
  "[class*='plaichi'] article",
  "main li",
  "article",
];

export async function fetchPromos(): Promise<Promo[]> {
  return genericCardScrape({
    url: STORES["seven-eleven"].sourceUrl,
    store: "seven-eleven",
    cardSelectors: CARD_SELECTORS,
  });
}
