import { Promo } from "@/lib/types";
import { STORES } from "@/lib/stores";
import { detectHighlight } from "@/lib/highlight";

const HIGHLIGHT_BORDER: Record<string, string> = {
  protein: "border-2 border-red-500",
  "tea-water": "border-2 border-blue-500",
};

const HIGHLIGHT_LABEL: Record<string, string> = {
  protein: "プロテイン",
  "tea-water": "無糖茶・水",
};

const HIGHLIGHT_LABEL_COLOR: Record<string, string> = {
  protein: "text-red-600 dark:text-red-400",
  "tea-water": "text-blue-600 dark:text-blue-400",
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
      className={`block rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-zinc-900 ${
        highlight
          ? HIGHLIGHT_BORDER[highlight]
          : "border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${meta.color}`}
        >
          {meta.name}
        </span>
        {highlight && (
          <span className={`text-xs font-semibold ${HIGHLIGHT_LABEL_COLOR[highlight]}`}>
            {HIGHLIGHT_LABEL[highlight]}
          </span>
        )}
      </div>

      <div className="mt-3">
        {sameItem ? (
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {promo.buyItem}
          </p>
        ) : (
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {promo.buyItem}
            <span className="mx-1.5 text-zinc-400">→</span>
            {promo.getItem}
          </p>
        )}
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {sameItem ? "1個買うと1個もらえる" : "対象商品購入でもらえる"}
        </p>
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        {promo.price && (
          <div className="flex gap-2">
            <dt className="w-12 shrink-0 text-zinc-400">価格</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">{promo.price}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-zinc-400">期間</dt>
          <dd className="text-zinc-700 dark:text-zinc-300">
            {promo.periodText ?? "公式サイトで確認"}
          </dd>
        </div>
      </dl>
    </a>
  );
}
