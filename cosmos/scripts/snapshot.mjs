// 注意の時系列を蓄積するスナップショッター。
// GitHub Actions から30分ごとに実行され、9カ国のトレンドをUpstash Redisに保存する。
// 依存ゼロ(Node 18+ の組み込み fetch のみ)。RSSは軽量に正規表現でパースする。
//
// ★無料運用の制約: PRIVATEリポのActions無料枠は2000分/月、かつ1ジョブは分単位で切り上げ課金。
//   そこで1ジョブを1分未満に抑えるため (a)9国を並列取得 (b)翻訳warmingはcronから外す。
//   翻訳は閲覧時のlive-fill(/api/translate, rate-limited・自己キャッシュ)が担う。
//   手動の一括温めが要るときは scripts/warm-translations.mjs を使う。
//
// 必要な環境変数(GitHub Secrets):
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (KV_REST_API_* でも可)

const GEOS = ["JP", "US", "GB", "IN", "KR", "TW", "DE", "FR", "BR"];

// 直近どれだけのスナップショットを保持するか。古いものは間引く(ストレージ一定)。
// unionで使うのは直近3件のみ。残りは将来のvelocity/ライフサイクル可視化用の余白。
// 1スナップ~7KB×9国なので 2000だと~126MB(無料256MBの約半分)→ 300(=30分間隔で約6日)に圧縮。
const KEEP_PER_GEO = 300;

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function parseRss(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/);
    if (!title) continue;
    const traffic = block.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/);
    // pubDate = そのトレンドの「燃え始め」(unix秒)。色付け/新しさ選抜に使う(観測時刻より正確)
    const pub = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const pubMs = pub ? Date.parse(decode(pub[1])) : NaN;
    const firstSeen = Number.isFinite(pubMs) ? Math.floor(pubMs / 1000) : undefined;
    // news_item ブロック単位で title/url/source をまとめて拾う(URLを残す=記事リンク化)
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

async function fetchTrends(geo) {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; earth-trend-snapshot)" },
  });
  if (!res.ok) throw new Error(`trends ${geo} ${res.status}`);
  return parseRss(await res.text());
}

async function redis(commands) {
  // Vercel連携は KV_REST_API_* 形式、手動は UPSTASH_REDIS_REST_* 形式。両対応
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis REST env vars missing");
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}: ${await res.text()}`);
  return res.json();
}

async function snapshotGeo(geo, ts) {
  let items;
  try {
    items = await fetchTrends(geo);
  } catch (e) {
    console.error(`skip ${geo}:`, e.message);
    return;
  }
  if (items.length === 0) {
    console.log(`${geo}: 0 items, skip`);
    return;
  }
  const snapshot = JSON.stringify({ ts, items });
  try {
    await redis([
      // 時系列(score=unix秒)。同秒衝突を避けるためmemberにtsを内包
      ["ZADD", `snapshot:${geo}`, String(ts), snapshot],
      // 古いスナップショットを間引いてストレージを一定に保つ
      ["ZREMRANGEBYRANK", `snapshot:${geo}`, "0", String(-KEEP_PER_GEO - 1)],
      // 便利な最新値
      ["SET", `latest:${geo}`, snapshot],
    ]);
    console.log(`${geo}: stored ${items.length} items`);
  } catch (e) {
    console.error(`store ${geo} failed:`, e.message);
  }
}

async function main() {
  const ts = Math.floor(Date.now() / 1000);
  // 9国を並列実行=1ジョブを短く保つ(Actions無料枠対策)。1国の失敗は他に波及しない
  await Promise.all(GEOS.map((geo) => snapshotGeo(geo, ts)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
