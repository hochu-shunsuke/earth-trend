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
  firstSeen?: number; // RSSのpubDate(燃え始め, unix秒)。スナップ未蓄積でフォールバック時もこれで「登場」を出す
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
  // 英語クラスタ(en既存=今すぐネイティブ)
  "CA",
  "AU",
  "PH",
  "NG",
  "ZA",
  // スペイン語クラスタ(将来 es UI 追加で一気にネイティブ化)
  "MX",
  "ES",
  "AR",
  "CO",
  // 個別大国(当面ja/enへ翻訳。検索量/地球儀カバレッジ)
  "ID",
  "RU",
  "TR",
  "VN",
  "TH",
  "IT",
]);

export const GEO_LABELS: Record<string, string> = {
  JP: "日本",
  US: "アメリカ",
  GB: "イギリス",
  IN: "インド",
  KR: "韓国",
  TW: "台湾",
  DE: "ドイツ",
  FR: "フランス",
  BR: "ブラジル",
  CA: "カナダ",
  AU: "オーストラリア",
  PH: "フィリピン",
  NG: "ナイジェリア",
  ZA: "南アフリカ",
  MX: "メキシコ",
  ES: "スペイン",
  AR: "アルゼンチン",
  CO: "コロンビア",
  ID: "インドネシア",
  RU: "ロシア",
  TR: "トルコ",
  VN: "ベトナム",
  TH: "タイ",
  IT: "イタリア",
};

/** 翻訳の原文言語(その国の主要言語)。MyMemory等のlangpairに使う */
export const GEO_LANG: Record<string, string> = {
  JP: "ja",
  US: "en",
  GB: "en",
  IN: "en",
  KR: "ko",
  TW: "zh-TW",
  DE: "de",
  FR: "fr",
  BR: "pt-BR",
  CA: "en",
  AU: "en",
  PH: "en",
  NG: "en",
  ZA: "en",
  MX: "es",
  ES: "es",
  AR: "es",
  CO: "es",
  ID: "id",
  RU: "ru",
  TR: "tr",
  VN: "vi",
  TH: "th",
  IT: "it",
};

/** サジェストAPIに渡す言語(国の主要言語) */
export const GEO_HL: Record<string, string> = {
  JP: "ja",
  US: "en",
  GB: "en",
  IN: "en",
  KR: "ko",
  TW: "zh-TW",
  DE: "de",
  FR: "fr",
  BR: "pt-BR",
  CA: "en",
  AU: "en",
  PH: "en",
  NG: "en",
  ZA: "en",
  MX: "es",
  ES: "es",
  AR: "es",
  CO: "es",
  ID: "id",
  RU: "ru",
  TR: "tr",
  VN: "vi",
  TH: "th",
  IT: "it",
};

// 国コード ↔ URLスラグ。スペイン(ES)はロケール接頭辞 /es と衝突するためURLスラグは "spain"。
// 他の国はコードの小文字がそのままスラグ(jp, us, …)。
const GEO_SLUG: Record<string, string> = { ES: "spain" };
const SLUG_GEO: Record<string, string> = { spain: "ES" };
export function geoSlug(geo: string): string {
  return GEO_SLUG[geo] ?? geo.toLowerCase();
}
export function slugToGeo(slug: string): string {
  return SLUG_GEO[slug.toLowerCase()] ?? slug.toUpperCase();
}

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
    const pubMs = it.pubDate ? Date.parse(String(it.pubDate)) : NaN;
    return {
      word: String(it.title ?? ""),
      traffic: String(it["ht:approx_traffic"] ?? ""),
      firstSeen: Number.isFinite(pubMs) ? Math.floor(pubMs / 1000) : undefined,
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
