// サイト名・URL・計測IDは一箇所に集約。リブランド/ドメイン変更時はここだけ差し替える
export const SITE_NAME = "earth-trend";
export const SITE_URL = "https://earth-trend.com";
export const SITE_DOMAIN = "earth-trend.com"; // OG等に表示するドメイン表記

// 運営者(個人プロジェクト)の公開連絡先。about表示 + 構造化データ(sameAs/contactPoint)に使う
export const SITE_OPERATOR = "hochu";
export const SITE_EMAIL = "hochu.shunsuke.dev@gmail.com";
export const SITE_GITHUB = "https://github.com/hochu-shunsuke";

// JSON-LD用: <script>へ安全に埋め込む。JSON.stringifyは "</script>" を escape しないため
// "<" を < に置換し、外部データ(トレンド語等)由来のscript脱出=XSSを防ぐ。
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
export const GA_ID = "G-05T0DS9LM8"; // GA4測定ID(公開情報)
export const SITE_TAGLINE = "A living map of what the world is searching.";
export const SITE_DESCRIPTION =
  "See what the world is searching right now, across 24 countries — as bubbles by country, as branches of association, and on a globe. Search is the most honest record humanity keeps of its curiosity; this is a place to watch it move.";
