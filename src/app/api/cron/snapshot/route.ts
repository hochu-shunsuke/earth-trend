import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { runSnapshot } from "@/lib/snapshot";
import { TRENDS_DATA_CACHE_TAG } from "@/lib/cache-tags";

// スナップショット定期実行のエンドポイント。Upstash QStash が無料・高信頼で定期トリガする。
// CRON_SECRET で保護(QStashは Upstash-Forward-Authorization で Bearer を転送、手動は ?key=)。
// 24カ国のRSS取得 → 前回状態とrunning union → 翻訳の温め → world:v1 へ1回で書く。
// 訳はblobに同居するので、温めはUpstashのコマンドを消費しない。
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const QUARTER_HOUR_MS = 15 * 60 * 1000;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  // QStashの既存15分scheduleから呼ばれても、重い処理はUTCの:00/:30だけ実行する。
  // 認証済みの手動実行は ?force=1 でこのガードを越えられる。
  if (!force && Math.floor(Date.now() / QUARTER_HOUR_MS) % 2 !== 0) {
    return NextResponse.json({ ok: true, skipped: true, cadenceMinutes: 30 });
  }
  try {
    const out = await runSnapshot();
    // revalidate:3600だけでは期限切れ後の最初の閲覧者へ古い値を返してから背景更新する。
    // 書き込み完了を更新イベントとして即時失効し、次の読み取りは必ず新しいworldを待つ。
    revalidateTag(TRENDS_DATA_CACHE_TAG, { expire: 0 });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
