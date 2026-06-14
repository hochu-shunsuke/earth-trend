// UI多言語化の中核。ロケールはURLの先頭セグメント(/ja, /en)。
// コンテンツ(トレンド語/ニュース)は別途lib/translateで訳す。ここはUIガワの辞書。

export const LOCALES = ["ja", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ja";

export function isLocale(x: string | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}
export function toLocale(x: string | undefined): Locale {
  return isLocale(x) ? x : DEFAULT_LOCALE;
}

// 国名(UIなので訳す)。コードは ALLOWED_GEO と一致
export const COUNTRY_LABELS: Record<Locale, Record<string, string>> = {
  ja: {
    JP: "日本",
    US: "アメリカ",
    GB: "イギリス",
    IN: "インド",
    KR: "韓国",
    TW: "台湾",
    DE: "ドイツ",
    FR: "フランス",
    BR: "ブラジル",
  },
  en: {
    JP: "Japan",
    US: "United States",
    GB: "United Kingdom",
    IN: "India",
    KR: "South Korea",
    TW: "Taiwan",
    DE: "Germany",
    FR: "France",
    BR: "Brazil",
  },
};

type Dict = {
  nav: { trends: string; quest: string; analysis: string; globe: string };
  theme: { label: string; system: string; light: string; dark: string };
  home: { title: string; desc: string; legendFooter: string; about: string };
  country: {
    title: (c: string) => string;
    all: string;
    seoHeading: (c: string) => string;
    loadFail: string;
  };
  bubbles: { legend: (n: number) => string };
  detail: {
    searches: string;
    trendingNow: string;
    googleSearch: string;
    explore: string;
    appeared: (s: string) => string; // X は "2時間"等
    close: string;
  };
  langName: string;
};

export const DICT: Record<Locale, Dict> = {
  ja: {
    nav: { trends: "トレンド", quest: "探求", analysis: "分析", globe: "地球儀" },
    theme: { label: "テーマ", system: "システム", light: "ライト", dark: "ダーク" },
    home: {
      title: "世界のトレンド",
      desc: "いま各国が検索していること。気になった国を押すと、その先に何が繋がっているかを探索できる。",
      legendFooter: "大きさ＝検索ボリューム／色＝新しさ。データ: Google Trends（10分ごと更新）・",
      about: "このサイトについて",
    },
    country: {
      title: (c) => `${c}のトレンド`,
      all: "← 一覧",
      seoHeading: (c) => `${c}でいま検索されていること`,
      loadFail: "データの取得に失敗しました。少し待って再読み込みしてください。",
    },
    bubbles: {
      legend: (n) =>
        `大きさ＝検索ボリューム／色＝新しさ（暖色＝最近登場）。直近の急上昇${n}件（全検索の割合ではありません）。ドラッグで移動・ホイール/ピンチで拡大。`,
    },
    detail: {
      searches: "検索数",
      trendingNow: "いま急上昇している検索。",
      googleSearch: "Googleで検索",
      explore: "探索する",
      appeared: (s) => `約${s}前に登場`,
      close: "閉じる",
    },
    langName: "日本語",
  },
  en: {
    nav: { trends: "Trends", quest: "Quest", analysis: "Analysis", globe: "Globe" },
    theme: { label: "Theme", system: "System", light: "Light", dark: "Dark" },
    home: {
      title: "World Trends",
      desc: "What each country is searching right now. Tap a country to explore where its curiosity leads.",
      legendFooter: "Size = search volume / color = freshness. Data: Google Trends (updated every 10 min) · ",
      about: "About",
    },
    country: {
      title: (c) => `${c} Trends`,
      all: "← All",
      seoHeading: (c) => `What ${c} is searching right now`,
      loadFail: "Failed to load data. Please wait a moment and reload.",
    },
    bubbles: {
      legend: (n) =>
        `Size = search volume / color = freshness (warm = newly appeared). ${n} recent risings (not a share of all searches). Drag to pan, wheel/pinch to zoom.`,
    },
    detail: {
      searches: "Searches",
      trendingNow: "Trending now.",
      googleSearch: "Search on Google",
      explore: "Explore",
      appeared: (s) => `appeared ~${s} ago`,
      close: "Close",
    },
    langName: "English",
  },
};

export function t(locale: Locale): Dict {
  return DICT[locale] ?? DICT[DEFAULT_LOCALE];
}
