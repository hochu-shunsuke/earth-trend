import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/lib/i18n";

// 全ページをロケール(/ja, /en)配下に。両ロケールを静的生成
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
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
