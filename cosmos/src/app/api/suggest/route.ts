import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const hl = req.nextUrl.searchParams.get("hl") === "en" ? "en" : "ja";
  if (!q || q.length > 100) {
    return NextResponse.json({ error: "bad query" }, { status: 400 });
  }

  // 末尾スペースで「次の語」のサジェストを誘発する(連想の川の肝)
  const url =
    "https://suggestqueries.google.com/complete/search" +
    `?client=chrome&hl=${hl}&ie=utf-8&oe=utf-8&q=${encodeURIComponent(q + " ")}`;

  const res = await fetch(url, {
    // 同一クエリは1時間共有キャッシュ
    next: { revalidate: 3600 },
    headers: { "User-Agent": "Mozilla/5.0 (compatible; cosmos-mvp)" },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }

  const data = (await res.json()) as [string, string[]];
  // 元クエリ自身と重複を除く
  const suggestions = [...new Set(data[1] ?? [])]
    .filter((s) => s.trim() !== q)
    .slice(0, 8);

  return NextResponse.json(
    { q, suggestions },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } },
  );
}
