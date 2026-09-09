import { unstable_cache } from "next/cache";
import { GEO_LABELS } from "@/lib/trends";
import { fetchTrendsUnioned, type RecentTrendItem } from "@/lib/history";
import { TRENDS_DATA_CACHE_TAG } from "@/lib/cache-tags";

// 9国分のデータを10分キャッシュ(訪問あたりのUpstashコストをほぼゼロに)。
// 一覧(Gallery)とトップ(LandingPageのマーキー)で同一キャッシュを共有する。
export const getGalleryData = unstable_cache(
  async (): Promise<[string, RecentTrendItem[]][]> =>
    Promise.all(
      Object.keys(GEO_LABELS).map(
        async (g) => [g, await fetchTrendsUnioned(g)] as [string, RecentTrendItem[]],
      ),
    ),
  // v3で旧キャッシュを切り離す。以後はsnapshot完了時のタグ失効で先回りして更新する。
  ["gallery-data-v3"],
  { revalidate: 600, tags: [TRENDS_DATA_CACHE_TAG] },
);
