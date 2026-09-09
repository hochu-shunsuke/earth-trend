import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { runSnapshot, warmTranslations } from "@/lib/snapshot";
import {
  TRENDS_DATA_CACHE_TAG,
  TRENDS_TRANSLATED_CACHE_TAG,
} from "@/lib/cache-tags";

// スナップショット定期実行のエンドポイント。Upstash QStash が無料・高信頼で定期トリガする。
// CRON_SECRET で保護(QStashは Upstash-Forward-Authorization で Bearer を転送、手動は ?key=)。
// snapshot保存 → 翻訳warming を同期で実行(QStashのendpoint timeoutは60sなので ~38s なら余裕)。
// after()(背景実行)はHobbyで実行されないことがあったため、確実な同期実行に変更。
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  try {
    const out = await runSnapshot(); // 保存(高速)
    // revalidate: 600だけでは期限切れ後の最初の閲覧者へ古い値を返してから背景更新する。
    // snapshot保存を更新イベントとして即時失効し、次の読み取りは必ず新しいsnapshotを待つ。
    revalidateTag(TRENDS_DATA_CACHE_TAG, { expire: 0 });
    const warmed = await warmTranslations(out.warmJobs); // 同期で温める(時間予算で打ち切り)
    // 翻訳付き国別キャッシュはwarming後に失効し、未温の訳を再キャッシュしないようにする。
    revalidateTag(TRENDS_TRANSLATED_CACHE_TAG, { expire: 0 });
    return NextResponse.json({
      ok: true,
      ts: out.ts,
      geos: out.geos,
      candidates: out.warmJobs.length,
      warmed,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
