import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
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

// 言語別ホーム = ランディング(各ビューを説明する入口)。ルート(/) と同一内容の言語版。
export default async function LangHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const locale = toLocale((await params).lang);
  return <LandingPage locale={locale} />;
}
