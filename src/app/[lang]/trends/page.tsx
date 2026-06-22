import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Gallery from "@/components/Gallery";
import { ALLOWED_GEO, geoSlug } from "@/lib/trends";
import { toLocale, t, localePath, altLanguages } from "@/lib/i18n";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).lang);
  const d = t(locale);
  return {
    title: d.home.title,
    description: d.home.desc,
    alternates: {
      canonical: localePath(locale, "/trends"),
      languages: altLanguages("/trends"),
    },
  };
}

// トレンド = 各国の「注意の地図」一覧。描画は共有Galleryに集約。
export default async function TrendsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ geo?: string }>;
}) {
  const locale = toLocale((await params).lang);

  // /trends?geo=XX リンクは各国ルートへ転送(SEO/互換)
  const { geo } = await searchParams;
  if (geo && ALLOWED_GEO.has(geo.toUpperCase()))
    redirect(localePath(locale, `/${geoSlug(geo.toUpperCase())}`));

  return <Gallery locale={locale} />;
}
