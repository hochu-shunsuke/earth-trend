import { NextResponse } from "next/server";
import { translate } from "@/lib/translate";
import { isLocale } from "@/lib/i18n";

// 単一テキストの翻訳(クライアントの詳細パネルからオンデマンドで叩く)。
// 原語の保持は呼び出し側の責務。ここは訳文字列のみ返す。
// ※無認証の公開エンドポイントなので、長さ・言語コードを検証して乱用(翻訳の踏み台化)を防ぐ。
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").slice(0, 200).trim();
  // toはUIロケール(ja/en)のみ。fromは言語コード形(例 en, zh-TW)か auto に限定
  const toRaw = searchParams.get("to") ?? "ja";
  const to = isLocale(toRaw) ? toRaw : "ja";
  const fromRaw = searchParams.get("from") ?? "auto";
  const from = /^[a-z]{2}(-[a-z]{2,4})?$/i.test(fromRaw) ? fromRaw : "auto";
  if (!q) return NextResponse.json({ translated: null });

  const translated = await translate(q, from, to);
  return NextResponse.json(
    { translated },
    // 訳は安定。ブラウザ(max-age)とCDN(s-maxage)双方でキャッシュ＝再アクセスで再取得しない
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    },
  );
}
