import type { Metadata } from "next";
import { headers } from "next/headers";
import LandingPage from "@/components/LandingPage";
import { localeFromAcceptLanguage, t } from "@/lib/i18n";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = localeFromAcceptLanguage((await headers()).get("accept-language"));
  const d = t(locale);
  return {
    title: d.home.title,
    description: d.home.desc,
    alternates: {
      canonical: "/",
      // ルート(/)を自己canonicalな x-default に。ja/en は各言語版
      languages: { ja: "/ja", en: "/en", "x-default": "/" },
    },
    openGraph: { locale: locale === "ja" ? "ja_JP" : "en_US" },
  };
}

// ブランドのルート earth-trend.com 自体を「本物のトップ(HP)」にする(リダイレクトしない)。
// 各ビューを説明も兼ねて見せる入口ページ。表示言語はAccept-Languageで決定。
export default async function RootPage() {
  const locale = localeFromAcceptLanguage((await headers()).get("accept-language"));
  return <LandingPage locale={locale} />;
}
