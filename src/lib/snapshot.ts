// 注意の時系列スナップショッター(本体)。Vercelの /api/cron/snapshot から Upstash QStash の
// 定期トリガ(無料・高信頼)で呼ばれる。24カ国のRSSを並列取得し、前回状態とrunning unionして
// world:v1 に1回で書く(lib/world.ts)。Upstashコマンドは1サイクルあたり4つだけ。
//
// 2026-09-11: 英語1本化で翻訳の温めは廃止。gtxへの定期アクセスも消えた。
import { GEO_LABELS, type TrendItem } from "@/lib/trends";
import { mergeGeo, readWorldForSnapshot, writeWorld, type World, type WorldItem } from "@/lib/world";

const GEOS = Object.keys(GEO_LABELS);


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
 * 1サイクル実行する。
 * minIntervalSec を渡すと「前回の保存から十分経っていなければ何もしない」= 実行間隔の番人になる。
 * 壁時計の剰余で間引くと、配信が遅れて次のバケットに落ちた回がまるごと欠落する
 * (しかも200を返すので再試行もされない)。前回の保存時刻を基準にすれば、
 * 遅延しても次の配信で復帰する。
 */
export async function runSnapshot(opts: { minIntervalSec?: number } = {}): Promise<{
  ts: number;
  geos: number;
  items: number;
  skipped?: true;
  sinceLastSec?: number;
}> {
  const ts = Math.floor(Date.now() / 1000);
  const prev = await readWorldForSnapshot(); // 1 GET

  const minInterval = opts.minIntervalSec ?? 0;
  if (minInterval > 0 && prev?.ts && ts - prev.ts < minInterval) {
    return { ts, geos: 0, items: 0, skipped: true, sinceLastSec: ts - prev.ts };
  }

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
  if (live === 0) return { ts, geos: 0, items: 0 };

  const world: World = { ts, geos };
  if (!(await writeWorld(world))) throw new Error("world write failed");

  const items = Object.values(geos).reduce((n, list) => n + list.length, 0);
  return { ts, geos: live, items };
}
