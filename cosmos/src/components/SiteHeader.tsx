"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { LOCALES, DEFAULT_LOCALE, isLocale, t } from "@/lib/i18n";

export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const parts = pathname.split("/").filter(Boolean); // [locale, section?, ...]
  const locale = isLocale(parts[0]) ? parts[0] : DEFAULT_LOCALE;
  const section = parts[1] ?? "";
  const d = t(locale);

  // トレンド系(一覧 or 各国/jp等)はまとめてトレンドをアクティブに
  const isTrends = section === "" || section.length === 2;
  const tabs: { href: string; label: string; active: boolean }[] = [
    { href: `/${locale}`, label: d.nav.trends, active: isTrends },
    { href: `/${locale}/quest`, label: d.nav.quest, active: section === "quest" },
    { href: `/${locale}/analysis`, label: d.nav.analysis, active: section === "analysis" },
    { href: `/${locale}/globe`, label: d.nav.globe, active: section === "globe" },
  ];

  // 言語切替: ロケール部分だけ差し替えて同じページへ
  const rest = pathname.replace(/^\/(ja|en)(?=\/|$)/, "");
  const switchLang = (l: string) => router.push(`/${l}${rest}`);

  return (
    <header className={`site-header${overlay ? " overlay" : ""}`}>
      <Link href={`/${locale}`} className="brand">
        earth-trend
      </Link>
      <nav>
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} data-active={tab.active}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <select
        className="btn"
        value={locale}
        onChange={(e) => switchLang(e.target.value)}
        aria-label="Language"
        style={{ flexShrink: 0 }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {t(l).langName}
          </option>
        ))}
      </select>
      <ThemeToggle />
    </header>
  );
}
