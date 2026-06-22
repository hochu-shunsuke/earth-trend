// 一度きりのバックフィル: 既存の急上昇語+ニュース見出しを ja/en/es に訳して翻訳キャッシュ(tr2:)を
// 温める。cron(snapshotルート)は新規語だけ温めるので、既存バックログをこれで一括で埋める。
// あなたのローカルPCから実行=Vercel/レート制限とは別IP・一度きり。
// 実行: cosmos で `set -a; . ./.env.local; set +a; node scripts/warm-translations.mjs`
//   (.env.local に UPSTASH_REDIS_REST_URL / _TOKEN もしくは KV_REST_API_URL / _TOKEN)

const GEOS = [
  "JP", "US", "GB", "IN", "KR", "TW", "DE", "FR", "BR",
  "CA", "AU", "PH", "NG", "ZA", "MX", "ES", "AR", "CO",
  "ID", "RU", "TR", "VN", "TH", "IT",
];
const GEO_LANG = {
  JP: "ja", US: "en", GB: "en", IN: "en", KR: "ko", TW: "zh-TW", DE: "de", FR: "fr", BR: "pt-BR",
  CA: "en", AU: "en", PH: "en", NG: "en", ZA: "en", MX: "es", ES: "es", AR: "es", CO: "es",
  ID: "id", RU: "ru", TR: "tr", VN: "vi", TH: "th", IT: "it",
};
const UI_LOCALES = ["ja", "en", "es"];
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
  // 原文言語ごとに(語+見出し)を集約。複数国が同じ言語(en等)なら自然に重複排除される
  const texts = new Map(); // from(lang) -> Set(text)
  for (const geo of GEOS) {
    try {
      const r = await redis([["ZREVRANGE", `snapshot:${geo}`, "0", "2"]]); // 直近3スナップ=unionと同範囲
      const snaps = r?.[0]?.result ?? [];
      const lang = GEO_LANG[geo];
      if (!texts.has(lang)) texts.set(lang, new Set());
      const set = texts.get(lang);
      for (const rawSnap of snaps) {
        try {
          const snap = JSON.parse(rawSnap);
          for (const it of snap.items ?? []) {
            if (it.word) set.add(it.word);
            for (const n of it.news ?? []) {
              const t = (n?.title || "").slice(0, 200).trim(); // client/api/translateと同じ200字キー
              if (t) set.add(t);
            }
          }
        } catch {}
      }
    } catch (e) {
      console.error(`read ${geo}:`, e.message);
    }
  }

  let warmed = 0;
  let skipped = 0;
  for (const [from, set] of texts) {
    for (const text of set) {
      for (const to of UI_LOCALES) {
        if (to === from) continue;
        const key = `tr2:${from}:${to}:${text}`;
        const got = await redis([["GET", key]]);
        if (got?.[0]?.result) {
          skipped++;
          continue;
        }
        const tr = await translateGoogle(text, to);
        if (tr) {
          await redis([["SET", key, tr, "EX", "2592000"]]);
          warmed++;
          if (warmed % 50 === 0) console.log(`  …warmed ${warmed}`);
          await sleep(100);
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
