import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_GEO, fetchTrends } from "@/lib/trends";

export async function GET(req: NextRequest) {
  const geo = req.nextUrl.searchParams.get("geo")?.toUpperCase() ?? "JP";
  if (!ALLOWED_GEO.has(geo)) {
    return NextResponse.json({ error: "unsupported geo" }, { status: 400 });
  }
  try {
    const items = await fetchTrends(geo);
    return NextResponse.json(
      { geo, items },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
