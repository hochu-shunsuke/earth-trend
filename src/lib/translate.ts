// コンテンツ翻訳(オンデマンド＋Upstashキャッシュ)。原語は呼び出し側で必ず残す前提で、
// ここは「訳の文字列」だけを返す。エンジンはGoogleの無料翻訳エンドポイント(キー不要・
// 高品質)。非公式だがトレンドRSSと同じ半公式・無料の枠。叩く量はキャッシュで極小。

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(commands: unknown[][]): Promise<{ result: unknown }[] | null> {
  const env = redisEnv();
  if (!env) return null;
  try {
    const res = await fetch(`${env.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { result: unknown }[];
  } catch {
    return null;
  }
}

// langpairの片側を MyMemory が受ける形へ寄せる(zh-TW/pt-BR はそのまま通る)
function norm(lang: string): string {
  return lang.trim();
}

/**
 * text を from→to へ翻訳。from===to や空なら原文を返す。
 * Upstashにキャッシュ(`tr:<from>:<to>:<text>`)。失敗時は null。
 */
export async function translate(
  text: string,
  from: string,
  to: string,
  // cacheOnly: キャッシュに無ければ翻訳せず null。サーバー描画の一括翻訳で使い、
  // Google EPへの同時バースト(レート制限の元)を避ける。温めは cron/backfill が担う
  cacheOnly = false,
): Promise<string | null> {
  const t = text.trim();
  if (!t) return text;
  if (norm(from) === norm(to)) return text;

  const key = `tr2:${norm(from)}:${norm(to)}:${t}`; // v2: エンジンをGoogleに変更(旧キャッシュ無効化)
  const cached = await redis([["GET", key]]);
  const hit = cached?.[0]?.result;
  if (typeof hit === "string" && hit) return hit;
  if (cacheOnly) return null;

  try {
    // sl=auto: 自動検出が堅牢(国の言語と実際の語の言語がずれても拾う)
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t` +
      `&sl=auto&tl=${encodeURIComponent(norm(to))}&q=${encodeURIComponent(t)}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; earth-trend)" },
    });
    if (!res.ok) return null;
    // 形: [[["訳","原文",...],...], ..., "検出言語", ...]
    const data = (await res.json()) as unknown[];
    const segs = data?.[0];
    if (!Array.isArray(segs)) return null;
    const out = segs
      .map((s) => (Array.isArray(s) ? String(s[0] ?? "") : ""))
      .join("")
      .trim();
    if (!out || out.toLowerCase() === t.toLowerCase()) return null;
    // キャッシュ(訳は安定なので長期保持。30日)
    await redis([["SET", key, out, "EX", "2592000"]]);
    return out;
  } catch {
    return null;
  }
}
