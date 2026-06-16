import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_GEO, GEO_LANG } from "@/lib/trends";
import { fetchTrendsUnioned } from "@/lib/history";
import { translate } from "@/lib/translate";
import { isLocale } from "@/lib/i18n";

export async function GET(req: NextRequest) {
  const geo = req.nextUrl.searchParams.get("geo")?.toUpperCase() ?? "JP";
  if (!ALLOWED_GEO.has(geo)) {
    return NextResponse.json({ error: "unsupported geo" }, { status: 400 });
  }
  const toRaw = req.nextUrl.searchParams.get("to");
  const to = toRaw && isLocale(toRaw) ? toRaw : null;
  try {
    // トレンドページと同じ union 取得(firstSeen付き=色付けが一致する)
    const raw = await fetchTrendsUnioned(geo);
    const src = GEO_LANG[geo] ?? "auto";
    // to指定があり原語と違えば、語の訳を cacheOnly で付与(SSRのgetCountryItemsと同等)。
    // cacheOnlyなので上流は叩かない=この経路もスケール安全。未温は原語のまま
    const items =
      to && src !== to
        ? await Promise.all(
            raw.map(async (it) => ({
              ...it,
              translation: (await translate(it.word, src, to, true)) ?? undefined,
            })),
          )
        : raw;
    return NextResponse.json(
      { geo, items },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
