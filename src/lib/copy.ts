// 表示文言とURL生成。earth-trend は英語1本(2026-09-11の判断)。
//
// 多言語UIと自前の翻訳パイプラインは畳んだ。読者の母国語への変換はブラウザのGoogle翻訳に任せる
// = 3言語ではなく100言語以上に届く。トレンド語には translate="no" を付けてあるので、
// ブラウザ翻訳をかけても原語(「파운드리」等)の生の文字は必ず残る。これは PHILOSOPHY の
// 「原語の生の文字は常に残す」と同じ結論に、維持コストゼロで到達する。

export const COPY = {
  nav: { trends: "Trends", analysis: "Analysis", globe: "Globe" },
  theme: { label: "Theme", system: "System", light: "Light", dark: "Dark" },
  home: {
    title: "World Trends",
    desc: "What each country is searching right now. Tap a country to explore where its curiosity leads.",
    legendFooter: "Size = search volume / color = freshness.",
  },
  country: {
    title: (c: string) => `${c} Trends`,
    all: "← All",
    seoHeading: (c: string) => `What ${c} is searching right now`,
    loadFail: "Failed to load data. Please wait a moment and reload.",
    updated: "Updated",
    switchCountry: "Switch country",
    previousCountry: "Previous country",
    nextCountry: "Next country",
    swipeHint: "Swipe left or right to switch country",
  },
  bubbles: {
    legend: (n: number) =>
      `Size = search volume / color = freshness (warm = newly appeared). ${n} recent risings (not a share of all searches). Swipe to switch country · two fingers/drag to move.`,
  },
  detail: {
    searches: "Searches",
    trendingNow: "Trending now.",
    googleSearch: "Search on Google",
    explore: "Analysis",
    appeared: (s: string) => `appeared ~${s} ago`,
    close: "Close",
  },
  graph: {
    selectCountry: "Select country",
    saveImage: "Save image",
    seedTrends: "Trending right now.",
    leafTrends: "What searchers look up next.",
  },
  globe: {
    loading: "loading…",
    loadFail: "Failed to load data",
    countries: (n: number) => `${n} countries`,
  },
  share: { button: "Share", copied: "Copied", image: "Save image" },
} as const;

export const COUNTRY_LABELS: Record<string, string> = {
  JP: "Japan",
  US: "United States",
  GB: "United Kingdom",
  IN: "India",
  KR: "South Korea",
  TW: "Taiwan",
  DE: "Germany",
  FR: "France",
  BR: "Brazil",
  CA: "Canada",
  AU: "Australia",
  PH: "Philippines",
  NG: "Nigeria",
  ZA: "South Africa",
  MX: "Mexico",
  ES: "Spain",
  AR: "Argentina",
  CO: "Colombia",
  ID: "Indonesia",
  RU: "Russia",
  TR: "Turkey",
  VN: "Vietnam",
  TH: "Thailand",
  IT: "Italy",
};

/** 国別URL。スラグは lib/trends.ts の geoSlug が正(ESだけ "spain") */
export function countryPath(geo: string): string {
  const code = geo.toUpperCase();
  return `/${code === "ES" ? "spain" : code.toLowerCase()}`;
}

/** 「登場(=燃え始め)からの経過」。COPY.detail.appeared(...) と組み合わせる */
export function durationStr(sec: number | undefined, nowSec: number): string | null {
  if (!sec) return null;
  const m = Math.max(0, Math.floor((nowSec - sec) / 60));
  const h = Math.floor(m / 60);
  if (m < 60) return `${m} min`;
  if (h < 24) return `${h} hr`;
  return `${Math.floor(h / 24)} days`;
}
