import type { Metadata } from "next";
import GraphExplorer from "@/components/GraphExplorer";

export const metadata: Metadata = {
  title: "世界の問い — earth-trend",
  description:
    "「なぜ私は」「どうすれば」——人類が検索窓に半分打った問いを、世界の検索が続けていく。集合的無意識を覗く鏡。",
};

export default function MirrorPage() {
  return <GraphExplorer mode="mirror" />;
}
