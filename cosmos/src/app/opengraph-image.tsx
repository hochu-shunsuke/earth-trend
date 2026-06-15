import { trendsOgImage, OG_SIZE } from "@/lib/og-world-trends";

// ルートのOG。ja系ページ(/・/trends 等)は proxy で /opengraph-image に集約されるので、
// ここがja全体のシェア画像になる。世界のトレンド(ランダム1か国のバブル)を表示。
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "earth-trend — a living map of what the world is searching";
export const revalidate = 3600;

export default function Image() {
  return trendsOgImage({
    title: "World Trends",
    subtitle: "live search · 9 countries",
  });
}
