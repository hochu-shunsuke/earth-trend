import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_GEO } from "@/lib/trends";
import { getCountryItems } from "@/lib/country-data";

// 1国の急上昇。実体は world:v1 の単一キャッシュなので、他ページの図と「同じ瞬間」になる。
export async function GET(req: NextRequest) {
  const geo = req.nextUrl.searchParams.get("geo")?.toUpperCase() ?? "JP";
  if (!ALLOWED_GEO.has(geo)) {
    return NextResponse.json({ error: "unsupported geo" }, { status: 400 });
  }
  try {
    return NextResponse.json({ geo, items: await getCountryItems(geo) });
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
