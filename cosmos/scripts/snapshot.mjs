// 注意の時系列を蓄積するスナップショッター。
// GitHub Actions から30分ごとに実行され、9カ国のトレンドをUpstash Redisに保存する。
// 依存ゼロ(Node 18+ の組み込み fetch のみ)。RSSは軽量に正規表現でパースする。
//
// 必要な環境変数(GitHub Secrets):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

const GEOS = ["JP", "US", "GB", "IN", "KR", "TW", "DE", "FR", "BR"];

// 翻訳の原文言語(その国の主要言語)。UIロケール(ja/en)へ訳してキャッシュを温める
const GEO_LANG = {
  JP: "ja", US: "en", GB: "en", IN: "en", KR: "ko",
  TW: "zh-TW", DE: "de", FR: "fr", BR: "pt-BR",
};
const UI_LOCALES = ["ja", "en"];
// 1回の実行で温める翻訳の上限(Google無料EPに優しく)。語+ニュース見出しを相乗りで温めるので
// 少し広め。逐次+sleepで叩くので一括バーストにはならない。超過分は新規語が出た次回以降で
const WARM_CAP = 120;

// 直近どれだけのスナップショットを保持するか(30分間隔で約6週間)。古いものは間引く
const KEEP_PER_GEO = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Googleの無料翻訳EP(キー不要)。lib/translate.ts と同じキー(tr2:from:to:text)に貯める
async function translateGoogle(text, to) {
  try {
    const url =
      `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto` +
      `&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; earth-trend)" } });
    if (!res.ok) return null;
    const data = await res.json();
    const segs = data?.[0];
    if (!Array.isArray(segs)) return null;
    const out = segs.map((s) => (Array.isArray(s) ? String(s[0] ?? "") : "")).join("").trim();
    if (!out || out.toLowerCase() === text.toLowerCase()) return null;
    return out;
  } catch {
    return null;
  }
}

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

async function main() {
  const now = Date.now();
  const ts = Math.floor(now / 1000);
  let warmed = 0; // この実行で温めた翻訳数(WARM_CAPで上限)

  for (const geo of GEOS) {
    let items;
    try {
      items = await fetchTrends(geo);
    } catch (e) {
      console.error(`skip ${geo}:`, e.message);
      continue;
    }
    if (items.length === 0) {
      console.log(`${geo}: 0 items, skip`);
      continue;
    }

    const snapshot = JSON.stringify({ ts, items });
    const cmds = [
      // 時系列(score=unix秒)。同秒衝突を避けるためmemberにtsを内包
      ["ZADD", `snapshot:${geo}`, String(ts), snapshot],
      // 古いスナップショットを間引いてストレージを一定に保つ
      ["ZREMRANGEBYRANK", `snapshot:${geo}`, "0", String(-KEEP_PER_GEO - 1)],
      // 便利な最新値
      ["SET", `latest:${geo}`, snapshot],
    ];
    // 各ワードの初出時刻(velocity/「燃え始めた時刻」用)。既存は上書きしない
    for (const it of items) {
      cmds.push(["HSETNX", `firstseen:${geo}`, it.word, String(ts)]);
    }

    let res;
    try {
      res = await redis(cmds);
      console.log(`${geo}: stored ${items.length} items`);
    } catch (e) {
      console.error(`store ${geo} failed:`, e.message);
      continue;
    }

    // 新規語(HSETNXが1=初出)だけを ja/en に温める(コスト最小・放置で回る)。語そのものに加えて
    // その語のニュース見出し(なぜ流行ってるか)も温める → 国別/analysisのNewsTitleは「キャッシュを
    // 読むだけ」になり、ユーザーが何人来ても非公式翻訳EPを叩かない(=スケールしてもブロックされない)。
    // 一括並列(Promise.all)は使わず、逐次+sleep+WARM_CAPで差分だけドリップする。
    const geoLang = GEO_LANG[geo];
    for (let i = 0; i < items.length && warmed < WARM_CAP; i++) {
      if (res?.[3 + i]?.result !== 1) continue; // 既出語は skip(新規語の初出時だけ温める=差分)
      const it = items[i];
      // ニュース見出しは client(/api/translate)が q を200字に切るのでキーを揃える
      const targets = [it.word, ...it.news.map((n) => n.title.slice(0, 200).trim())];
      for (const text of targets) {
        if (!text) continue;
        for (const to of UI_LOCALES) {
          if (to === geoLang || warmed >= WARM_CAP) continue;
          const tr = await translateGoogle(text, to);
          if (tr) {
            try {
              await redis([["SET", `tr2:${geoLang}:${to}:${text}`, tr, "EX", "2592000"]]);
            } catch {}
            warmed++;
            await sleep(150);
          }
        }
      }
    }
  }
  if (warmed) console.log(`warmed ${warmed} translations`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
