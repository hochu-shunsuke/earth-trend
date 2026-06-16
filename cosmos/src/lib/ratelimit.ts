// 軽量レート制限 / サーキットブレーカ。Upstash の INCR + EXPIRE(NX) による固定ウィンドウ。
// 目的: 公開・無認証の翻訳EPが乱用されたり、大量アクセスで非公式翻訳EP(gtx)へバーストして
// 共有egress IPごとブロックされるのを防ぐ。超過時はライブ翻訳を諦めてキャッシュ/原語に劣化する。
// 可用性優先: env未設定/Upstash失敗時は「許可」にフォールバック(保護はベストエフォート)。

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * key を windowSec 窓でインクリメントし、limit 以内なら true(=許可)。
 * env無し/失敗時は true(可用性優先)。
 */
export async function underLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const env = redisEnv();
  if (!env) return true;
  try {
    const res = await fetch(`${env.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        // 窓の最初のINCRのときだけTTLを張る(NX)。以降は据え置き=固定ウィンドウ
        ["EXPIRE", key, String(windowSec), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return true;
    const out = (await res.json()) as { result: unknown }[];
    const n = Number(out?.[0]?.result ?? 0);
    return n <= limit;
  } catch {
    return true;
  }
}
