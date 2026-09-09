"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { LOCALES, DEFAULT_LOCALE, isLocale, t, localePath, type Locale } from "@/lib/i18n";
import { gaEvent } from "@/lib/gtag";

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
  // prefix-except-default: ja は接頭辞なし(/trends)、en/es は /en /es 接頭辞(/en/trends)。
  // config rewrite後のSSRでも安全なよう、先頭がja/en/esならロケール接頭辞として剥がす。
  const parts = pathname.split("/").filter(Boolean);
  const prefix = parts[0];
  const hasLocalePrefix = isLocale(prefix);
  const locale = localeProp ?? (isLocale(prefix) ? prefix : DEFAULT_LOCALE);
  const section = hasLocalePrefix ? (parts[1] ?? "") : (parts[0] ?? "");
  const d = t(locale);

  // トレンド = /trends と 各国ページ /[geo](2文字)。ホーム(section==="")は非アクティブ
  const isTrends = section === "trends" || section.length === 2;
  const tabs: { href: string; label: string; active: boolean }[] = [
    { href: localePath(locale, "/trends"), label: d.nav.trends, active: isTrends },
    { href: localePath(locale, "/analysis"), label: d.nav.analysis, active: section === "analysis" },
    { href: localePath(locale, "/globe"), label: d.nav.globe, active: section === "globe" },
  ];

  // 言語切替: 現在のセクションを保ったまま言語だけ差し替える(ja=接頭辞なし / en,es=/xx)
  // en/es は接頭辞3文字(/en, /es)を剥がす。ja(接頭辞なし)はそのまま
  const rest = prefix === "en" || prefix === "es" ? pathname.slice(3) : pathname;
  const switchLang = (l: Locale) => {
    gaEvent("language_switch", { from: locale, to: l });
    router.push(localePath(l, rest === "/" ? "" : rest));
  };

  const langSelect = (
    <select
      className="btn"
      value={locale}
      onChange={(e) => switchLang(e.target.value as Locale)}
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
        <Link href={localePath(locale)} className="brand">
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
