import { brandOgImage } from "@/lib/og-brand";
import { OG_SIZE } from "@/lib/og-world-trends";

// ルートのOG = ブランドOG(better-auth調)。ja系ページ(/・/about・/analysis・/globe)は
// この共通ブランド画像を使う。
// トレンド実データのページ(/trends・/[geo])は各セグメントで個別にバブルOGを出す。
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "earth-trend — a living map of what the world is searching";

export default function Image() {
  return brandOgImage();
}
