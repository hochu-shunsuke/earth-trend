import { brandOgImage } from "@/lib/og-brand";
import { OG_SIZE } from "@/lib/og-world-trends";

// ルートのOG = ブランドOG(better-auth調)。ja系ページ(/・/about・/analysis・/quest・/globe)は
// proxyで /opengraph-image に集約されるので、ここがそれら全部のブランド画像になる。
// トレンド実データのページ(/trends・/[geo])は各セグメントで個別にバブルOGを出す。
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "earth-trend — a living map of what the world is searching";

export default function Image() {
  return brandOgImage();
}
