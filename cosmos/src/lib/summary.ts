import type { TrendItem } from "./trends";

// ワード単位のメモリキャッシュ(6時間)。CDNキャッシュと併用するので生成は実質6時間に1回
const memCache = new Map<string, { summary: string | null; exp: number }>();
const TTL_MS = 6 * 60 * 60 * 1000;

// 見出しが何語でも解説は日本語で返す(海外トレンドを日本語で読めるのが価値)
async function callGemini(word: string, titles: string[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt = `検索ワード「${word}」が今急上昇しています。以下のニュース見出しを根拠に、なぜ急上昇しているのかを日本語1文(60字以内)で説明してください。前置きや引用符は不要、説明文のみ。\n\n${titles.join("\n")}`;

  // モデルは環境変数で差し替え可能(無料枠の制約で将来変更しうるため)
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch {
    return null;
  }
}

/** 1ワードの要約(キャッシュ優先)。ニュース見出しが無ければ生成しない */
async function summaryForWord(
  geo: string,
  word: string,
  titles: string[],
): Promise<string | null> {
  if (titles.length === 0) return null;
  const cacheKey = `${geo}:${word}`;
  const cached = memCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.summary;

  const summary = await callGemini(word, titles);
  // 成功した要約だけ6時間キャッシュ。失敗(レート制限等)はキャッシュせず次回再試行させる
  if (summary) memCache.set(cacheKey, { summary, exp: Date.now() + TTL_MS });
  return summary;
}

/** トレンド配列をまとめて要約し、{ワード: 要約} のマップを返す。
 * Gemini無料枠は20req/分のため並列を絞る。未キャッシュ分のみGeminiを呼ぶ */
export async function buildSummaries(
  geo: string,
  items: TrendItem[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const targets = items.filter((it) => it.news.length > 0);

  const CONCURRENCY = 3;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (it) => {
        const s = await summaryForWord(
          geo,
          it.word,
          it.news.map((n) => n.title).slice(0, 3),
        );
        return [it.word, s] as const;
      }),
    );
    for (const [word, s] of results) {
      if (s) out[word] = s;
    }
  }
  return out;
}
