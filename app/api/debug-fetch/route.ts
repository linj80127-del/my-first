import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, cleanText } from "@/lib/scrapers/util";

// Diagnostic-only endpoint: fetches an allowlisted page and reports which repeating
// tag+class combos it contains, so scraper selectors can be tuned without needing raw
// HTML access from the development sandbox (which cannot reach these sites directly).
const ALLOWED_HOSTS = [
  "kojinabi.com",
  "superprofitnews.main.jp",
  "www.sej.co.jp",
  "www.family.co.jp",
  "www.lawson.co.jp",
  "money-hensachi.com",
  "puchipurabu.com",
];

// Blog comment threads and nav/sidebar widgets repeat far more than the actual article
// content and drown out the real signal, so they're excluded from the structural scan.
const NOISE_RE = /comment|visitor|sidebar|side-menu|menu-item|adsbygoogle|author-icon/i;

// Common wrappers for the actual article body across WordPress-style blogs.
const CONTENT_SELECTORS = [
  ".entry-content",
  ".post-content",
  ".article-body",
  ".main-body",
  "article",
];

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

  const html = await fetchHtml(url);
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
    title: cleanText($("title").text()),
    contentSelectorUsed,
    contentHeadings,
    directChildShapes,
    contentTextSample: contentText,
    repeatingSelectors,
  });
}
