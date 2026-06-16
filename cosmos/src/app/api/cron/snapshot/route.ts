import { NextResponse } from "next/server";
import { runSnapshot } from "@/lib/snapshot";

// スナップショット定期実行のエンドポイント。Upstash QStash が無料・高信頼で定期トリガする
// (GitHub Actionsのcronはスケジュールが不安定で不採用)。CRON_SECRET で保護。
// QStashにはスケジュール作成時に固定ヘッダ Authorization: Bearer <CRON_SECRET> を持たせる。
// 手動確認用に GET ?key=<CRON_SECRET> も許可。
export const dynamic = "force-dynamic"; // キャッシュさせない
export const maxDuration = 60; // 9国fetch+書込は数秒だが余裕を持つ

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // 未設定なら拒否(誤って無防備に開かない)
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const out = await runSnapshot();
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
