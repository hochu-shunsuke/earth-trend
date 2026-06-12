import { NextResponse } from "next/server";
import { ALLOWED_GEO, fetchTrends, type TrendItem } from "@/lib/trends";

// 全対象国の急上昇をまとめて返す(地球儀ビュー用)。各国RSSは10分キャッシュ
export async function GET() {
  const geos = [...ALLOWED_GEO];
  const entries = await Promise.all(
    geos.map(async (g): Promise<[string, TrendItem[]]> => {
      try {
        return [g, await fetchTrends(g)];
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
