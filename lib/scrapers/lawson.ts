import { Promo } from "../types";
import { STORES } from "../stores";
import { genericCardScrape } from "./generic";

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

export async function fetchPromos(): Promise<Promo[]> {
  return genericCardScrape({
    url: STORES.lawson.sourceUrl,
    store: "lawson",
    cardSelectors: CARD_SELECTORS,
  });
}
