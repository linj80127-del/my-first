import { Promo } from "@/lib/types";
import { STORES } from "@/lib/stores";
import { detectHighlight } from "@/lib/highlight";

const HIGHLIGHT_LABEL: Record<string, string> = {
  protein: "プロテイン",
  "tea-water": "無糖茶・水",
};

// A small accent dot rather than a colored block — highlight stays legible without
// competing with the product name for attention.
const HIGHLIGHT_DOT: Record<string, string> = {
  protein: "bg-red-700/80",
  "tea-water": "bg-teal-700/80",
};

export default function PromoCard({ promo }: { promo: Promo }) {
  const meta = STORES[promo.store];
  const sameItem = promo.buyItem === promo.getItem;
  const highlight = detectHighlight(promo);

  return (
    <a
      href={promo.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border border-stone-200 bg-white p-5 transition-colors hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs tracking-wide text-stone-500 dark:text-stone-400">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.color}`} aria-hidden />
          {meta.name}
        </span>
        {highlight && (
          <span className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
            <span className={`h-1.5 w-1.5 rounded-full ${HIGHLIGHT_DOT[highlight]}`} aria-hidden />
            {HIGHLIGHT_LABEL[highlight]}
          </span>
        )}
      </div>

      <div className="mt-4">
        {sameItem ? (
          <p className="text-base font-medium leading-snug text-stone-900 dark:text-stone-50">
            {promo.buyItem}
          </p>
        ) : (
          <p className="text-base font-medium leading-snug text-stone-900 dark:text-stone-50">
            {promo.buyItem}
            <span className="mx-1.5 text-stone-400">→</span>
            {promo.getItem}
          </p>
        )}
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
          {sameItem ? "1個買うと1個もらえる" : "対象商品購入でもらえる"}
        </p>
      </div>

      <dl className="mt-4 space-y-1 border-t border-stone-100 pt-3 text-sm dark:border-stone-800">
        {promo.price && (
          <div className="flex gap-3">
            <dt className="w-10 shrink-0 text-stone-400">価格</dt>
            <dd className="text-stone-600 dark:text-stone-300">{promo.price}</dd>
          </div>
        )}
        <div className="flex gap-3">
          <dt className="w-10 shrink-0 text-stone-400">期間</dt>
          <dd className="text-stone-600 dark:text-stone-300">
            {promo.periodText ?? "公式サイトで確認"}
          </dd>
        </div>
      </dl>
    </a>
  );
}
