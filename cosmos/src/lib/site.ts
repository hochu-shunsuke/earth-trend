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
export const SITE_TAGLINE = "世界のトレンドを、ひとつの生きた地図に。";
export const SITE_DESCRIPTION =
  "いま世界が何を検索しているかを、国別のバブル・連想の枝・地球儀という3つの視点で。検索という人類の正直な記録を、生きたグラフとして探索する。";
