"use client";

import { usePathname, useRouter } from "next/navigation";
import { GEO_LABELS, geoSlug } from "@/lib/trends";
import { DEFAULT_LOCALE, isLocale, COUNTRY_LABELS, localePath } from "@/lib/i18n";

export default function GeoSelect({ geo }: { geo: string }) {
  const router = useRouter();
  const pathname = usePathname();
  // prefix-except-default: 先頭がロケール接頭辞(en/es)ならそれ・無ければデフォルト(ja)
  const seg = pathname.split("/")[1];
  const locale = isLocale(seg) ? seg : DEFAULT_LOCALE;
  const labels = COUNTRY_LABELS[locale] ?? COUNTRY_LABELS[DEFAULT_LOCALE];

  return (
    <select
      className="btn"
      value={geo}
      onChange={(e) => router.push(localePath(locale, `/${geoSlug(e.target.value)}`))}
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
