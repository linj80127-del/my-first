const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Normalizes the charset names sites declare (e.g. "Shift-JIS", "x-sjis") to a WHATWG
// encoding label TextDecoder recognizes. Many older Japanese sites still serve Shift_JIS
// or EUC-JP, and decoding those as UTF-8 (fetch's default via res.text()) silently mangles
// every non-ASCII character instead of throwing, so this has to be checked explicitly.
function normalizeCharset(charset: string): string {
  const c = charset.trim().toLowerCase();
  if (/^shift[-_]?jis$/.test(c) || c === "x-sjis" || c === "sjis") return "shift_jis";
  if (/^euc[-_]?jp$/.test(c)) return "euc-jp";
  return c;
}

export async function fetchHtml(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "ja,en;q=0.8",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "";
    let charset = contentType.match(/charset=([^;]+)/i)?.[1];
    if (!charset) {
      // Scan just the head for a <meta charset> declaration, decoded as latin1 so every
      // byte maps 1:1 to a char code — safe for reading pure-ASCII markup regardless of
      // the real encoding, without needing to know that encoding yet.
      const head = Buffer.from(buffer.slice(0, 4096)).toString("latin1");
      charset = head.match(/charset=["']?([\w-]+)/i)?.[1];
    }

    try {
      return new TextDecoder(normalizeCharset(charset ?? "utf-8")).decode(buffer);
    } catch {
      return new TextDecoder("utf-8").decode(buffer);
    }
  } finally {
    clearTimeout(timer);
  }
}

const PRICE_RE = /([0-9０-９,，]+)\s*円/;

export function parsePrice(text: string): string | null {
  const m = text.match(PRICE_RE);
  if (!m) return null;
  return `${toHalfWidth(m[1])}円`;
}

// Matches things like "7月7日(火)〜7月13日(月)" or "7/7〜7/13" or "7月7日～7月13日"
const PERIOD_RE =
  /(\d{1,2})\s*[月\/]\s*(\d{1,2})\s*日?(?:\([^)]+\))?\s*[〜~～\-–]\s*(\d{1,2})\s*[月\/]\s*(\d{1,2})\s*日?(?:\([^)]+\))?/;

export function parsePeriod(text: string): {
  periodText: string | null;
  periodStart: string | null;
  periodEnd: string | null;
} {
  const m = text.match(PERIOD_RE);
  if (!m) return { periodText: null, periodStart: null, periodEnd: null };

  const [, sm, sd, em, ed] = m;
  const now = new Date();
  const startMonth = Number(sm);
  const endMonth = Number(em);
  let startYear = now.getFullYear();
  // Heuristic: if the period appears to span a New Year (end month earlier than start month),
  // or the whole period is far in the past relative to now, roll the year forward.
  let endYear = endMonth < startMonth ? startYear + 1 : startYear;
  if (startMonth < now.getMonth() + 1 - 6) {
    startYear += 1;
    endYear = endMonth < startMonth ? startYear + 1 : startYear;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const periodStart = `${startYear}-${pad(startMonth)}-${pad(Number(sd))}`;
  const periodEnd = `${endYear}-${pad(endMonth)}-${pad(Number(ed))}`;

  return { periodText: m[0], periodStart, periodEnd };
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
