"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gaEvent } from "@/lib/gtag";
import { COPY } from "@/lib/copy";

export interface CountryRailItem {
  code: string;
  label: string;
  href: string;
}

// 左右のシェブロン。「←」「→」の文字は線が細く貧相に見えるので図形で描く。
function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/**
 * 国の切り替えレール。
 * 以前は同じ並びを3周置いて無限スクロールにしていたが、
 *  - 現在地の強調(aria-current)が中央の周にしか付かず、別の周を見ていると強調が消える
 *  - scroll-snap と scrollLeft の書き換えが競合して点滅する
 * という不具合の原因だったので、1周だけの素直な横スクロールに戻した。
 */
export default function CountryRail({
  currentGeo,
  countries,
  previous,
  next,
}: {
  currentGeo: string;
  countries: CountryRailItem[];
  previous: CountryRailItem;
  next: CountryRailItem;
}) {
  const router = useRouter();
  const railRef = useRef<HTMLElement>(null);
  const currentRef = useRef<HTMLAnchorElement>(null);

  // 現在の国をレールの中央へ寄せる(レールのスクロール位置だけを動かす=ページは動かさない)
  useEffect(() => {
    const rail = railRef.current;
    const current = currentRef.current;
    if (rail && current) {
      rail.scrollLeft = current.offsetLeft - (rail.clientWidth - current.offsetWidth) / 2;
    }
    router.prefetch(previous.href);
    router.prefetch(next.href);
  }, [currentGeo, next.href, previous.href, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      const destination =
        event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : null;
      if (!destination) return;
      event.preventDefault();
      gaEvent("country_change", { from: currentGeo, to: destination.code, method: "keyboard" });
      router.push(destination.href, { scroll: false });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentGeo, next, previous, router]);

  return (
    <div className="country-nav">
      <div className="country-rail-row">
        <Link
          className="country-step"
          href={previous.href}
          scroll={false}
          aria-label={`${COPY.country.previousCountry}: ${previous.label}`}
          onClick={() =>
            gaEvent("country_change", { from: currentGeo, to: previous.code, method: "arrow" })
          }
        >
          <Chevron dir="left" />
        </Link>
        <nav ref={railRef} className="country-rail" aria-label={COPY.country.switchCountry}>
          {countries.map((country) => {
            const current = country.code === currentGeo;
            return (
              <Link
                key={country.code}
                ref={current ? currentRef : undefined}
                className="country-chip"
                href={country.href}
                scroll={false}
                aria-current={current ? "page" : undefined}
                onClick={() => {
                  if (!current) {
                    gaEvent("country_change", {
                      from: currentGeo,
                      to: country.code,
                      method: "rail",
                    });
                  }
                }}
              >
                {country.label}
              </Link>
            );
          })}
        </nav>
        <Link
          className="country-step"
          href={next.href}
          scroll={false}
          aria-label={`${COPY.country.nextCountry}: ${next.label}`}
          onClick={() =>
            gaEvent("country_change", { from: currentGeo, to: next.code, method: "arrow" })
          }
        >
          <Chevron dir="right" />
        </Link>
      </div>
      <p className="country-swipe-hint">{COPY.country.swipeHint}</p>
    </div>
  );
}
