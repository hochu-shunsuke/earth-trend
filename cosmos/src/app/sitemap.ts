import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { GEO_LABELS } from "@/lib/trends";
import { LOCALES } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const geos = Object.keys(GEO_LABELS).map((g) => g.toLowerCase());
  const out: MetadataRoute.Sitemap = [];
  for (const lang of LOCALES) {
    out.push({ url: `${SITE_URL}/${lang}`, changeFrequency: "hourly", priority: 1 });
    for (const g of geos) {
      out.push({ url: `${SITE_URL}/${lang}/${g}`, changeFrequency: "hourly", priority: 0.8 });
    }
    out.push({ url: `${SITE_URL}/${lang}/quest`, changeFrequency: "weekly", priority: 0.6 });
    out.push({ url: `${SITE_URL}/${lang}/analysis`, changeFrequency: "hourly", priority: 0.6 });
    out.push({ url: `${SITE_URL}/${lang}/globe`, changeFrequency: "hourly", priority: 0.6 });
    out.push({ url: `${SITE_URL}/${lang}/about`, changeFrequency: "monthly", priority: 0.3 });
  }
  return out;
}
