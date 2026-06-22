import { NextResponse } from "next/server";
import { translate } from "@/lib/translate";
import { underLimit } from "@/lib/ratelimit";
import { isLocale } from "@/lib/i18n";

// ニュース見出しの訳をクライアント(NewsTitle/詳細パネル)へ返す。
// 設計: ①まずキャッシュ(cacheOnly)を引く。②ミス時のみ、レート制限内なら gtx でライブ翻訳して
//   キャッシュに書く(=見られた見出しから自然に温まる)。③レート超過時はライブせず null(=原語表示)。
// これで「翻訳が効く」UXと「共有IPがブロックされない/踏み台化されない」安全性を両立する。
// ※高ファンアウトな語のSSR一括翻訳は別経路(getCountryItems)で cacheOnly のまま=ここはオンデマンド専用。
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").slice(0, 200).trim();
  // toはUIロケール(ja/en)のみ。fromは言語コード形(例 en, zh-TW)か auto に限定
  const toRaw = searchParams.get("to") ?? "ja";
  const to = isLocale(toRaw) ? toRaw : "ja";
  const fromRaw = searchParams.get("from") ?? "auto";
  const from = /^[a-z]{2}(-[a-z]{2,4})?$/i.test(fromRaw) ? fromRaw : "auto";
  if (!q) return NextResponse.json({ translated: null });

  const longCache = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";
  const shortCache = "public, max-age=0, s-maxage=120, stale-while-revalidate=120";

  // ① キャッシュ優先
  const cached = await translate(q, from, to, true);
  if (cached) {
    return NextResponse.json({ translated: cached }, { headers: { "Cache-Control": longCache } });
  }

  // ② レート制限内ならライブ翻訳。全体(gtx保護)とIP(乱用/枯渇防止)の二段
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  const [okGlobal, okIp] = await Promise.all([
    underLimit("rl:tr:global", 150, 60), // 全体 150/分(≈2.5/s)= 24国×3言語のコールド期にlive-fillを回す。gtxは許容範囲
    underLimit(`rl:tr:ip:${ip}`, 80, 60), // IP 80/分(コールドな国別頁の見出し群を1回の閲覧で訳しきれる)
  ]);
  if (!okGlobal || !okIp) {
    // 超過: ライブせず原語にフォールバック(短期キャッシュ=窓が空けば次回ライブに戻る)
    return NextResponse.json({ translated: null }, { headers: { "Cache-Control": shortCache } });
  }

  const live = await translate(q, from, to); // ライブ(成功時は内部でキャッシュに書く)
  return NextResponse.json(
    { translated: live },
    { headers: { "Cache-Control": live ? longCache : shortCache } },
  );
}
