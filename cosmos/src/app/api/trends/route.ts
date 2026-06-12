import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export interface TrendItem {
  word: string;
  traffic: string;
  picture?: string;
  news: { title: string; url?: string; source?: string }[];
}

const ALLOWED_GEO = new Set(["JP", "US", "GB", "IN", "KR", "TW", "DE", "FR", "BR"]);

export async function GET(req: NextRequest) {
  const geo = req.nextUrl.searchParams.get("geo")?.toUpperCase() ?? "JP";
  if (!ALLOWED_GEO.has(geo)) {
    return NextResponse.json({ error: "unsupported geo" }, { status: 400 });
  }

  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    // 10分キャッシュ: 全ユーザーで共有され、上流には礼儀正しく
    next: { revalidate: 600 },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; cosmos-mvp)" },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);
  const rawItems = doc?.rss?.channel?.item ?? [];
  const itemsArr = Array.isArray(rawItems) ? rawItems : [rawItems];

  const items: TrendItem[] = itemsArr.map((it: Record<string, unknown>) => {
    const newsRaw = it["ht:news_item"] ?? [];
    const newsArr = Array.isArray(newsRaw) ? newsRaw : [newsRaw];
    return {
      word: String(it.title ?? ""),
      traffic: String(it["ht:approx_traffic"] ?? ""),
      picture: it["ht:picture"] ? String(it["ht:picture"]) : undefined,
      news: newsArr
        .filter(Boolean)
        .map((n: Record<string, unknown>) => ({
          title: String(n["ht:news_item_title"] ?? ""),
          url: n["ht:news_item_url"] ? String(n["ht:news_item_url"]) : undefined,
          source: n["ht:news_item_source"]
            ? String(n["ht:news_item_source"])
            : undefined,
        })),
    };
  });

  return NextResponse.json(
    { geo, items },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
  );
}
