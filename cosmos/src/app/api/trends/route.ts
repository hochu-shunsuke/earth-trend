import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_GEO } from "@/lib/trends";
import { fetchTrendsUnioned } from "@/lib/history";

export async function GET(req: NextRequest) {
  const geo = req.nextUrl.searchParams.get("geo")?.toUpperCase() ?? "JP";
  if (!ALLOWED_GEO.has(geo)) {
    return NextResponse.json({ error: "unsupported geo" }, { status: 400 });
  }
  try {
    // トレンドページと同じ union 取得(firstSeen付き=色付けが一致する)
    const items = await fetchTrendsUnioned(geo);
    return NextResponse.json(
      { geo, items },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
