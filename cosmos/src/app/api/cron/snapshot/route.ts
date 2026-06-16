import { NextResponse } from "next/server";
import { after } from "next/server";
import { runSnapshot, warmTranslations } from "@/lib/snapshot";

// スナップショット定期実行のエンドポイント。Upstash QStash が無料・高信頼で定期トリガする。
// CRON_SECRET で保護(QStashは Upstash-Forward-Authorization で Bearer を転送、手動は ?key=)。
// スナップショット保存は即応答し、翻訳warmingは after() で応答後に背景実行する
// (QStashへ素早く200を返してタイムアウト/リトライを避ける)。
export const dynamic = "force-dynamic";
export const maxDuration = 60; // warmingがafter()で背景実行されるぶんの余裕

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
    const out = await runSnapshot(); // 保存はここで完了(高速)
    // 翻訳の温めは応答後に背景で(QStashには即200)。失敗してもsnapshotは成立済み
    after(async () => {
      const warmed = await warmTranslations(out.warmJobs);
      console.log(`warmed ${warmed} translations`);
    });
    return NextResponse.json({ ok: true, ts: out.ts, geos: out.geos, queued: out.warmJobs.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
