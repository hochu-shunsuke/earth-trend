import { ALLOWED_GEO, slugToGeo } from "@/lib/trends";
import { COUNTRY_LABELS } from "@/lib/copy";
import { trendsOgImage, OG_SIZE } from "@/lib/og-world-trends";

// 各国ページのOG = その国の「注意の地図」。
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "earth-trend — live search trends";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ geo: string }> }) {
  const { geo } = await params;
  const code = slugToGeo(geo || "");
  const country = ALLOWED_GEO.has(code) ? COUNTRY_LABELS[code] ?? code : code;
  return trendsOgImage({ geo: code, title: country, subtitle: "live search trends" });
}
