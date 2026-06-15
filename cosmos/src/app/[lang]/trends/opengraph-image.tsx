import { trendsOgImage, OG_SIZE } from "@/lib/og-world-trends";

// トレンド一覧(/trends)のOG = ライブのバブル可視化(ランダム1か国)。実データを見せる。
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "earth-trend — live search trends";
export const revalidate = 3600;

export default function Image() {
  return trendsOgImage({ title: "World Trends", subtitle: "live search · 9 countries" });
}
