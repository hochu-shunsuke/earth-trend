// 世界の状態を「1個のキー」で持つ層。
//
// 設計の要点: このデータはDBワークロードではなく「30分ごとに書き換わる1個のJSON」である。
// 以前は 24国 × 3ティックのZSET + 語ごとの翻訳キー に分解していたため、閲覧1回あたり
// 数十〜数百のUpstashコマンドが出ていた(無料枠500K/月の37%を無人で消費)。
// ここでは世界全体を world:v1 に畳み、翻訳も同じblobに焼き込む:
//   - 書き込み: 1サイクル SET 1回(+細い履歴のRPUSH)
//   - 読み取り: unstable_cache の再計算時に GET 1回。国別/ロケール別の追加読みは発生しない
//
// 2026-09-11: 英語1本化に伴い、自前の翻訳(tr)はblobごと廃止した。読者の母国語への変換は
// ブラウザのGoogle翻訳に任せる。トレンド語は translate="no" で保護してあるので原語は残る。

import { unstable_cache } from "next/cache";
import { GEO_LABELS, fetchTrends, type NewsItem, type TrendItem } from "@/lib/trends";
import { redisPipeline } from "@/lib/redis";
import { TRENDS_DATA_CACHE_TAG } from "@/lib/cache-tags";

export const WORLD_KEY = "world:v1";
/** 細い履歴(velocity可視化用の余白)の保持期間。newsを落としているので容量は本体の約1/5 */
const HIST_TTL_SEC = 30 * 24 * 3600;

/** 1国あたりの表示件数。RSSの急上昇は各国20件程度なので同数 */
export const MAX_ITEMS = 20;
/** 失速した語を減衰させる半減期。最新=1.0 / 30分前=0.5 / 60分前=0.25 */
const HALF_LIFE_SEC = 1800;
/** これ以上見かけない語はrunning unionから落とす(古い語が居座らないように) */
const STALE_SEC = 6 * 3600;

export type WorldNews = NewsItem;
export interface WorldItem {
  word: string;
  traffic: string;
  news: WorldNews[];
  /** 燃え始め(RSSのpubDate, unix秒)。無ければ初回観測時刻 */
  firstSeen?: number;
  /** 直近で急上昇セットに居た時刻(unix秒)。減衰スコアの起点 */
  lastSeen?: number;
}
export interface World {
  ts: number;
  geos: Record<string, WorldItem[]>;
}

export function trafficNum(t: string): number {
  const n = parseInt(t.replace(/[^0-9]/g, ""), 10) || 0;
  return /万/.test(t) ? n * 10000 : n;
}

/**
 * 前回の状態と今回のRSSを running union する。
 * 旧実装の「直近3ティックをunion」と狙いは同じだが、前回blobを土台にするので
 * 追加の読み取りが要らない。減衰スコアで上位MAX_ITEMSに絞るため、3ティック窓と
 * ほぼ同じ振る舞いになる(30分で半減=90分後には事実上落ちる)。
 */
