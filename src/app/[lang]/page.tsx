import { redirect } from "next/navigation";
import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
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
      canonical: localePath(locale), // ja="/" / en="/en"
      languages: altLanguages(),
    },
  };
}

// 言語別ホーム = ランディング(各ビューを説明する入口)。ルート(/) と同一内容の言語版。
export default async function LangHome({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ geo?: string }>;
}) {
  const locale = toLocale((await params).lang);

  // 旧ホームが一覧だった頃の ?geo=XX リンクは各国ルートへ転送(SEO/互換)
  const { geo } = await searchParams;
  if (geo && ALLOWED_GEO.has(geo.toUpperCase()))
    redirect(localePath(locale, `/${geoSlug(geo.toUpperCase())}`));

  return <LandingPage locale={locale} />;
}
