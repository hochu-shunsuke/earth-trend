import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_GEO, fetchTrends } from "@/lib/trends";
import { buildSummaries } from "@/lib/summary";

// その国の全トレンドのAI要約を一括で返す(バッチ)。クライアントはこれを先読みする
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("geo")?.toUpperCase() ?? "JP";
  const geo = ALLOWED_GEO.has(raw) ? raw : "JP";
  try {
    const items = await fetchTrends(geo);
    const summaries = await buildSummaries(geo, items);
    // 成功分はメモリに6h残るので再生成は安い。CDNは短めにして、
    // レート制限で欠けた分が15分以内に埋め直されるようにする
    return NextResponse.json(
      { geo, summaries },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ summaries: {} }, { status: 502 });
  }
}
