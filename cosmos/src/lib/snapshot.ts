// 注意の時系列スナップショッター(本体)。Vercelの /api/cron/snapshot から Upstash QStash の
// 定期トリガ(無料・高信頼)で呼ばれる。GitHub Actionsのcronはスケジュールが不安定(遅延/ドロップ)で
// "live"データに不向きだったため移行。9カ国のトレンドを並列取得しUpstashに保存する。
import { GEO_LABELS } from "@/lib/trends";

const GEOS = Object.keys(GEO_LABELS);
// 直近の保持数。unionで使うのは直近3件のみ。残りは将来のvelocity可視化用の余白(=~6日)
const KEEP_PER_GEO = 300;

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

async function redis(commands: unknown[][]) {
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

async function snapshotGeo(geo: string, ts: number): Promise<string> {
  let items: SnapItem[];
  try {
    items = await fetchTrendsRaw(geo);
  } catch (e) {
    return `${geo}: skip (${(e as Error).message})`;
  }
  if (items.length === 0) return `${geo}: 0 items`;
  const snapshot = JSON.stringify({ ts, items });
  await redis([
    ["ZADD", `snapshot:${geo}`, String(ts), snapshot],
    ["ZREMRANGEBYRANK", `snapshot:${geo}`, "0", String(-KEEP_PER_GEO - 1)],
    ["SET", `latest:${geo}`, snapshot],
  ]);
  return `${geo}: ${items.length}`;
}

// 9国を並列にスナップショット。1国の失敗は他に波及しない。
export async function runSnapshot(): Promise<{ ts: number; results: string[] }> {
  const ts = Math.floor(Date.now() / 1000);
  const results = await Promise.all(GEOS.map((g) => snapshotGeo(g, ts)));
  return { ts, results };
}
