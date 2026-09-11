import { GEO_LANG, type NewsItem } from "@/lib/trends";
import { getWorld, pickTr, type WorldItem } from "@/lib/world";
import { type Locale } from "@/lib/i18n";

export interface TranslatedNews extends NewsItem {
  translation?: string;
}
export interface TranslatedItem {
  word: string;
  traffic: string;
  news: TranslatedNews[];
  firstSeen?: number;
  lastSeen?: number;
  translation?: string;
}

// world:v1 の tr は全ロケール分を持つので、表示するロケールの訳だけを取り出して渡す
// (そのまま渡すとクライアントへ送るペイロードが3倍になる)。
function forLocale(it: WorldItem, locale: Locale, translate: boolean): TranslatedItem {
  return {
    word: it.word,
    traffic: it.traffic,
    firstSeen: it.firstSeen,
    lastSeen: it.lastSeen,
    translation: translate ? pickTr(it.tr, locale) : undefined,
    news: it.news.map((n) => ({
      title: n.title,
      url: n.url,
      source: n.source,
      translation: translate ? pickTr(n.tr, locale) : undefined,
    })),
  };
}

/**
 * 国別ページ用。訳は cron が world:v1 に焼き込み済みなので、ここでは取り出すだけ
 * (以前は語ごとにUpstashへ個別GETしていた=24国×3ロケールで1周期あたり約930往復)。
 * 見出しの訳も渡すので、クライアントからの /api/translate はほぼ不要になる。
 */
export async function getCountryItems(code: string, locale: Locale): Promise<TranslatedItem[]> {
  const world = await getWorld();
  const items = world.geos[code] ?? [];
  const translate = (GEO_LANG[code] ?? "auto") !== locale;
  return items.map((it) => forLocale(it, locale, translate));
}
