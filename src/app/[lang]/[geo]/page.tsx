import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CountryExperience from "@/components/CountryExperience";
import { ALLOWED_GEO, GEO_LABELS, geoSlug, slugToGeo } from "@/lib/trends";
import { toLocale, t, countryPath, countryAltLanguages, COUNTRY_LABELS } from "@/lib/i18n";

// snapshot完了時のタグ失効が主経路。1時間はcron停止時の安全網。
export const revalidate = 3600;

// 全対象国を静的生成(SEO: 各国×各ロケールが独立したインデックス可能ランディング)
export function generateStaticParams() {
  return Object.keys(GEO_LABELS).map((g) => ({ geo: geoSlug(g) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; geo: string }>;
}): Promise<Metadata> {
  const { lang, geo } = await params;
  const locale = toLocale(lang);
  const code = slugToGeo(geo);
  const country = COUNTRY_LABELS[locale][code];
  if (!country) return {};
  const d = t(locale);
  return {
    title: d.country.title(country),
    description: d.country.seoHeading(country),
    alternates: {
      canonical: countryPath(locale, code),
      languages: countryAltLanguages(code),
    },
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ lang: string; geo: string }>;
}) {
  const { lang, geo } = await params;
  const locale = toLocale(lang);
  const code = slugToGeo(geo);
  // 正準スラグ以外(例: /es/es や未対応geo)は弾く=重複URL/無効を防ぐ
  if (!ALLOWED_GEO.has(code) || geo !== geoSlug(code)) notFound();
  return <CountryExperience locale={locale} code={code} />;
}
