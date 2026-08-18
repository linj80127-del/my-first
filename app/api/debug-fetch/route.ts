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
    if (!cls) return;
    const key = `${tag}.${cls.trim().split(/\s+/).join(".")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  });

  const repeatingSelectors = Object.entries(counts)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([selector, count]) => ({ selector, count }));

  const headings = $("h1, h2, h3, h4")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)
    .slice(0, 60);

  return NextResponse.json({
    url,
    title: cleanText($("title").text()),
    repeatingSelectors,
    headings,
    bodyTextSample: cleanText($("body").text()).slice(0, 4000),
  });
}
