import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Gallery from "@/components/Gallery";
import { ALLOWED_GEO } from "@/lib/trends";
import { toLocale, t } from "@/lib/i18n";

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
      canonical: `/${locale}`,
      // ホームの x-default はブランドのルート(/)。ja/en は各言語版
      languages: { ja: "/ja", en: "/en", "x-default": "/" },
    },
  };
}

// ホーム = 各国の「注意の地図」一覧(/ja, /en)。描画は共有Galleryに集約。
export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ geo?: string }>;
}) {
  const locale = toLocale((await params).lang);

  // 旧 /?geo=XX リンクは各国ルートへ転送(SEO/互換)
  const { geo } = await searchParams;
  if (geo && ALLOWED_GEO.has(geo.toUpperCase())) redirect(`/${locale}/${geo.toLowerCase()}`);

  return <Gallery locale={locale} />;
}
