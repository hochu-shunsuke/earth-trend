import { unstable_cache } from "next/cache";
import { GEO_LANG } from "@/lib/trends";
import { type RecentTrendItem } from "@/lib/history";
import { getGalleryData } from "@/lib/gallery-data";
import { translate } from "@/lib/translate";
import { TRENDS_TRANSLATED_CACHE_TAG } from "@/lib/cache-tags";
import { type Locale } from "@/lib/i18n";

export type TranslatedItem = RecentTrendItem & { translation?: string };

// 国別ページとホームで共有する単一キャッシュ。snapshot完了時のタグ失効が主経路で、
// 1時間のrevalidateはcron停止時の安全網。
export const getCountryItems = unstable_cache(
  async (code: string, locale: Locale): Promise<TranslatedItem[]> => {
    const all = await getGalleryData();
    const raw = all.find(([geo]) => geo === code)?.[1] ?? [];
    const src = GEO_LANG[code] ?? "auto";
    if (src === locale) return raw;
    return Promise.all(
      raw.map(async (item) => ({
        ...item,
        // 温め済みの訳だけを使い、同時アクセスで翻訳元へ負荷を掛けない。
        translation: (await translate(item.word, src, locale, true)) ?? undefined,
      })),
    );
  },
  ["country-items-v5"],
  { revalidate: 3600, tags: [TRENDS_TRANSLATED_CACHE_TAG] },
);
