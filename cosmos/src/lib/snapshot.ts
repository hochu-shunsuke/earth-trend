// 注意の時系列スナップショッター(本体)。Vercelの /api/cron/snapshot から Upstash QStash の
// 定期トリガ(無料・高信頼)で呼ばれる。9〜24カ国のトレンドを並列取得しUpstashに保存し、
// 新規語の翻訳をUIロケール(ja/en/es)へ温める(=ユーザーは原語ではなく訳を見られる)。
// GitHub Actionsは分単位課金で warming を載せられなかったが、QStash+Vercel(実行時間課金)に
// 移行したので warming を復活。route側は snapshot を即応答し warming は after() で背景実行する
// (QStashのタイムアウト/リトライを避けるため)。
import { GEO_LABELS, GEO_LANG } from "@/lib/trends";
import { LOCALES } from "@/lib/i18n";

const GEOS = Object.keys(GEO_LABELS);
// 直近の保持数。unionで使うのは直近3件のみ。残りは将来のvelocity可視化用の余白(=~6日@15分)
const KEEP_PER_GEO = 300;
// 1回の warming で温める翻訳の上限と時間予算(route maxDuration 60s 内で打ち切る)。
// gtx(非公式EP)に優しく: 1回60件・各120ms間隔=warming中は約1.3/s・最大~5,760件/日に抑える。
const WARM_CAP = 60; // 1回に実際にgtxを叩く上限(未キャッシュ分のみ)
const WARM_WINDOW = 100; // cache-firstで存在チェックする候補数(=Upstash読みの上限/回)
const WARM_BUDGET_MS = 40_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SnapNews {
  title: string;
  url?: string;
  source?: string;
}
interface SnapItem {
  word: string;
  traffic: string;
  news: SnapNews[];
  firstSeen?: number; // RSSのpubDate(燃え始め, unix秒)
}
interface WarmJob {
  text: string;
  src: string;
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function parseRss(xml: string): SnapItem[] {
  const items: SnapItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/);
    if (!title) continue;
    const traffic = block.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/);
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const pubMs = pub ? Date.parse(decode(pub[1])) : NaN;
    const firstSeen = Number.isFinite(pubMs) ? Math.floor(pubMs / 1000) : undefined;
    const news = [...block.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)]
      .map((ni) => {
        const b = ni[1];
        const t = b.match(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/);
        const u = b.match(/<ht:news_item_url>([\s\S]*?)<\/ht:news_item_url>/);
        const s = b.match(/<ht:news_item_source>([\s\S]*?)<\/ht:news_item_source>/);
        return {
          title: t ? decode(t[1]) : "",
          url: u ? decode(u[1]) : undefined,
          source: s ? decode(s[1]) : undefined,
        };
      })
      .filter((n) => n.title)
      .slice(0, 3);
    items.push({
      word: decode(title[1]),
      traffic: traffic ? decode(traffic[1]) : "",
      news,
      firstSeen,
    });
  }
  return items;
}

async function fetchTrendsRaw(geo: string): Promise<SnapItem[]> {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; earth-trend-snapshot)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`trends ${geo} ${res.status}`);
  return parseRss(await res.text());
}

async function redis(commands: unknown[][]): Promise<{ result: unknown }[] | null> {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis REST env vars missing");
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  return res.json();
}

// Googleの無料翻訳EP(キー不要)。lib/translate.ts と同じキー(tr2:from:to:text)に貯める
async function translateGoogle(text: string, to: string): Promise<string | null> {
  try {
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto` +
      `&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; earth-trend)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown[];
    const segs = data?.[0];
    if (!Array.isArray(segs)) return null;
    const out = segs
      .map((s) => (Array.isArray(s) ? String(s[0] ?? "") : ""))
      .join("")
      .trim();
    if (!out || out.toLowerCase() === text.toLowerCase()) return null;
    return out;
  } catch {
    return null;
  }
}

