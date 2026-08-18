import iconv from "iconv-lite";
import jschardet from "jschardet";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchHtmlOnce(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.8",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // A site's declared charset (header or <meta>) frequently doesn't match what it
    // actually sends (e.g. migrated to UTF-8 but left an old Shift_JIS meta tag in
    // place), so it can't be trusted. jschardet inspects the actual byte statistics
    // instead of any label, which is what correctly distinguishes real Shift_JIS
    // content from UTF-8 content that merely LOOKS like valid UTF-8 by chance.
    const { encoding, confidence } = jschardet.detect(buffer);
    const detected = (encoding ?? "utf-8").toLowerCase();
    const html =
      confidence > 0.5 && detected !== "utf-8" && detected !== "ascii" && iconv.encodingExists(detected)
        ? iconv.decode(buffer, detected)
        : buffer.toString("utf-8");

    // A real campaign page is tens of KB; some sites' bot protection returns a "successful"
    // (HTTP 200) but near-empty response to requests it doesn't like, rather than an
    // honest error status — that must not be mistaken for "the page loaded but has no
    // promos right now" (an empty scrape result reads as a real state, not a fetch failure).
    if (html.trim().length < 1000) {
      throw new Error(`Response too short to be a real page (${html.trim().length} bytes) — possibly blocked`);
    }

    return html;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One retry after a short pause: a bot-check challenge page has shown up intermittently
// (not on every single request from the same client), so a single immediate failure isn't
// necessarily a real outage — worth trying again once before reporting a failure to the user.
export async function fetchHtml(url: string, timeoutMs = 10000): Promise<string> {
  try {
    return await fetchHtmlOnce(url, timeoutMs);
  } catch {
    await sleep(750);
    return fetchHtmlOnce(url, timeoutMs);
  }
}

// Every date this app deals with (発券期間 etc.) is a Japan-local calendar date, but the
// server (e.g. Vercel) runs in UTC — shifting by the fixed +9h JST offset before reading
// UTC-based date components gives the correct Japan-local date regardless of the server's
// own timezone (Japan doesn't observe DST, so this offset never changes). Callers must use
// the getUTC* accessors on the result, not the local ones, or the shift is meaningless.
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
export function nowInJst(): Date {
  return new Date(Date.now() + JST_OFFSET_MS);
}

const PRICE_RE = /([0-9０-９,，]+)\s*円/;

export function parsePrice(text: string): string | null {
  const m = text.match(PRICE_RE);
  if (!m) return null;
  return `${toHalfWidth(m[1])}円`;
}

// Matches things like "7月7日(火)〜7月13日(月)", "7/7〜7/13", "7月7日～7月13日", the
// official sites' full-width-parenthesis form "8月18日（火）～8月24日（月）", and the
// bare-weekday-plus-time form FamilyMart uses for its redeem period, "8/25火AM7:00〜8/31月".
const WEEKDAY = "(?:[(（]\\s*[月火水木金土日]\\s*[)）]|[月火水木金土日])?";
const TIME_SUFFIX = "(?:\\s*[AP]M\\d{1,2}:\\d{2})?";
const PERIOD_RE = new RegExp(
  `(\\d{1,2})\\s*[月/]\\s*(\\d{1,2})\\s*日?\\s*${WEEKDAY}${TIME_SUFFIX}` +
    `\\s*[〜~～\\-–]\\s*` +
    `(\\d{1,2})\\s*[月/]\\s*(\\d{1,2})\\s*日?\\s*${WEEKDAY}${TIME_SUFFIX}`,
  "g"
);

export interface DateRange {
  text: string;
  start: string; // ISO date
  end: string; // ISO date
}

function toIsoRange(sm: string, sd: string, em: string, ed: string, matchText: string): DateRange {
  const now = nowInJst();
  const startMonth = Number(sm);
  const endMonth = Number(em);
  let startYear = now.getUTCFullYear();
  // Heuristic: if the period appears to span a New Year (end month earlier than start month),
  // or the whole period is far in the past relative to now, roll the year forward.
  let endYear = endMonth < startMonth ? startYear + 1 : startYear;
  if (startMonth < now.getUTCMonth() + 1 - 6) {
    startYear += 1;
    endYear = endMonth < startMonth ? startYear + 1 : startYear;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    text: matchText,
    start: `${startYear}-${pad(startMonth)}-${pad(Number(sd))}`,
    end: `${endYear}-${pad(endMonth)}-${pad(Number(ed))}`,
  };
}

// Finds every date-range in the text (a page commonly states both a 購入/発券期間 and a
// separate, later 引換期間). Order in the source text is assumed to be purchase period
// first, redeem period second — true for every source this app currently scrapes.
export function parseAllPeriods(text: string): DateRange[] {
  const ranges: DateRange[] = [];
  for (const m of text.matchAll(PERIOD_RE)) {
    const [full, sm, sd, em, ed] = m;
    ranges.push(toIsoRange(sm, sd, em, ed, full));
  }
  return ranges;
}

export function parsePeriod(text: string): {
  periodText: string | null;
  purchaseStart: string | null;
  purchaseEnd: string | null;
  redeemStart: string | null;
  redeemEnd: string | null;
} {
  const ranges = parseAllPeriods(text);
  if (ranges.length === 0) {
    return { periodText: null, purchaseStart: null, purchaseEnd: null, redeemStart: null, redeemEnd: null };
  }

  const [purchase, redeem] = ranges;
  const periodText = redeem ? `${purchase.text} / ${redeem.text}` : purchase.text;

  return {
    periodText,
    purchaseStart: purchase.start,
    purchaseEnd: purchase.end,
    redeemStart: redeem ? redeem.start : null,
    redeemEnd: redeem ? redeem.end : null,
  };
}

function toHalfWidth(s: string): string {
  return s.replace(/[０-９，]/g, (ch) => {
    if (ch === "，") return ",";
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

export function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function dedupePromos<T extends { buyItem: string; getItem: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = `${item.buyItem}__${item.getItem}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
