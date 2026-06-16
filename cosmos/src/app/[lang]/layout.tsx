import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, toLocale, type Locale } from "@/lib/i18n";

// 全ロケール(/ja, /en, /es)を静的生成
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

const OG_LOCALE: Record<Locale, string> = { ja: "ja_JP", en: "en_US", es: "es_ES" };

// OGのロケールを言語連動に(og:title/descは各ページのtitle/descから自動生成済み)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).lang);
  return {
    openGraph: {
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <>{children}</>;
}
