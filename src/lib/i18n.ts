// UI多言語化の中核。ロケールはURLの先頭セグメント(/ja, /en)。
// コンテンツ(トレンド語/ニュース)は別途lib/translateで訳す。ここはUIガワの辞書。

export const LOCALES = ["ja", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ja";

export function isLocale(x: string | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}
export function toLocale(x: string | undefined): Locale {
  return isLocale(x) ? x : DEFAULT_LOCALE;
}

// URL生成(prefix-except-default): デフォルト(ja)は接頭辞なし、他は /<locale> 接頭辞(/en, /es…)。
// section は "" (ホーム) または "/trends" 等の先頭スラッシュ付き相対パス。
export function localePath(locale: Locale, section = ""): string {
  if (locale === DEFAULT_LOCALE) return section === "" ? "/" : section;
  return `/${locale}${section}`;
}

// メタデータの hreflang alternates。全ロケール + x-default=en(海外フォールバックは英語)
export function altLanguages(section = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[l] = localePath(l, section);
  out["x-default"] = localePath("en", section);
  return out;
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
    CA: "カナダ",
    AU: "オーストラリア",
    PH: "フィリピン",
    NG: "ナイジェリア",
    ZA: "南アフリカ",
    MX: "メキシコ",
    ES: "スペイン",
    AR: "アルゼンチン",
    CO: "コロンビア",
    ID: "インドネシア",
    RU: "ロシア",
    TR: "トルコ",
    VN: "ベトナム",
    TH: "タイ",
    IT: "イタリア",
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
  },
  es: {
    JP: "Japón",
    US: "Estados Unidos",
    GB: "Reino Unido",
    IN: "India",
    KR: "Corea del Sur",
    TW: "Taiwán",
    DE: "Alemania",
    FR: "Francia",
    BR: "Brasil",
    CA: "Canadá",
    AU: "Australia",
    PH: "Filipinas",
    NG: "Nigeria",
    ZA: "Sudáfrica",
    MX: "México",
    ES: "España",
    AR: "Argentina",
    CO: "Colombia",
    ID: "Indonesia",
    RU: "Rusia",
    TR: "Turquía",
    VN: "Vietnam",
    TH: "Tailandia",
    IT: "Italia",
  },
};

