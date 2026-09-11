"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gaEvent } from "@/lib/gtag";
import { type Locale } from "@/lib/i18n";

export interface CountryRailItem {
  code: string;
  label: string;
  href: string;
}

const COPY = {
  ja: { label: "国を切り替える", previous: "前の国", next: "次の国", hint: "左右にスワイプして国を切り替え" },
  en: { label: "Switch country", previous: "Previous country", next: "Next country", hint: "Swipe left or right to switch country" },
  es: { label: "Cambiar país", previous: "País anterior", next: "País siguiente", hint: "Desliza a izquierda o derecha para cambiar de país" },
} satisfies Record<Locale, { label: string; previous: string; next: string; hint: string }>;

export default function CountryRail({
  locale,
  currentGeo,
  countries,
  previous,
  next,
}: {
  locale: Locale;
  currentGeo: string;
  countries: CountryRailItem[];
  previous: CountryRailItem;
  next: CountryRailItem;
}) {
  const router = useRouter();
  const currentRef = useRef<HTMLAnchorElement>(null);
  const copy = COPY[locale];

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
    router.prefetch(previous.href);
    router.prefetch(next.href);
  }, [currentGeo, next.href, previous.href, router]);

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
        <nav className="country-rail" aria-label={copy.label}>
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
                    gaEvent("country_change", { from: currentGeo, to: country.code, method: "rail" });
                  }
                }}
              >
                <span>{country.label}</span>
                <small>{country.code}</small>
              </Link>
            );
          })}
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
