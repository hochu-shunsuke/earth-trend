"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { LOCALES, DEFAULT_LOCALE, isLocale, t, type Locale } from "@/lib/i18n";

export default function SiteHeader({
  overlay = false,
  locale: localeProp,
}: {
  overlay?: boolean;
  locale?: Locale; // ルート(/)はURLにロケールが無いので、サーバーで決めた言語を渡す
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const parts = pathname.split("/").filter(Boolean); // [locale, section?, ...]
  const locale = localeProp ?? (isLocale(parts[0]) ? parts[0] : DEFAULT_LOCALE);
  const section = parts[1] ?? "";
  const d = t(locale);

  const isTrends = section === "" || section.length === 2;
  const tabs: { href: string; label: string; active: boolean }[] = [
    { href: `/${locale}`, label: d.nav.trends, active: isTrends },
    { href: `/${locale}/quest`, label: d.nav.quest, active: section === "quest" },
    { href: `/${locale}/analysis`, label: d.nav.analysis, active: section === "analysis" },
    { href: `/${locale}/globe`, label: d.nav.globe, active: section === "globe" },
  ];

  const rest = pathname.replace(/^\/(ja|en)(?=\/|$)/, "");
  const switchLang = (l: string) => router.push(`/${l}${rest}`);

  const langSelect = (
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
  );

  return (
    <>
      <header className={`site-header${overlay ? " overlay" : ""}`}>
        <Link href={`/${locale}`} className="brand">
          earth-trend
        </Link>
        <nav className="nav-inline">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} data-active={tab.active}>
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="header-right">
          {langSelect}
          <ThemeToggle />
        </div>
        <button
          className="hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menu"
          type="button"
        >
          ☰
        </button>
      </header>

      {/* モバイル: 横から出るドロワー */}
      <div
        className={`nav-backdrop${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside className={`nav-drawer${open ? " open" : ""}`}>
        <button
          className="btn"
          style={{ alignSelf: "flex-end", padding: "2px 10px" }}
          onClick={() => setOpen(false)}
          aria-label={d.detail.close}
          type="button"
        >
          ✕
        </button>
        <nav>
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              data-active={tab.active}
              onClick={() => setOpen(false)}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {langSelect}
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
