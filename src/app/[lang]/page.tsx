import type { Metadata } from "next";
import CountryExperience from "@/components/CountryExperience";
import { toLocale, t, localePath, altLanguages, DEFAULT_GEO, COUNTRY_LABELS } from "@/lib/i18n";

// snapshot完了時のタグ失効が主経路。1時間はcron停止時の安全網。
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).lang);
  const d = t(locale);
  const country = COUNTRY_LABELS[locale][DEFAULT_GEO];
  return {
    title: d.country.title(country),
    description: d.country.seoHeading(country),
    alternates: {
      canonical: localePath(locale), // ja="/" / en="/en"
      languages: altLanguages(),
    },
  };
}

// 言語別ホーム = 日本のライブトレンド。説明を挟まずサイトの主機能から始める。
export default async function LangHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const locale = toLocale((await params).lang);
  return <CountryExperience locale={locale} code={DEFAULT_GEO} />;
}
