"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

// トレンドの一面だけになったので、ナビのタブは廃止(ブランド=ホームへの導線で足りる)。
export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        earth-trend
      </Link>
      <div className="header-right">
        <ThemeToggle />
      </div>
    </header>
  );
}
