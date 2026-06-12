import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_GEO, fetchTrends } from "@/lib/trends";

// ワード単位のメモリキャッシュ(6時間)。Fluid Computeはインスタンスを共有するため有効に効く。
// CDN側にも s-maxage を付けるので、生成回数は「国×ワード×6時間に1回」が上限になる
const memCache = new Map<string, { summary: string; exp: number }>();
const TTL_MS = 6 * 60 * 60 * 1000;

async function getNewsTitles(geo: string, word: string): Promise<string[]> {
  try {
    const items = await fetchTrends(geo);
    const hit = items.find((it) => it.word === word);
    if (!hit) return [];
    return hit.news.map((n) => n.title).filter((t) => t.length > 0).slice(0, 3);
  } catch {
    return [];
  }
}

async function generateSummary(
  word: string,
  titles: string[],
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  // 見出しが何語でも解説は日本語で返す(海外トレンドを日本語で読めるのが価値)
  const prompt = `検索ワード「${word}」が今急上昇しています。以下のニュース見出しを根拠に、なぜ急上昇しているのかを日本語1文(60字以内)で説明してください。前置きや引用符は不要、説明文のみ。\n\n${titles.join("\n")}`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
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
}

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word")?.trim();
  const geoRaw = req.nextUrl.searchParams.get("geo")?.toUpperCase() ?? "JP";
  const geo = ALLOWED_GEO.has(geoRaw) ? geoRaw : "JP";
  if (!word || word.length > 100) {
    return NextResponse.json({ error: "bad word" }, { status: 400 });
  }

  const cacheKey = `${geo}:${word}`;
  const cached = memCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return NextResponse.json(
      { summary: cached.summary, cached: true },
      { headers: { "Cache-Control": "public, s-maxage=21600" } },
    );
  }

  // トレンドRSS由来のニュース見出しが無いワード(サジェスト等)は生成しない=コスト制御
  const titles = await getNewsTitles(geo, word);
  if (titles.length === 0) {
    return NextResponse.json(
      { summary: null },
      { headers: { "Cache-Control": "public, s-maxage=3600" } },
    );
  }

  const summary = await generateSummary(word, titles);
  if (summary) {
    memCache.set(cacheKey, { summary, exp: Date.now() + TTL_MS });
  }

  return NextResponse.json(
    { summary },
    { headers: { "Cache-Control": "public, s-maxage=21600" } },
  );
}
