// 注意の時系列スナップショッター(本体)。Vercelの /api/cron/snapshot から Upstash QStash の
// 定期トリガ(無料・高信頼)で呼ばれる。24カ国のRSSを並列取得し、前回状態とrunning unionして
// world:v1 に1回で書く(lib/world.ts)。翻訳も同じblobに焼き込むので、温めはRedisを一切叩かない。
import { GEO_LABELS, type TrendItem } from "@/lib/trends";
import {
  collectWarmJobs,
  mergeGeo,
  readWorldForSnapshot,
  writeWorld,
  type WarmJob,
  type World,
  type WorldItem,
} from "@/lib/world";

const GEOS = Object.keys(GEO_LABELS);

// 1回のwarmingで gtx を叩く上限と時間予算(route maxDuration 60s 内で打ち切る)。
// ★ 上限は「実呼び出し回数」を数える。以前は成功数を数えていたため、訳が原語と同じになる語
//   (固有名詞=トレンド語では常態)が続くと上限に達せず、deadlineまで回り続けて実呼び出しが
//   想定の4〜6倍になっていた。
const WARM_MAX_ATTEMPTS = 40;
const WARM_BUDGET_MS = 30_000; // snapshot(~3s)込みで ~33s。QStashのendpoint timeout 60s以内

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

function parseRss(xml: string): TrendItem[] {
  const items: TrendItem[] = [];
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

async function fetchTrendsRaw(geo: string): Promise<TrendItem[]> {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; earth-trend-snapshot)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`trends ${geo} ${res.status}`);
  return parseRss(await res.text());
}

/**
 * Googleの無料翻訳EP(キー不要)。戻り値の意味を3つに分ける:
 *   文字列 : 訳
 *   ""     : 訳が原語と同じ = 「訳不要」と確定(固有名詞など)。呼び出し側は再試行しない
 *   null   : 通信/解析の失敗。次サイクルで再試行する
 */
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
    if (!out) return null;
    return out.toLowerCase() === text.toLowerCase() ? "" : out;
  } catch {
    return null;
  }
}

/**
 * 未解決の訳スロットを予算内で埋める。結果は job.apply 経由で world オブジェクトへ直接書かれ、
 * 呼び出し側が world ごと1回のSETで永続化する(=Redisコマンドを消費しない)。
 * 埋まらなかった分はblobに undefined のまま残り、次サイクルで再び対象になる。
 */
export async function warmTranslations(jobs: WarmJob[]): Promise<{ attempted: number; filled: number }> {
  const deadline = Date.now() + WARM_BUDGET_MS;
  let attempted = 0;
  let filled = 0;
  for (const job of jobs) {
    if (attempted >= WARM_MAX_ATTEMPTS || Date.now() > deadline) break;
    attempted++;
    const tr = await translateGoogle(job.text, job.to);
    await sleep(120); // gtxに優しく(非公式EP。共有egress IPごとブロックされるのを避ける)
    if (tr === null) continue; // 失敗は未解決のまま残す=次サイクルで再試行
    for (const apply of job.apply) apply(tr);
    if (tr) filled++;
  }
  return { attempted, filled };
}

export async function runSnapshot(): Promise<{
  ts: number;
  geos: number;
  attempted: number;
  filled: number;
  pending: number;
}> {
  const ts = Math.floor(Date.now() / 1000);
  const prev = await readWorldForSnapshot(); // 1 GET

  const fetched = await Promise.all(
    GEOS.map(async (geo) => {
      try {
        return { geo, items: await fetchTrendsRaw(geo) };
      } catch (e) {
        console.error(`skip ${geo}:`, (e as Error).message);
        return { geo, items: null };
      }
    }),
  );

  const geos: Record<string, WorldItem[]> = {};
  let live = 0;
  for (const { geo, items } of fetched) {
    const prevItems = prev?.geos?.[geo] ?? [];
    if (items === null) {
      // 取得失敗した国は前回状態を据え置く(消さない)。次サイクルで復帰する
      geos[geo] = prevItems;
      continue;
    }
    live++;
    geos[geo] = mergeGeo(prevItems, items, ts);
  }
  if (live === 0) return { ts, geos: 0, attempted: 0, filled: 0, pending: 0 };

  const world: World = { ts, geos };

  // 訳はblobに焼き込むので、温めてから書く(順序が逆だと1サイクル分遅れる)
  const jobs = collectWarmJobs(world);
  const { attempted, filled } = await warmTranslations(jobs);

  if (!(await writeWorld(world))) throw new Error("world write failed");

  return { ts, geos: live, attempted, filled, pending: Math.max(0, jobs.length - attempted) };
}
