import type { Metadata } from "next";
import Gallery from "@/components/Gallery";
import { toLocale, t, localePath, altLanguages } from "@/lib/i18n";

// snapshot完了時のタグ失効が主経路。1時間はcron停止時の安全網。
export const revalidate = 3600;

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
}: {
  params: Promise<{ lang: string }>;
}) {
  const locale = toLocale((await params).lang);
  return <Gallery locale={locale} />;
}
