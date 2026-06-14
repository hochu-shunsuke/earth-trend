// 一度きりのバックフィル: 既存の急上昇語を ja/en に訳して翻訳キャッシュ(tr2:)を温める。
// cron(snapshot.mjs)は新規語だけ温めるので、既存バックログをこれで埋める。
// 実行: cosmos で `set -a; . ./.env.local; set +a; node scripts/warm-translations.mjs`

const GEOS = ["JP", "US", "GB", "IN", "KR", "TW", "DE", "FR", "BR"];
const GEO_LANG = {
  JP: "ja", US: "en", GB: "en", IN: "en", KR: "ko",
  TW: "zh-TW", DE: "de", FR: "fr", BR: "pt-BR",
};
const UI_LOCALES = ["ja", "en"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const URL_BASE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
if (!URL_BASE || !TOKEN) {
  console.error("Redis REST env vars missing");
  process.exit(1);
}

async function redis(commands) {
  const res = await fetch(`${URL_BASE}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  return res.json();
}

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

async function main() {
  const words = new Map(); // geoLang -> Set(words)
  for (const geo of GEOS) {
    try {
      // 直近3スナップショット(各国ページのunionと同じ範囲)の語をすべて温める
      const r = await redis([["ZREVRANGE", `snapshot:${geo}`, "0", "2"]]);
      const snaps = r?.[0]?.result ?? [];
      const lang = GEO_LANG[geo];
      if (!words.has(lang)) words.set(lang, new Set());
      for (const rawSnap of snaps) {
        try {
          const snap = JSON.parse(rawSnap);
          for (const it of snap.items ?? []) words.get(lang).add(it.word);
        } catch {}
      }
    } catch (e) {
      console.error(`read ${geo}:`, e.message);
    }
  }

  let warmed = 0;
  let skipped = 0;
  for (const [from, set] of words) {
    for (const word of set) {
      for (const to of UI_LOCALES) {
        if (to === from) continue;
        const key = `tr2:${from}:${to}:${word}`;
        const got = await redis([["GET", key]]);
        if (got?.[0]?.result) {
          skipped++;
          continue;
        }
        const tr = await translateGoogle(word, to);
        if (tr) {
          await redis([["SET", key, tr, "EX", "2592000"]]);
          warmed++;
          await sleep(120);
        }
      }
    }
  }
  console.log(`done: warmed ${warmed}, already-cached ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