type Dict = {
  nav: { trends: string; analysis: string; globe: string };
  theme: { label: string; system: string; light: string; dark: string };
  home: { title: string; desc: string; legendFooter: string; about: string };
  country: {
    title: (c: string) => string;
    all: string;
    seoHeading: (c: string) => string;
    loadFail: string;
    updated: string;
    others: string;
    compare: (c: string) => string;
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
  graph: {
    selectCountry: string;
    saveImage: string;
    seedTrends: string; // 分析: 親(トレンド語)
    leafTrends: string; // 分析: 子(サジェスト)
  };
  globe: { loading: string; loadFail: string; countries: (n: number) => string };
  share: { button: string; copied: string; image: string };
  langName: string;
};

// t() 内部からのみ参照(外部exportは不要)
const DICT: Record<Locale, Dict> = {
  ja: {
    nav: { trends: "トレンド", analysis: "分析", globe: "地球儀" },
    theme: { label: "テーマ", system: "システム", light: "ライト", dark: "ダーク" },
    home: {
      title: "世界のトレンド",
      desc: "いま各国が検索していること。気になった国を押すと、その先に何が繋がっているかを探索できる。",
      legendFooter: "大きさ＝検索ボリューム／色＝新しさ。データ: Google Trends（30分ごと更新）・",
      about: "このサイトについて",
    },
    country: {
      title: (c) => `${c}のトレンド`,
      all: "← 一覧",
      seoHeading: (c) => `${c}でいま検索されていること`,
      loadFail: "データの取得に失敗しました。少し待って再読み込みしてください。",
      updated: "最終更新",
      others: "他の国のトレンド",
      compare: (c) => `${c}の急上昇を、他の国と並べて見比べる。`,
    },
    bubbles: {
      legend: (n) =>
        `大きさ＝検索ボリューム／色＝新しさ（暖色＝最近登場）。直近の急上昇${n}件（全検索の割合ではありません）。ドラッグで移動・ホイール/ピンチで拡大。`,
    },
    detail: {
      searches: "検索数",
      trendingNow: "いま急上昇している検索。",
      googleSearch: "Googleで検索",
      explore: "分析",
      appeared: (s) => `約${s}前に登場`,
      close: "閉じる",
    },
    graph: {
      selectCountry: "国を選択",
      saveImage: "画像で保存",
      seedTrends: "いま急上昇している検索。",
      leafTrends: "検索者が次に調べている言葉。",
    },
    globe: {
      loading: "読み込み中…",
      loadFail: "データの取得に失敗しました",
      countries: (n) => `${n}カ国`,
    },
    share: { button: "共有", copied: "コピーしました", image: "画像を保存" },
    langName: "日本語",
  },
  en: {
    nav: { trends: "Trends", analysis: "Analysis", globe: "Globe" },
    theme: { label: "Theme", system: "System", light: "Light", dark: "Dark" },
    home: {
      title: "World Trends",
      desc: "What each country is searching right now. Tap a country to explore where its curiosity leads.",
      legendFooter: "Size = search volume / color = freshness. Data: Google Trends (updated every 30 min) · ",
      about: "About",
    },
    country: {
      title: (c) => `${c} Trends`,
      all: "← All",
      seoHeading: (c) => `What ${c} is searching right now`,
      loadFail: "Failed to load data. Please wait a moment and reload.",
      updated: "Updated",
      others: "Trends in other countries",
      compare: (c) => `Compare ${c}'s rising searches side by side with other countries.`,
    },
    bubbles: {
      legend: (n) =>
        `Size = search volume / color = freshness (warm = newly appeared). ${n} recent risings (not a share of all searches). Drag to pan, wheel/pinch to zoom.`,
    },
    detail: {
      searches: "Searches",
      trendingNow: "Trending now.",
      googleSearch: "Search on Google",
      explore: "Analysis",
      appeared: (s) => `appeared ~${s} ago`,
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
      countries: (n) => `${n} countries`,
    },
    share: { button: "Share", copied: "Copied", image: "Save image" },
    langName: "English",
  },
  es: {
    nav: { trends: "Tendencias", analysis: "Análisis", globe: "Globo" },
    theme: { label: "Tema", system: "Sistema", light: "Claro", dark: "Oscuro" },
    home: {
      title: "Tendencias del mundo",
      desc: "Lo que cada país busca ahora mismo. Toca un país para explorar hacia dónde lleva su curiosidad.",
      legendFooter:
        "Tamaño = volumen de búsqueda / color = novedad. Datos: Google Trends (actualizado cada 30 min) · ",
      about: "Acerca de",
    },
    country: {
      title: (c) => `Tendencias de ${c}`,
      all: "← Todos",
      seoHeading: (c) => `Lo que ${c} está buscando ahora`,
      loadFail: "No se pudieron cargar los datos. Espera un momento y vuelve a cargar.",
      updated: "Actualizado",
      others: "Tendencias en otros países",
      compare: (c) => `Compara las búsquedas en aumento de ${c} con las de otros países.`,
    },
    bubbles: {
      legend: (n) =>
        `Tamaño = volumen de búsqueda / color = novedad (cálido = recién aparecido). ${n} tendencias recientes (no es una proporción de todas las búsquedas). Arrastra para mover, rueda/pellizca para acercar.`,
    },
    detail: {
      searches: "Búsquedas",
      trendingNow: "En tendencia ahora.",
      googleSearch: "Buscar en Google",
      explore: "Análisis",
      appeared: (s) => `apareció hace ~${s}`,
      close: "Cerrar",
    },
    graph: {
      selectCountry: "Elegir país",
      saveImage: "Guardar imagen",
      seedTrends: "En tendencia ahora mismo.",
      leafTrends: "Lo que los usuarios buscan después.",
    },
    globe: {
      loading: "cargando…",
      loadFail: "No se pudieron cargar los datos",
      countries: (n) => `${n} países`,
    },
    share: { button: "Compartir", copied: "Copiado", image: "Guardar imagen" },
    langName: "Español",
  },
};

export function t(locale: Locale): Dict {
  return DICT[locale] ?? DICT[DEFAULT_LOCALE];
}

// 「登場(=燃え始め)からの経過」をロケール別の短い文字列に。d.detail.appeared(...) と組み合わせる。
export function durationStr(sec: number | undefined, nowSec: number, locale: Locale): string | null {
  if (!sec) return null;
  const m = Math.max(0, Math.floor((nowSec - sec) / 60));
  const h = Math.floor(m / 60);
  if (locale === "en") {
    if (m < 60) return `${m} min`;
    if (h < 24) return `${h} hr`;
    return `${Math.floor(h / 24)} days`;
  }
  if (locale === "es") {
    if (m < 60) return `${m} min`;
    if (h < 24) return `${h} h`;
    return `${Math.floor(h / 24)} días`;
  }
  if (m < 60) return `${m}分`;
  if (h < 24) return `${h}時間`;
  return `${Math.floor(h / 24)}日`;
}
