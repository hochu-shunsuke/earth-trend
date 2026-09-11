import type { Metadata } from "next";
import GraphExplorer from "@/components/GraphExplorer";

export const metadata: Metadata = {
  title: "Analysis",
  description: "Trace what people search next, out from a rising word.",
  alternates: { canonical: "/analysis" },
  // seed付きURL(?geo=&seed=)は一時的な探索状態で、単体ではインデックス価値が無い。
  // canonicalだけでは検索結果に出てしまうため明示的に弾く(followはする=内部リンクは辿らせる)。
  robots: { index: false, follow: true },
};

export default function AnalysisPage() {
  return <GraphExplorer />;
}
