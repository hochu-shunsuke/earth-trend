"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { COPY } from "@/lib/copy";

export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const section = pathname.split("/").filter(Boolean)[0] ?? "";

  // ホーム(世界一覧)と各国ページは同じ「トレンド」領域として扱う。
  // 国スラグは2文字コード(jp/us…)か "spain"。
  const isTrends = section === "" || section === "spain" || section.length === 2;
  const tabs = [
    { href: "/", label: COPY.nav.trends, active: isTrends },
    { href: "/analysis", label: COPY.nav.analysis, active: section === "analysis" },
    { href: "/globe", label: COPY.nav.globe, active: section === "globe" },
  ];

  return (
    <>
      <header className={`site-header${overlay ? " overlay" : ""}`}>
        <Link href="/" className="brand">
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
          <ThemeToggle />
        </div>
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Menu" type="button">
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
          aria-label={COPY.detail.close}
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
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