export function mergeGeo(prev: WorldItem[], fresh: TrendItem[], ts: number): WorldItem[] {
  const byWord = new Map<string, WorldItem>();
  // 前回分を土台に置く(lastSeenは据え置き=ここから減衰する)。
  // フィールドは明示的に選ぶ: spreadだと旧スキーマの残骸(英語1本化で廃止した tr など)が
  // blobに載り続け、クライアントへも送られてしまう。ここで落とせば1サイクルで形が揃う。
  for (const it of prev) {
    byWord.set(it.word, {
      word: it.word,
      traffic: it.traffic,
      news: it.news.map((n) => ({ title: n.title, url: n.url, source: n.source })),
      firstSeen: it.firstSeen,
      lastSeen: it.lastSeen,
    });
  }

  for (const f of fresh) {
    const news: WorldNews[] = f.news.map((n) => ({ title: n.title, url: n.url, source: n.source }));
    const ex = byWord.get(f.word);
    if (!ex) {
      byWord.set(f.word, {
        word: f.word,
        traffic: f.traffic,
        news,
        firstSeen: f.firstSeen ?? ts,
        lastSeen: ts,
      });
      continue;
    }
    if (trafficNum(f.traffic) > trafficNum(ex.traffic)) ex.traffic = f.traffic;
    const fs = f.firstSeen ?? ts;
    if (fs < (ex.firstSeen ?? Infinity)) ex.firstSeen = fs;
    ex.lastSeen = ts;
    ex.news = news; // 見出しは常に最新を採用
  }

  return [...byWord.values()]
    .filter((it) => ts - (it.lastSeen ?? ts) <= STALE_SEC)
    .map((it) => ({
      it,
      score:
        trafficNum(it.traffic) *
        Math.pow(0.5, Math.max(0, (ts - (it.lastSeen ?? ts)) / HALF_LIFE_SEC)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ITEMS)
    .map(({ it }) => it);
}

/** 履歴に落とす細い形。newsを捨てるので容量は本体の約1/5。velocity可視化にはこれで足りる */
function slimHistory(world: World) {
  return {
    ts: world.ts,
    geos: Object.fromEntries(
      Object.entries(world.geos).map(([g, items]) => [
        g,
        items.map((it) => ({ w: it.word, t: it.traffic, f: it.firstSeen })),
      ]),
    ),
  };
}

async function readWorld(): Promise<World | null> {
  const out = await redisPipeline([["GET", WORLD_KEY]]);
  const raw = out?.[0]?.result;
  if (typeof raw !== "string") return null;
  try {
    const w = JSON.parse(raw) as World;
    return w && w.geos ? w : null;
  } catch {
    return null;
  }
}

/**
 * 本体のSETと、細い履歴のRPUSHを1リクエストで送る。
 * 成否は本体のSETだけで判定する: 履歴は「将来の可視化のための余白」なので、そこが失敗しても
 * スナップショット自体を落とさない(履歴のためにライブのデータを止めない)。
 * EXPIRE は毎回張り直す = その日のキーは最終書き込みから HIST_TTL_SEC で消える。
 */
export async function writeWorld(world: World): Promise<boolean> {
  const day = new Date(world.ts * 1000).toISOString().slice(0, 10);
  const out = await redisPipeline([
    ["SET", WORLD_KEY, JSON.stringify(world)],
    ["RPUSH", `hist:${day}`, JSON.stringify(slimHistory(world))],
    ["EXPIRE", `hist:${day}`, String(HIST_TTL_SEC)],
  ]);
  if (!out) return false;
  const histError = out[1]?.error ?? out[2]?.error;
  if (histError) console.error("history write failed (non-fatal):", histError);
  return !out[0]?.error;
}

/** Upstash未設定/未蓄積時のフォールバック。RSSを直接引く(訳なし・firstSeenはpubDate) */
async function worldFromRss(): Promise<World> {
  const ts = Math.floor(Date.now() / 1000);
  const entries = await Promise.all(
    Object.keys(GEO_LABELS).map(async (geo): Promise<[string, WorldItem[]]> => {
      try {
        const items = await fetchTrends(geo);
        return [
          geo,
          items.slice(0, MAX_ITEMS).map((it) => ({
            word: it.word,
            traffic: it.traffic,
            news: it.news,
            firstSeen: it.firstSeen,
            lastSeen: ts,
          })),
        ];
      } catch {
        return [geo, []];
      }
    }),
  );
  return { ts, geos: Object.fromEntries(entries) };
}

/**
 * 閲覧側の唯一の入口。全ページ・全ロケール・全国がこの1エントリを共有するので、
 * どこを見ても「同じ瞬間」になる。更新の主経路はsnapshot完了時のタグ失効で、
 * revalidate:3600 は cron が止まったときの安全網。
 */
export const getWorld = unstable_cache(
  async (): Promise<World> => (await readWorld()) ?? (await worldFromRss()),
  ["world-v1"],
  { revalidate: 3600, tags: [TRENDS_DATA_CACHE_TAG] },
);

/** snapshot側が使う生読み(キャッシュを挟まない) */
export const readWorldForSnapshot = readWorld;
