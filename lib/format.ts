const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// Parsed as local calendar-date components (not `new Date(iso)`, which reads the string as
// UTC midnight and can shift a day off depending on the viewer's timezone) since these ISO
// strings represent a JST calendar date with no time component.
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}/${d}(${WEEKDAYS[date.getDay()]})`;
}

// Only the 発券/購入期間 (the window during which buying the item gets you the free-item
// voucher) — not the later 引換期間 for actually redeeming it, which is a separate concern
// shown elsewhere and would just clutter this card.
export function formatPurchasePeriod(promo: {
  purchaseStart: string | null;
  purchaseEnd: string | null;
  periodText: string | null;
}): string {
  if (!promo.purchaseStart) return promo.periodText ?? "公式サイトで確認";
  const start = formatDate(promo.purchaseStart);
  if (!promo.purchaseEnd || promo.purchaseEnd === promo.purchaseStart) return start;
  return `${start}〜${formatDate(promo.purchaseEnd)}`;
}
