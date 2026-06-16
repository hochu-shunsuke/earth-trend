import { fetchTrends, type NewsItem, type TrendItem } from "./trends";

// 蓄積スナップショットを「読み取り時に結合(union)」して、取得頻度を上げずに
// 件数を増やす(コスト~0)。各語に発生時刻(firstseen)を付ける。
// Upstash未設定/失敗時は null を返し、呼び出し側がRSSにフォールバックする。

export interface RecentTrendItem extends TrendItem {
  /** 我々が最初に観測した時刻(unix秒)。「燃え始め」の近似(蓄積開始2026-06-13以前は遡れない) */
  firstSeen?: number;
  /** 直近で急上昇セットに居た時刻(unix秒) */
  lastSeen?: number;
}

interface Snapshot {
  ts: number;
  // スナップショットのnewsは「タイトル文字列の配列」(snapshot.mjs)。RSS経路は{title,url,source}。
  items: { word: string; traffic: string; news: (string | NewsItem)[] }[];
}

// news を {title,url,source} 形へ正規化(snapshotは文字列配列なので吸収)
function normNews(raw: (string | NewsItem)[] | undefined): NewsItem[] {
  return (raw ?? []).map((n) => (typeof n === "string" ? { title: n } : n)).filter((n) => n.title);
}

function redisEnv() {
  // Vercel連携は KV_REST_API_* / 手動は UPSTASH_REDIS_REST_* 。両対応
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function trafficNum(t: string): number {
  const n = parseInt(t.replace(/[^0-9]/g, ""), 10) || 0;
  return /万/.test(t) ? n * 10000 : n;
}

/**
 * 直近 ticks 個のスナップショットを union して「直近の急上昇」を返す。
 * 重複語は traffic 最大を採用、lastSeen は最新ts、firstSeen は firstseen ハッシュから。
 */
async function fetchRecentTrends(
  geo: string,
  ticks = 3,
  max = 20,
): Promise<RecentTrendItem[] | null> {
  const env = redisEnv();
  if (!env) return null;
  try {
    const res = await fetch(`${env.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZREVRANGE", `snapshot:${geo}`, "0", String(ticks - 1)], // 新しい順
        ["HGETALL", `firstseen:${geo}`],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { result: unknown }[];

    const snapsRaw = (out[0]?.result as string[]) ?? [];
    if (snapsRaw.length === 0) return null;

    const firstRaw = (out[1]?.result as string[]) ?? []; // [field,val,field,val,...]
    const firstSeen = new Map<string, number>();
    for (let i = 0; i + 1 < firstRaw.length; i += 2) {
      firstSeen.set(firstRaw[i], parseInt(firstRaw[i + 1], 10));
    }

    // snapsRaw は新しい順。先に入れた方(=新しい)の lastSeen/news を優先、traffic は最大
    const byWord = new Map<string, RecentTrendItem & { _tv: number }>();
    for (const raw of snapsRaw) {
      let snap: Snapshot;
      try {
        snap = JSON.parse(raw);
      } catch {
        continue;
      }
      for (const it of snap.items ?? []) {
        const tv = trafficNum(it.traffic);
        const ex = byWord.get(it.word);
        if (!ex) {
          byWord.set(it.word, {
            word: it.word,
            traffic: it.traffic,
            news: normNews(it.news),
            firstSeen: firstSeen.get(it.word),
            lastSeen: snap.ts,
            _tv: tv,
          });
        } else if (tv > ex._tv) {
          ex._tv = tv;
          ex.traffic = it.traffic;
        }
      }
    }

    return [...byWord.values()]
      .sort((a, b) => b._tv - a._tv)
      .slice(0, max) // 件数は最大 max(=20) に制限
      .map((v) => ({
        word: v.word,
        traffic: v.traffic,
        news: v.news,
        firstSeen: v.firstSeen,
        lastSeen: v.lastSeen,
      }));
  } catch {
    return null;
  }
}

/** union を試し、ダメなら RSS にフォールバック(常に配列・失敗時は空)。一覧/各国ページ共通 */
export async function fetchTrendsUnioned(geo: string): Promise<RecentTrendItem[]> {
  try {
    const u = await fetchRecentTrends(geo);
    if (u && u.length) return u;
  } catch {
    /* fall through to RSS */
  }
  try {
    return await fetchTrends(geo);
  } catch {
    return [];
  }
}

import { unstable_cache } from "next/cache";
/** OG画像など用: 1国のunionを10分キャッシュ(毎リクエストでUpstashを叩かない) */
export const getTrendsUnionedCached = unstable_cache(
  (geo: string) => fetchTrendsUnioned(geo),
  ["trends-unioned-og"],
  { revalidate: 600 },
);
