import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, toLocale } from "@/lib/i18n";

// 全ページをロケール(/ja, /en)配下に。両ロケールを静的生成
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// OGのロケールを言語連動に(og:title/descは各ページのtitle/descから自動生成済み)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).lang);
  return {
    openGraph: {
      locale: locale === "ja" ? "ja_JP" : "en_US",
      alternateLocale: locale === "ja" ? "en_US" : "ja_JP",
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
