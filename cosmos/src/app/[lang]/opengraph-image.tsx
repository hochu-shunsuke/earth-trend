import { trendsOgImage, OG_SIZE } from "@/lib/og-world-trends";

// [lang]ホームのOG(/en 等)。ルートと同じ「世界のトレンド(ランダム1か国)」を共通描画で。
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
