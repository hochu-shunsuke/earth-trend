import type { Metadata } from "next";
import Gallery from "@/components/Gallery";
import { COPY } from "@/lib/copy";

// snapshot完了時のタグ失効が主経路。1時間はcron停止時の安全網。
export const revalidate = 3600;

export const metadata: Metadata = {
  title: COPY.home.title,
  description: COPY.home.desc,
  alternates: { canonical: "/" },
};

// ホーム = 各国のトレンドを見渡す世界一覧。国を選ぶと固有URLへ潜る。
export default function Home() {
  return <Gallery />;
}
