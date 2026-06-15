"use client";

import { usePathname, useRouter } from "next/navigation";
import { GEO_LABELS } from "@/lib/trends";
import { DEFAULT_LOCALE, COUNTRY_LABELS, localePath } from "@/lib/i18n";

export default function GeoSelect({ geo }: { geo: string }) {
  const router = useRouter();
  const pathname = usePathname();
  // prefix-except-default: 先頭が "en" なら英語・それ以外はデフォルト(ja)
  const locale = pathname.split("/")[1] === "en" ? "en" : DEFAULT_LOCALE;
  const labels = COUNTRY_LABELS[locale] ?? COUNTRY_LABELS[DEFAULT_LOCALE];

  return (
    <select
      className="btn"
      value={geo}
      onChange={(e) => router.push(localePath(locale, `/${e.target.value.toLowerCase()}`))}
      aria-label="Country"
    >
      {Object.keys(GEO_LABELS).map((code) => (
        <option key={code} value={code}>
          {labels[code] ?? code}
        </option>
      ))}
    </select>
  );
}
