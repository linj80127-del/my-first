import { Promo } from "@/lib/types";
import { STORES } from "@/lib/stores";
import { detectHighlight } from "@/lib/highlight";
import { formatPurchasePeriod } from "@/lib/format";
import HighlightIllustration from "./HighlightIllustration";

const HIGHLIGHT_LABEL: Record<string, string> = {
  protein: "プロテイン",
  unsweetened: "無糖飲料",
};

// A colored left edge plus a tinted tag — visible at a glance while each category keeps
// its own color, without falling back to a loud filled badge.
const HIGHLIGHT_BORDER: Record<string, string> = {
  protein: "border-l-4 border-l-amber-700 dark:border-l-amber-500",
  unsweetened: "border-l-4 border-l-teal-700 dark:border-l-teal-500",
};

const HIGHLIGHT_TAG: Record<string, string> = {
  protein: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  unsweetened: "bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
};

// A large, faint watermark of the category's icon in the corner — decoration, not
// information, so it stays low-contrast enough to never compete with the actual text.
const HIGHLIGHT_WATERMARK: Record<string, string> = {
  protein: "text-amber-800/[0.14] dark:text-amber-300/[0.14]",
  unsweetened: "text-teal-800/[0.14] dark:text-teal-300/[0.14]",
};

// A fixed height (not just a minimum) plus line-clamp keeps every card's item boxes the
// same size across the whole grid, regardless of how long a given product name is —
// overflowing names truncate with an ellipsis instead of growing the box. The product
// photo (when the source has one) sits as a cover background behind the name, with a
// scrim so the text stays legible over whatever the photo looks like; a missing/failed
// image just quietly shows the plain box underneath (no broken-image icon, since this
// uses a CSS background rather than an <img> tag).
function ItemBox({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  return (
    <div
      className={`relative flex h-28 flex-1 overflow-hidden border border-stone-200 bg-stone-50 bg-cover bg-center dark:border-stone-700 dark:bg-stone-800 ${
        imageUrl ? "items-end" : "items-center"
      }`}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      {imageUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/75 via-40% to-transparent dark:from-stone-900 dark:via-stone-900/80" />
      )}
      <p className="relative line-clamp-3 p-2.5 text-xs leading-snug text-stone-800 dark:text-stone-100">
        {name}
      </p>
    </div>
  );
}

// Deliberately just a name search, not a coordinates-based query — Google Maps already
// centers an open-ended chain-name search on the device's own current location (and asks
// its own location permission if needed), so there's no reason to handle geolocation here.
function storeMapsUrl(storeName: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeName)}`;
}

export default function PromoCard({ promo }: { promo: Promo }) {
  const meta = STORES[promo.store];
  const highlight = detectHighlight(promo);

  return (
    <div
      className={`relative overflow-hidden border border-stone-200 bg-white transition-colors hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600 ${
        highlight ? HIGHLIGHT_BORDER[highlight] : ""
      }`}
    >
      {highlight && (
        <HighlightIllustration
          kind={highlight}
          className={`pointer-events-none absolute -bottom-5 -right-5 h-32 w-32 ${HIGHLIGHT_WATERMARK[highlight]}`}
        />
      )}

      <a
        href={promo.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block p-5"
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
          <ItemBox name={promo.buyItem} imageUrl={promo.buyImageUrl} />
          <div
            className="flex w-5 shrink-0 items-center justify-center text-stone-400"
            aria-hidden
          >
            →
          </div>
          <ItemBox name={promo.getItem} imageUrl={promo.getImageUrl} />
        </div>
      </a>

      <div className="relative flex items-center justify-between gap-3 border-t border-stone-100 px-5 py-3 text-sm dark:border-stone-800">
        <dl className="flex gap-3">
          <dt className="w-16 shrink-0 text-stone-400">発券期間</dt>
          <dd className="text-stone-600 dark:text-stone-300">{formatPurchasePeriod(promo)}</dd>
        </dl>
        <a
          href={storeMapsUrl(meta.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          コンビニを探す
        </a>
      </div>
    </div>
  );
}
