import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { cleanText } from "@/lib/scrapers/util";

// Diagnostic-only endpoint: fetches an allowlisted page and reports which repeating
// tag+class combos it contains, so scraper selectors can be tuned without needing raw
// HTML access from wherever this is being debugged from. Also useful for spotting
// environment-specific fetch failures (e.g. a site returning HTTP 200 with an empty body
// to one deployment's outbound IP but not another) — see git history around 2026-08-18 for
// a real instance of this on Vercel against sej.co.jp.
const ALLOWED_HOSTS = ["www.sej.co.jp", "www.family.co.jp", "www.lawson.co.jp", "kojinabi.com"];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Blog comment threads and nav/sidebar widgets repeat far more than the actual article
// content and drown out the real signal, so they're excluded from the structural scan.
const NOISE_RE = /comment|visitor|sidebar|side-menu|menu-item|adsbygoogle|author-icon/i;

// Common wrappers for the actual article/content body.
const CONTENT_SELECTORS = [".entry-content", ".post-content", ".article-body", ".main-body", "article"];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url query param required" }, { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(hostname)) {
    return NextResponse.json({ error: `host not allowlisted: ${hostname}` }, { status: 403 });
  }

  // Deliberately not using lib/scrapers/util's fetchHtml here — it throws on a non-2xx
  // status or a suspiciously short body, which is exactly the failure mode this endpoint
  // exists to inspect. A raw fetch lets a "successful but empty" response show up as data
  // (status, byte count, raw snippet) instead of just an opaque 500.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  let bodyText: string;
  try {
    res = await fetch(url, {
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
    bodyText = await res.text();
  } catch (err) {
    return NextResponse.json(
      { url, fetchError: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }

  const html = bodyText;
  const $ = cheerio.load(html);

  const counts: Record<string, number> = {};
  $("[class]").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName ?? "?";
    const cls = $(el).attr("class");
    if (!cls || NOISE_RE.test(cls)) return;
    const key = `${tag}.${cls.trim().split(/\s+/).join(".")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  });

  const repeatingSelectors = Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([selector, count]) => ({ selector, count }));

  // Try each candidate content container and report the first one that has real text,
  // along with its direct-child tag+class breakdown (the likely repeating "item" shape)
  // and the headings found only inside it (comment/sidebar headings excluded by construction).
  let contentSelectorUsed: string | null = null;
  let contentText = "";
  let contentHeadings: string[] = [];
  let directChildShapes: { selector: string; count: number }[] = [];

  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector).first();
    const text = cleanText(el.text());
    if (text.length > 200) {
      contentSelectorUsed = selector;
      contentText = text.slice(0, 3000);
      contentHeadings = el
        .find("h1, h2, h3, h4, strong")
        .map((_, h) => cleanText($(h).text()))
        .get()
        .filter(Boolean)
        .slice(0, 60);

      const childCounts: Record<string, number> = {};
      el.find("*").each((_, child) => {
        const tag = (child as { tagName?: string }).tagName ?? "?";
        const cls = $(child).attr("class");
        const key = cls ? `${tag}.${cls.trim().split(/\s+/).join(".")}` : tag;
        childCounts[key] = (childCounts[key] ?? 0) + 1;
      });
      directChildShapes = Object.entries(childCounts)
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([selector, count]) => ({ selector, count }));
      break;
    }
  }

  return NextResponse.json({
    url,
    httpStatus: res.status,
    responseBytes: Buffer.byteLength(html),
    rawSnippet: html.slice(0, 500),
    title: cleanText($("title").text()),
    contentSelectorUsed,
    contentHeadings,
    directChildShapes,
    contentTextSample: contentText,
    repeatingSelectors,
  });
}
