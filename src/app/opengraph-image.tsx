import { brandOgImage } from "@/lib/og-brand";
import { OG_SIZE } from "@/lib/og-world-trends";

// ルートと /about のOG = ブランドOG。
// トレンド実データのページ(/[geo])は各セグメントで個別にバブルOGを出す。
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "earth-trend — a living map of what the world is searching";

export default function Image() {
  return brandOgImage();
}
