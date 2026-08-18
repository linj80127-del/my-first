import { Promo } from "../types";
import { STORES } from "../stores";
import { genericCardScrape } from "./generic";

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

export async function fetchPromos(): Promise<Promo[]> {
  return genericCardScrape({
    url: STORES["family-mart"].sourceUrl,
    store: "family-mart",
    cardSelectors: CARD_SELECTORS,
  });
}