// 1国: RSS取得→直前latestと比較し新規語を出す→保存→新規語+見出しを温め候補として返す
async function snapshotGeo(geo: string, ts: number): Promise<WarmJob[]> {
  let items: SnapItem[];
  try {
    items = await fetchTrendsRaw(geo);
  } catch (e) {
    console.error(`skip ${geo}:`, (e as Error).message);
    return [];
  }
  if (items.length === 0) return [];

  const snapshot = JSON.stringify({ ts, items });
  try {
    await redis([
      ["ZADD", `snapshot:${geo}`, String(ts), snapshot],
      ["ZREMRANGEBYRANK", `snapshot:${geo}`, "0", String(-KEEP_PER_GEO - 1)],
      ["SET", `latest:${geo}`, snapshot],
    ]);
  } catch (e) {
    console.error(`store ${geo} failed:`, (e as Error).message);
    return [];
  }

  // 現在の全項目(語+見出し)を温め候補に。warming側で cache-first により未訳だけ叩く
  // (=既存バックログも埋まる)。見出しは client/api/translate と同じ200字キーに揃える。
  const src = GEO_LANG[geo] ?? "auto";
  const jobs: WarmJob[] = [];
  for (const it of items) {
    if (it.word) jobs.push({ text: it.word, src });
    for (const n of it.news) {
      const t = n.title.slice(0, 200).trim();
      if (t) jobs.push({ text: t, src });
    }
  }
  return jobs;
}

// 現在の項目の翻訳をUIロケールへ温める。cache-first(未訳だけgtxを叩く)+毎回ランダムな窓を
// 取りローテーションで全体をカバー(=既存バックログも埋まる)。読みは WARM_WINDOW/回、gtxは
// WARM_CAP/回・各120ms間隔で抑える。route の after() で背景実行される(応答は即返す)。
export async function warmTranslations(jobs: WarmJob[]): Promise<number> {
  // (text, src, to) に展開(targetはUIロケールでsrcと異なるもの)
  const cands: { key: string; text: string; to: string }[] = [];
  for (const { text, src } of jobs) {
    for (const to of LOCALES) {
      if (to === src) continue;
      cands.push({ key: `tr2:${src}:${to}:${text}`, text, to });
    }
  }
  if (cands.length === 0) return 0;

  // ランダム開始のローテーション窓(毎回違う部分を見る=全体を時間で網羅)
  const start = Math.floor(Math.random() * cands.length);
  const window: typeof cands = [];
  for (let i = 0; i < WARM_WINDOW && i < cands.length; i++) {
    window.push(cands[(start + i) % cands.length]);
  }

  // cache-first: まとめて存在チェック(1パイプライン=Upstash読みを窓サイズに固定)
  let got: { result: unknown }[] | null = null;
  try {
    got = await redis(window.map((c) => ["GET", c.key]));
  } catch {}

  const deadline = Date.now() + WARM_BUDGET_MS;
  let warmed = 0;
  for (let i = 0; i < window.length; i++) {
    if (warmed >= WARM_CAP || Date.now() > deadline) break;
    if (got?.[i]?.result) continue; // 既にキャッシュ済み=gtxを叩かない
    const tr = await translateGoogle(window[i].text, window[i].to);
    if (tr) {
      try {
        await redis([["SET", window[i].key, tr, "EX", "2592000"]]);
      } catch {}
      warmed++;
      await sleep(120);
    }
  }
  return warmed;
}

// 9〜24国を並列にスナップショット。返り値の warmJobs を route が after() で温める。
export async function runSnapshot(): Promise<{ ts: number; geos: number; warmJobs: WarmJob[] }> {
  const ts = Math.floor(Date.now() / 1000);
  const perGeo = await Promise.all(GEOS.map((g) => snapshotGeo(g, ts)));
  return { ts, geos: GEOS.length, warmJobs: perGeo.flat() };
}
