// Upstash REST の最小クライアント。env解決とpipelineをここ1箇所に集約する
// (以前は history/translate/ratelimit/snapshot が各自で同じものを持っていた)。
// Vercel連携は KV_REST_API_* / 手動は UPSTASH_REDIS_REST_* 。両対応。

export function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export interface RedisResult {
  result: unknown;
  error?: string;
}

/**
 * 複数コマンドを1リクエストで投げる。env未設定/通信失敗は null を返し、
 * 呼び出し側がフォールバック(RSS直取得・原語表示・レート制限は許可)する。
 */
export async function redisPipeline(commands: unknown[][]): Promise<RedisResult[] | null> {
  const env = redisEnv();
  if (!env || commands.length === 0) return null;
  try {
    const res = await fetch(`${env.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as RedisResult[];
  } catch {
    return null;
  }
}
