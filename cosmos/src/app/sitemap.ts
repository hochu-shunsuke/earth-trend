import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GEO_LABELS } from "@/lib/trends";
import { LOCALES } from "@/lib/i18n";

type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"];

// 各ページを全ロケール分出力し、hreflang(言語別alternates)とlastModifiedを付ける。
// = Googleに「ja/enは同一ページの言語違い」と明示し、国際SEOを正しくする。
export default function sitemap(): MetadataRoute.Sitemap {
  const geos = Object.keys(GEO_LABELS).map((g) => g.toLowerCase());
  const now = new Date();

  // ある相対パスの言語別URL一覧(hreflang alternatesとして各エントリに付与)
  const languages = (suffix: string): Record<string, string> =>
    Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${suffix}`]));

  const pages = (suffix: string, changeFrequency: ChangeFreq, priority: number) =>
    LOCALES.map((lang) => ({
      url: `${SITE_URL}/${lang}${suffix}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: languages(suffix) },
    }));

  // ホームは ルート(/) を x-default ハブにしたクラスタ(/・/ja・/en)
  const homeLanguages = { ja: `${SITE_URL}/ja`, en: `${SITE_URL}/en`, "x-default": SITE_URL };
  const home = [SITE_URL, `${SITE_URL}/ja`, `${SITE_URL}/en`].map((url) => ({
    url,
    lastModified: now,
    changeFrequency: "hourly" as ChangeFreq,
    priority: 1,
    alternates: { languages: homeLanguages },
  }));

  return [
    ...home,
    ...pages("/trends", "hourly", 0.9),
    ...geos.flatMap((g) => pages(`/${g}`, "hourly", 0.8)),
    ...pages("/quest", "weekly", 0.6),
    ...pages("/analysis", "hourly", 0.6),
    ...pages("/globe", "hourly", 0.6),
    ...pages("/about", "monthly", 0.3),
  ];
}
