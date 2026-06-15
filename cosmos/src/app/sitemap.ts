import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GEO_LABELS } from "@/lib/trends";

type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"];

// prefix-except-default: ja(デフォルト)=接頭辞なし / en=/en 接頭辞。
// 各ページを両ロケール分出力し、hreflang(言語別alternates)とlastModifiedを付ける。
const jaUrl = (suffix: string) => `${SITE_URL}${suffix}`; // "" → ルート(bare domain)
const enUrl = (suffix: string) => `${SITE_URL}/en${suffix}`;

export default function sitemap(): MetadataRoute.Sitemap {
  const geos = Object.keys(GEO_LABELS).map((g) => g.toLowerCase());
  const now = new Date();

  // x-default は英語(海外の非マッチユーザーへのフォールバック)
  const languages = (suffix: string): Record<string, string> => ({
    ja: jaUrl(suffix),
    en: enUrl(suffix),
    "x-default": enUrl(suffix),
  });

  const pages = (suffix: string, changeFrequency: ChangeFreq, priority: number) =>
    [jaUrl(suffix), enUrl(suffix)].map((url) => ({
      url,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: languages(suffix) },
    }));

  return [
    ...pages("", "hourly", 1), // ホーム(ランディング)。ja=bare domain
    ...pages("/trends", "hourly", 0.9),
    ...geos.flatMap((g) => pages(`/${g}`, "hourly", 0.8)),
    ...pages("/analysis", "hourly", 0.6),
    ...pages("/globe", "hourly", 0.6),
    ...pages("/about", "monthly", 0.3),
  ];
}
