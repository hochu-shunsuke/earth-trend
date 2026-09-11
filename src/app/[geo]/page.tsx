import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CountryExperience from "@/components/CountryExperience";
import { ALLOWED_GEO, GEO_LABELS, geoSlug, slugToGeo } from "@/lib/trends";
import { COPY, COUNTRY_LABELS, countryPath } from "@/lib/copy";

// snapshot完了時のタグ失効が主経路。1時間はcron停止時の安全網。
export const revalidate = 3600;

// 全対象国を静的生成(SEO: 各国が独立したインデックス可能ランディング)
export function generateStaticParams() {
  return Object.keys(GEO_LABELS).map((g) => ({ geo: geoSlug(g) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ geo: string }>;
}): Promise<Metadata> {
  const code = slugToGeo((await params).geo);
  const country = COUNTRY_LABELS[code];
  if (!country) return {};
  return {
    title: COPY.country.title(country),
    description: COPY.country.seoHeading(country),
    alternates: { canonical: countryPath(code) },
  };
}

export default async function CountryPage({ params }: { params: Promise<{ geo: string }> }) {
  const { geo } = await params;
  const code = slugToGeo(geo);
  // 正準スラグ以外(例: 未対応geo)は弾く=重複URL/無効を防ぐ
  if (!ALLOWED_GEO.has(code) || geo !== geoSlug(code)) notFound();
  return <CountryExperience code={code} />;
}
