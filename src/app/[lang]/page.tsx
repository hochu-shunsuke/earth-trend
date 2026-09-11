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
      canonical: localePath(locale), // ja="/" / en="/en"
      languages: altLanguages(),
    },
  };
}

// 言語別ホーム = 各国のトレンドを見渡す世界一覧。国を選ぶと固有URLへ潜る。
export default async function LangHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const locale = toLocale((await params).lang);
  return <Gallery locale={locale} />;
}
