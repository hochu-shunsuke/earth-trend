import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_GEO, GEO_LANG } from "@/lib/trends";
import { getGalleryData } from "@/lib/gallery-data";
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
    // 全画面共通の単一キャッシュ(getGalleryData)から該当国を取り出す=他ページの図と「同じ瞬間」
    const all = await getGalleryData();
    const raw = all.find(([g]) => g === geo)?.[1] ?? [];
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
