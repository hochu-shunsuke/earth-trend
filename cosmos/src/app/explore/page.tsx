import type { Metadata } from "next";
import GraphExplorer from "@/components/GraphExplorer";

export const metadata: Metadata = {
  title: "探索",
  description: "急上昇ワードから、人々が次に検索する言葉を辿って潜っていく。",
};

export default function ExplorePage() {
  return <GraphExplorer mode="trends" />;
}
