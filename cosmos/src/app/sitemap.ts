import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GEO_LABELS } from "@/lib/trends";
import { LOCALES, localePath, type Locale } from "@/lib/i18n";

type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"];

// prefix-except-default: ja(デフォルト)=接頭辞なし / 他=/en /es 接頭辞。
// 各ページを全ロケール分出力し、hreflang(言語別alternates)とlastModifiedを付ける。
const fullUrl = (suffix: string, locale: Locale) => {
  const p = localePath(locale, suffix); // ja: "/" or "/trends" / en: "/en/trends" …
  return `${SITE_URL}${p}`;
};

export default function sitemap(): MetadataRoute.Sitemap {
  const geos = Object.keys(GEO_LABELS).map((g) => g.toLowerCase());
  const now = new Date();

  // x-default は英語(海外の非マッチユーザーへのフォールバック)
  const languages = (suffix: string): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const l of LOCALES) out[l] = fullUrl(suffix, l);
    out["x-default"] = fullUrl(suffix, "en");
    return out;
  };

  const pages = (suffix: string, changeFrequency: ChangeFreq, priority: number) =>
    LOCALES.map((l) => ({
      url: fullUrl(suffix, l),
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
