import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_GEO } from "@/lib/trends";
import { getCountryItems } from "@/lib/country-data";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n";

// 1国の急上昇。実体は world:v1 の単一キャッシュなので、他ページの図と「同じ瞬間」になる。
// 訳は cron が焼き込み済みのものを返すだけ(上流も追加のRedisも叩かない)。
export async function GET(req: NextRequest) {
  const geo = req.nextUrl.searchParams.get("geo")?.toUpperCase() ?? "JP";
  if (!ALLOWED_GEO.has(geo)) {
    return NextResponse.json({ error: "unsupported geo" }, { status: 400 });
  }
  const toRaw = req.nextUrl.searchParams.get("to");
  const to = toRaw && isLocale(toRaw) ? toRaw : DEFAULT_LOCALE;
  try {
    const items = await getCountryItems(geo, to);
    // CDNキャッシュは付けない: URLごとに別タイマーになり、world:v1(単一キャッシュキー)が持つ
    // 「全ページ同じ瞬間」という前提が崩れてドリフトする(内部のunstable_cacheで十分低コスト)
    return NextResponse.json({ geo, items });
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
