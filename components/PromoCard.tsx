import { Promo } from "@/lib/types";
import { STORES } from "@/lib/stores";
import { detectHighlight } from "@/lib/highlight";
import { formatPurchasePeriod } from "@/lib/format";

const HIGHLIGHT_LABEL: Record<string, string> = {
  protein: "プロテイン",
  "tea-water": "無糖茶・水",
};

// A colored left edge plus a tinted tag — visible at a glance while each category keeps
// its own color, without falling back to a loud filled badge.
const HIGHLIGHT_BORDER: Record<string, string> = {
  protein: "border-l-4 border-l-amber-700 dark:border-l-amber-500",
  "tea-water": "border-l-4 border-l-teal-700 dark:border-l-teal-500",
};

const HIGHLIGHT_TAG: Record<string, string> = {
  protein: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  "tea-water": "bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
};

// A fixed height (not just a minimum) plus line-clamp keeps every card's item boxes the
// same size across the whole grid, regardless of how long a given product name is —
// overflowing names truncate with an ellipsis instead of growing the box.
function ItemBox({ name, price }: { name: string; price: string | null }) {
  return (
    <div className="flex h-28 flex-1 flex-col justify-between overflow-hidden border border-stone-200 p-2.5 dark:border-stone-700">
      <p className="line-clamp-3 text-xs leading-snug text-stone-800 dark:text-stone-100">
        {name}
      </p>
      <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{price ?? " "}</p>
    </div>
  );
}

export default function PromoCard({ promo }: { promo: Promo }) {
  const meta = STORES[promo.store];
  const highlight = detectHighlight(promo);

  return (
    <a
      href={promo.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block border border-stone-200 bg-white p-5 transition-colors hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600 ${
        highlight ? HIGHLIGHT_BORDER[highlight] : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs tracking-wide text-stone-500 dark:text-stone-400">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.color}`} aria-hidden />
          {meta.name}
        </span>
        {highlight && (
          <span
            className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${HIGHLIGHT_TAG[highlight]}`}
          >
            {HIGHLIGHT_LABEL[highlight]}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-stretch gap-2">
        <ItemBox name={promo.buyItem} price={promo.buyPrice} />
        <div className="flex w-5 shrink-0 items-center justify-center text-stone-400" aria-hidden>
          →
        </div>
        <ItemBox name={promo.getItem} price={promo.getPrice} />
      </div>

      <dl className="mt-4 space-y-1 border-t border-stone-100 pt-3 text-sm dark:border-stone-800">
        <div className="flex gap-3">
          <dt className="w-16 shrink-0 text-stone-400">発券期間</dt>
          <dd className="text-stone-600 dark:text-stone-300">{formatPurchasePeriod(promo)}</dd>
        </div>
      </dl>
    </a>
  );
}
