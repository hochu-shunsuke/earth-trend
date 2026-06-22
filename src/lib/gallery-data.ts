import { unstable_cache } from "next/cache";
import { GEO_LABELS } from "@/lib/trends";
import { fetchTrendsUnioned, type RecentTrendItem } from "@/lib/history";

// 9国分のデータを10分キャッシュ(訪問あたりのUpstashコストをほぼゼロに)。
// 一覧(Gallery)とトップ(LandingPageのマーキー)で同一キャッシュを共有する。
export const getGalleryData = unstable_cache(
  async (): Promise<[string, RecentTrendItem[]][]> =>
    Promise.all(
      Object.keys(GEO_LABELS).map(
        async (g) => [g, await fetchTrendsUnioned(g)] as [string, RecentTrendItem[]],
      ),
    ),
  ["gallery-data-v2"],
  { revalidate: 600 },
);
