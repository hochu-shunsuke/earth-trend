// 注意の時系列スナップショッター(本体)。Vercelの /api/cron/snapshot から Upstash QStash の
// 定期トリガ(無料・高信頼)で呼ばれる。24カ国のトレンドを並列取得しUpstashに保存し、
// 新規語の翻訳をUIロケール(ja/en/es)へ温める(=ユーザーは原語ではなく訳を見られる)。
// 国ごとのRedis往復は避け、読み取り・保存・翻訳保存をそれぞれ一括pipelineにする。
import { GEO_LABELS, GEO_LANG } from "@/lib/trends";
import { LOCALES } from "@/lib/i18n";

const GEOS = Object.keys(GEO_LABELS);
// 直近の保持数。unionで使うのは直近3件のみ。残りは将来のvelocity可視化用の余白(=~6日@30分)
const KEEP_PER_GEO = 300;
// 1回の warming で温める翻訳の上限と時間予算(route maxDuration 60s 内で打ち切る)。
// gtx(非公式EP)に優しく: 1回30件・各120ms間隔、30分間隔で最大1,440件/日に抑える。
const WARM_CAP = 30; // 1回に温める翻訳の上限(新規語のみ=普段は遥かに下)
const WARM_BUDGET_MS = 33_000; // route内で同期実行(snapshot~3s込みで~36s。QStash 60s以内)
// trim(古いスナップ間引き)は毎回やらず ~10回に1回だけ(Upstashコマンド節約)。間の数件超過は無害
const TRIM_EVERY = 10;

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

interface RedisResult {
  result: unknown;
  error?: string;
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

async function redis(commands: unknown[][]): Promise<RedisResult[]> {
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
  return res.json() as Promise<RedisResult[]>;
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

// 新規語の翻訳をUIロケールへ温める(逐次+sleepでgtxに優しく、WARM_CAP/時間予算で打ち切り)。
// 新規語=未訳前提なので cache-first はしない(読み節約)。再出現語の再訳は無害(同値SET)。
export async function warmTranslations(jobs: WarmJob[]): Promise<number> {
  const deadline = Date.now() + WARM_BUDGET_MS;
  const uniqueJobs = [...new Map(jobs.map((job) => [`${job.src}\0${job.text}`, job])).values()];
  const commands: unknown[][] = [];
  for (const { text, src } of uniqueJobs) {
    if (commands.length >= WARM_CAP || Date.now() > deadline) break;
    for (const to of LOCALES) {
      if (to === src || commands.length >= WARM_CAP || Date.now() > deadline) continue;
      const tr = await translateGoogle(text, to);
      if (tr) {
        commands.push(["SET", `tr2:${src}:${to}:${text}`, tr, "EX", "2592000"]);
      }
      await sleep(120);
    }
  }
  if (commands.length === 0) return 0;
  try {
    const result = await redis(commands);
    const failed = result.filter((entry) => entry.error).length;
    if (failed > 0) console.error(`translation cache: ${failed} pipeline commands failed`);
    return commands.length - failed;
  } catch (e) {
    console.error("translation cache store failed:", (e as Error).message);
    return 0;
  }
}

// 24国のRSSを並列取得し、直前値の取得と全保存は各1回のRedis pipelineにまとめる。
// trimは ~TRIM_EVERY 回に1回だけ(コマンド節約)。
export async function runSnapshot(): Promise<{ ts: number; geos: number; warmJobs: WarmJob[] }> {
  const ts = Math.floor(Date.now() / 1000);
  const doTrim = Math.floor(Date.now() / 1_800_000) % TRIM_EVERY === 0;
  const fetched = await Promise.all(
    GEOS.map(async (geo) => {
      try {
        const items = await fetchTrendsRaw(geo);
        return items.length > 0 ? { geo, items } : null;
      } catch (e) {
        console.error(`skip ${geo}:`, (e as Error).message);
        return null;
      }
    }),
  );
  const snapshots = fetched.filter((entry): entry is { geo: string; items: SnapItem[] } => Boolean(entry));
  if (snapshots.length === 0) return { ts, geos: 0, warmJobs: [] };

  let previous: RedisResult[] = [];
  try {
    previous = await redis(snapshots.map(({ geo }) => ["GET", `latest:${geo}`]));
  } catch (e) {
    // 保存は続ける。直前値が読めない場合は全件を新規候補として扱うが、後段の上限で抑制される。
    console.error("latest snapshot read failed:", (e as Error).message);
  }

  const storeCommands: unknown[][] = [];
  const warmJobs: WarmJob[] = [];
  snapshots.forEach(({ geo, items }, index) => {
    const prevWords = new Set<string>();
    const raw = previous[index]?.result;
    if (typeof raw === "string") {
      try {
        const prev = JSON.parse(raw) as { items?: SnapItem[] };
        for (const item of prev.items ?? []) prevWords.add(item.word);
      } catch {}
    }

    const snapshot = JSON.stringify({ ts, items });
    storeCommands.push(
      ["ZADD", `snapshot:${geo}`, String(ts), snapshot],
      ["SET", `latest:${geo}`, snapshot],
    );
    if (doTrim) {
      storeCommands.push(["ZREMRANGEBYRANK", `snapshot:${geo}`, "0", String(-KEEP_PER_GEO - 1)]);
    }

    const src = GEO_LANG[geo] ?? "auto";
    for (const item of items) {
      if (prevWords.has(item.word)) continue;
      if (item.word) warmJobs.push({ text: item.word, src });
      for (const news of item.news) {
        const text = news.title.slice(0, 200).trim();
        if (text) warmJobs.push({ text, src });
      }
    }
  });

  const stored = await redis(storeCommands);
  const failed = stored.filter((entry) => entry.error).length;
  if (failed > 0) throw new Error(`${failed} snapshot pipeline commands failed`);

  const uniqueWarmJobs = [
    ...new Map(warmJobs.map((job) => [`${job.src}\0${job.text}`, job])).values(),
  ];
  return { ts, geos: snapshots.length, warmJobs: uniqueWarmJobs };
}
