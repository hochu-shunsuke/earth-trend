import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  title: string;
  url?: string;
  source?: string;
}

export interface TrendItem {
  word: string;
  traffic: string;
  picture?: string;
  news: NewsItem[];
}

export const ALLOWED_GEO = new Set([
  "JP",
  "US",
  "GB",
  "IN",
  "KR",
  "TW",
  "DE",
  "FR",
  "BR",
]);

/** Google TrendsのRSSから急上昇ワードを取得(Next fetchキャッシュ10分) */
export async function fetchTrends(geo: string): Promise<TrendItem[]> {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    next: { revalidate: 600 },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; earth-trend)" },
  });
  if (!res.ok) throw new Error(`trends upstream ${res.status}`);

  const doc = new XMLParser({ ignoreAttributes: false }).parse(await res.text());
  const raw = doc?.rss?.channel?.item ?? [];
  const items = Array.isArray(raw) ? raw : [raw];

  return items.map((it: Record<string, unknown>) => {
    const newsRaw = it["ht:news_item"] ?? [];
    const newsArr = Array.isArray(newsRaw) ? newsRaw : [newsRaw];
    return {
      word: String(it.title ?? ""),
      traffic: String(it["ht:approx_traffic"] ?? ""),
      picture: it["ht:picture"] ? String(it["ht:picture"]) : undefined,
      news: newsArr.filter(Boolean).map((n: Record<string, unknown>) => ({
        title: String(n["ht:news_item_title"] ?? ""),
        url: n["ht:news_item_url"] ? String(n["ht:news_item_url"]) : undefined,
        source: n["ht:news_item_source"]
          ? String(n["ht:news_item_source"])
          : undefined,
      })),
    };
  });
}
