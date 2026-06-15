import { NextResponse } from "next/server";
import { ALLOWED_GEO } from "@/lib/trends";
import { fetchTrendsUnioned, type RecentTrendItem } from "@/lib/history";

// 全対象国の急上昇をまとめて返す(地球儀ビュー用)。トレンド/分析と同じunion(firstSeen付き)で色を一致
export async function GET() {
  const geos = [...ALLOWED_GEO];
  const entries = await Promise.all(
    geos.map(async (g): Promise<[string, RecentTrendItem[]]> => {
      try {
        return [g, await fetchTrendsUnioned(g)];
      } catch {
        return [g, []];
      }
    }),
  );
  return NextResponse.json(
    { data: Object.fromEntries(entries) },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
  );
}
