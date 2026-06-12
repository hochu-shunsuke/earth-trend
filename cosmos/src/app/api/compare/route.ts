import { NextResponse } from "next/server";
import { fetchTrends } from "@/lib/trends";

// JPとUSの急上昇ワードから「同一トピックのペア」をGeminiで判定する。
// トレンドの組み合わせ単位で6時間キャッシュ = 生成は1日数回が上限
const memCache = new Map<string, { pairs: [string, string][]; exp: number }>();
const TTL_MS = 6 * 60 * 60 * 1000;

async function matchPairs(
  jpWords: string[],
  usWords: string[],
): Promise<[string, string][]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // フォールバック: 大文字小文字無視の完全一致のみ
    const usSet = new Map(usWords.map((w) => [w.toLowerCase(), w]));
    return jpWords
      .filter((w) => usSet.has(w.toLowerCase()))
      .map((w) => [w, usSet.get(w.toLowerCase())!]);
  }

  const prompt = `以下は現在の検索急上昇ワードのリストです。
日本: ${JSON.stringify(jpWords)}
アメリカ: ${JSON.stringify(usWords)}

同じトピック・人物・出来事を指しているペアを見つけてください(例:「メッシ」と"Messi")。
確信があるペアだけを返してください。JSONの配列のみで回答: [["日本のワード","アメリカのワード"], ...]
ペアが無ければ [] と回答。`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    const jpSet = new Set(jpWords);
    const usSet = new Set(usWords);
    return parsed.filter(
      (p): p is [string, string] =>
        Array.isArray(p) &&
        p.length === 2 &&
        jpSet.has(p[0]) &&
        usSet.has(p[1]),
    );
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [jp, us] = await Promise.all([fetchTrends("JP"), fetchTrends("US")]);
    const jpWords = jp.map((t) => t.word);
    const usWords = us.map((t) => t.word);

    const cacheKey = [...jpWords, "|", ...usWords].join(",");
    const cached = memCache.get(cacheKey);
    const pairs =
      cached && cached.exp > Date.now()
        ? cached.pairs
        : await matchPairs(jpWords, usWords);
    if (!cached) memCache.set(cacheKey, { pairs, exp: Date.now() + TTL_MS });

    return NextResponse.json(
      { jp, us, pairs },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
