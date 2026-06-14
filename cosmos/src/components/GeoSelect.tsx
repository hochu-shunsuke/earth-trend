"use client";

import { usePathname, useRouter } from "next/navigation";
import { GEO_LABELS } from "@/lib/trends";
import { DEFAULT_LOCALE, isLocale, COUNTRY_LABELS } from "@/lib/i18n";

export default function GeoSelect({ geo }: { geo: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const seg = pathname.split("/")[1];
  const locale = isLocale(seg) ? seg : DEFAULT_LOCALE;
  const labels = COUNTRY_LABELS[locale] ?? COUNTRY_LABELS[DEFAULT_LOCALE];

  return (
    <select
      className="btn"
      value={geo}
      onChange={(e) => router.push(`/${locale}/${e.target.value.toLowerCase()}`)}
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
