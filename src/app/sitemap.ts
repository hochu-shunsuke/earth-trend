import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GEO_LABELS, geoSlug } from "@/lib/trends";

// 英語1本なので hreflang は無い。lastModified は「本文が実際に変わる頻度」に合わせる。
// Googleは lastmod を有意な変更時刻と一致する場合のみ使い、priority/changefreq は無視する。
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${SITE_URL}${path}`;

  // トレンド系はスナップショット境界(30分)で中身が変わる。その直近の境界を申告する。
  const half = 30 * 60 * 1000;
  const lastTrendUpdate = new Date(Math.floor(Date.now() / half) * half);
  // 静的ページは中身が変わらないので、申告しない(誤ったlastmodを出すより省く)
  const staticPages = ["/about", "/analysis", "/globe"];

  return [
    { url: url("/"), lastModified: lastTrendUpdate, changeFrequency: "hourly" },
    ...Object.keys(GEO_LABELS).map((geo) => ({
      url: url(`/${geoSlug(geo)}`),
      lastModified: lastTrendUpdate,
      changeFrequency: "hourly" as const,
    })),
    ...staticPages.map((path) => ({ url: url(path) })),
  ];
}
