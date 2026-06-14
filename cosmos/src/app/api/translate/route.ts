import { NextResponse } from "next/server";
import { translate } from "@/lib/translate";

// 単一テキストの翻訳(クライアントの詳細パネルからオンデマンドで叩く)。
// 原語の保持は呼び出し側の責務。ここは訳文字列のみ返す。
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const from = searchParams.get("from") ?? "auto";
  const to = searchParams.get("to") ?? "ja";
  if (!q) return NextResponse.json({ translated: null });

  const translated = await translate(q, from, to);
  return NextResponse.json(
    { translated },
    // 訳は安定。CDNでも長めにキャッシュ
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
  );
}
