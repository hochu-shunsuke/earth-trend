import { NextResponse } from "next/server";
import { translate } from "@/lib/translate";
import { isLocale } from "@/lib/i18n";

// ニュース見出しの訳をクライアント(NewsTitle/詳細パネル)へ返す。
// ★cacheOnly: キャッシュ済みの訳だけを返し、未温なら null(=呼び出し側は原語を表示)。温めは
//   cron(snapshot.mjs)が担う。これでユーザーが何人来ても非公式翻訳EPを叩かない=スケールしても
//   ブロックされない。さらに「その場翻訳」をしない=翻訳踏み台にもされない(無認証EPの乱用対策)。
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").slice(0, 200).trim();
  // toはUIロケール(ja/en)のみ。fromは言語コード形(例 en, zh-TW)か auto に限定
  const toRaw = searchParams.get("to") ?? "ja";
  const to = isLocale(toRaw) ? toRaw : "ja";
  const fromRaw = searchParams.get("from") ?? "auto";
  const from = /^[a-z]{2}(-[a-z]{2,4})?$/i.test(fromRaw) ? fromRaw : "auto";
  if (!q) return NextResponse.json({ translated: null });

  const translated = await translate(q, from, to, true); // cacheOnly
  return NextResponse.json(
    { translated },
    {
      headers: {
        // ヒット=訳は安定なので長期キャッシュ。ミス(=未温)は短期にして、cronが温めた後すぐ
        // 訳へ切り替わるようにする(nullを24h固定化しない)
        "Cache-Control": translated
          ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"
          : "public, max-age=0, s-maxage=120, stale-while-revalidate=120",
      },
    },
  );
}
