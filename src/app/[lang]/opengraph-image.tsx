import { brandOgImage } from "@/lib/og-brand";
import { OG_SIZE } from "@/lib/og-world-trends";

// [lang]ホームのOG(/en 等)。ルートと同じブランドOG。
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "earth-trend — a living map of what the world is searching";

export default function Image() {
  return brandOgImage();
}
