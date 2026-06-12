"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const TABS: [string, string][] = [
  ["/", "グラフ"],
  ["/globe", "地球儀"],
  ["/list", "リスト"],
];

export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  return (
    <header className={`site-header${overlay ? " overlay" : ""}`}>
      <Link href="/" className="brand">
        earth-trend
      </Link>
      <nav>
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} data-active={pathname === href}>
            {label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
