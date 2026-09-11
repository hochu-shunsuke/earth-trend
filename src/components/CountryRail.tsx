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
  const middleSetRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLAnchorElement>(null);
  const initialized = useRef(false);
  const copy = {
    label: COPY.country.switchCountry,
    previous: COPY.country.previousCountry,
    next: COPY.country.nextCountry,
    hint: COPY.country.swipeHint,
  };

  useEffect(() => {
    initialized.current = false;
    const frame = requestAnimationFrame(() => {
      const rail = railRef.current;
      const current = currentRef.current;
      if (rail && current) {
        const railRect = rail.getBoundingClientRect();
        const currentRect = current.getBoundingClientRect();
        rail.scrollLeft +=
          currentRect.left - railRect.left - (rail.clientWidth - current.offsetWidth) / 2;
      }
      initialized.current = true;
    });
    router.prefetch(previous.href);
    router.prefetch(next.href);
    return () => cancelAnimationFrame(frame);
  }, [currentGeo, next.href, previous.href, router]);

  const normalizeScroll = () => {
    const rail = railRef.current;
    const setWidth = middleSetRef.current?.offsetWidth ?? 0;
    if (!initialized.current || !rail || setWidth === 0) return;

    // 同じ並びを3周置き、外側へ入ったら同じ見た目の中央周へ瞬時に戻す。
    // スクロール量だけを1周分ずらすので、ドラッグ中も継ぎ目は見えない。
    if (rail.scrollLeft < setWidth * 0.5) {
      rail.scrollLeft += setWidth;
    } else if (rail.scrollLeft > setWidth * 1.5) {
      rail.scrollLeft -= setWidth;
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      const destination = event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : null;
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
          aria-label={`${copy.previous}: ${previous.label}`}
          onClick={() => gaEvent("country_change", { from: currentGeo, to: previous.code, method: "arrow" })}
        >
          ←
        </Link>
        <nav
          ref={railRef}
          className="country-rail"
          aria-label={copy.label}
          onScroll={normalizeScroll}
        >
          {[0, 1, 2].map((copyIndex) => (
            <div
              key={copyIndex}
              ref={copyIndex === 1 ? middleSetRef : undefined}
              className="country-rail-set"
              aria-hidden={copyIndex === 1 ? undefined : true}
            >
              {countries.map((country) => {
                const current = country.code === currentGeo;
                const semanticCopy = copyIndex === 1;
                return (
                  <Link
                    key={`${copyIndex}-${country.code}`}
                    ref={semanticCopy && current ? currentRef : undefined}
                    className="country-chip"
                    href={country.href}
                    scroll={false}
                    tabIndex={semanticCopy ? undefined : -1}
                    aria-current={semanticCopy && current ? "page" : undefined}
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
                    <span>{country.label}</span>
                    <small>{country.code}</small>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <Link
          className="country-step"
          href={next.href}
          scroll={false}
          aria-label={`${copy.next}: ${next.label}`}
          onClick={() => gaEvent("country_change", { from: currentGeo, to: next.code, method: "arrow" })}
        >
          →
        </Link>
      </div>
      <p className="country-swipe-hint">{copy.hint}</p>
    </div>
  );
}
