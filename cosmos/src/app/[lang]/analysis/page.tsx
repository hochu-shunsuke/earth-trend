import type { Metadata } from "next";
import GraphExplorer from "@/components/GraphExplorer";

export const metadata: Metadata = {
  title: "分析",
  description: "急上昇ワードから、人々が次に検索する言葉を辿って分析していく。",
};

export default function ExplorePage() {
  return <GraphExplorer mode="trends" />;
}
