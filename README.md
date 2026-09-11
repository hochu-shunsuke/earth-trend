# earth-trend

[earth-trend.com](https://earth-trend.com) — 世界24カ国の検索急上昇を、国をまたいで眺めるWebアプリ。

無料データソース(Google Trends RSS・Googleサジェスト・Google翻訳の非公式EP)のみで動く。
外部API課金なし・運用稼働ほぼゼロが不変条件。プロダクトの背骨は [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md)、
意思決定の履歴は [docs/DECISIONS.md](docs/DECISIONS.md)。

Next.js 16 (App Router) / React 19 / TypeScript / pnpm。テストはまだ無い。

## 画面

| URL (ja) | 中身 |
|---|---|
| `/` | 世界一覧。24カ国のミニマップを俯瞰し、国を選んで潜る(ホーム) |
| `/jp` `/us` … | 国ページ。バブル図＋語ごとのニュース・登場時刻。左右スワイプで隣国へ |
| `/analysis` | 連想グラフ。急上昇語から「次に検索される語」を辿る |
| `/globe` | 地球儀。世界の急上昇を俯瞰する(※`GEO_CENTER` に座標がある9カ国のみ表示) |
| `/about` | 運営者・データ源・FAQ |

## ルーティング

**prefix-except-default**: 既定ロケール ja は接頭辞なし、en/es は `/en` `/es` 接頭辞。
`src/lib/i18n.ts` の `localePath()` / `countryPath()` が唯一のURL生成元。

```
/          /en          /es           世界一覧
/jp        /en/jp       /es/jp        国ページ
/analysis  /en/analysis /es/analysis
```

Vercel Middleware を起動させないため、`next.config.ts` の **config routing**(rewrites/redirects)で
既知の静的経路だけを捌いている。middleware.ts は存在しない。

- rewrites(beforeFiles): `/` → `/ja`、`/<path>` → `/ja/<path>`
- redirects(301): `/ja` → `/`、`/ja/<path>` → `/<path>`、`/trends` → `/`、`/en/trends` → `/en`

**スペインの国スラグは `spain`**(`/es` がロケール接頭辞と衝突するため)。この対応は
`lib/trends.ts` の `GEO_SLUG`/`SLUG_GEO` が正。`lib/i18n.ts` と `next.config.ts` にも同じ値が
べた書きされているので、変えるなら3箇所そろえる。

> ⚠ **国を追加するときは2箇所を必ず両方**: `lib/trends.ts` の `ALLOWED_GEO`/`GEO_LABELS`/`GEO_LANG`/`GEO_HL`、
> および `next.config.ts` の `countryPaths`。後者を忘れると ja のベアURL(`/xx`)が rewrite されず、
> `[lang]` に `xx` が入って 404 になる。`lib/i18n.ts` の `COUNTRY_LABELS` にも3言語分の国名が要る。

## データの流れ

```
Google Trends RSS (24カ国)
   │  Upstash QStash が15分ごとに叩く
   ▼
POST /api/cron/snapshot   … UTC :00/:30 のみ実処理(それ以外は skip して即返す)
   │
   ├─ runSnapshot()      24カ国を並列取得 → Upstash に1回の pipeline で保存
   │                      snapshot:<geo> (ZADD, 直近300件) / latest:<geo> (SET)
   ├─ revalidateTag(TRENDS_DATA_CACHE_TAG)
   ├─ warmTranslations() 新規語・見出しだけを ja/en/es へ翻訳 → tr2:<src>:<to>:<text> (TTL 30日)
   │                      逐次+120ms sleep、1回30件・33秒で打ち切り(非公式EPに優しく)
   └─ revalidateTag(TRENDS_TRANSLATED_CACHE_TAG)

閲覧時: getGalleryData() が直近3スナップショットを union して「直近の急上昇」を作る
        (重複語は traffic 最大、firstSeen は最も早い pubDate、並びは 検索量 × 新しさ の減衰スコア)
```

**キャッシュの考え方** — 全ページ・全図が `getGalleryData()`(単一 `unstable_cache` キー)を共有するので、
どこを見ても「同じ瞬間」のデータになる。更新の主経路は snapshot 完了時のタグ失効で、
各ページの `revalidate = 3600` は cron が止まったときの安全網。
`/api/trends*` に CDN キャッシュは**付けない**(URLごとに別タイマーになり、この単一性が崩れてドリフトするため)。

Upstash が未設定・失敗した場合は `fetchTrendsUnioned()` が RSS 直取得にフォールバックする
(= 動くが、蓄積由来の firstSeen と翻訳は出ない)。

## 環境変数

| 変数 | 要否 | 効果 |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 実質必須 | スナップショット蓄積・翻訳キャッシュ・レート制限。無いと RSS 直取得に劣化 |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | 代替 | Vercel の Upstash 連携を使う場合はこちら。両方対応・`KV_` が優先 |
| `CRON_SECRET` | cronに必須 | `/api/cron/snapshot` の認証。**未設定だと常に 401** を返す(fail-closed) |

ローカルは `.env.local`(gitignore済み)。

```
pnpm install
pnpm dev      # http://localhost:3000
pnpm build
pnpm lint
```

cron を手で叩く場合:

```
curl -X POST "http://localhost:3000/api/cron/snapshot?key=$CRON_SECRET&force=1"
```

`force=1` で :00/:30 ゲートを飛ばす。QStash からは `Authorization: Bearer <CRON_SECRET>` が
`Upstash-Forward-Authorization` 経由で届く。

## API

`robots.txt` で `/api/` は全面 Disallow(JSONなのでインデックス価値なし)。

| ルート | 用途 |
|---|---|
| `GET /api/trends?geo=US&to=ja` | 1国の急上昇。`to` 指定時は**温め済みの訳だけ**付与(上流は叩かない) |
| `GET /api/trends-all` | 全24カ国。地球儀・一覧の図用 |
| `GET /api/suggest?q=...&hl=ja` | Googleサジェスト中継。1時間キャッシュ |
| `GET /api/translate?q=...&from=&to=` | オンデマンド翻訳。レート制限あり、超過時は原語へ劣化 |
| `POST/GET /api/cron/snapshot` | スナップショット実行(要 `CRON_SECRET`) |

## 無料枠の制約(踏みやすい罠)

- **Upstash**: 50万コマンド/月・256MB。`KEEP_PER_GEO` は union で直近3件しか使わないので増やさない。
  古いスナップの trim は毎回ではなく約10回に1回(コマンド節約)。
- **Vercel Hobby は非商用限定**。広告を入れた瞬間に Pro($20/月)が必須になる。
- **翻訳EP(gtx)は非公式**。warming の逐次+sleep と `lib/ratelimit.ts` は、共有egress IPごと
  ブロックされるのを防ぐためのもの。並列化・上限撤廃はしない。

詳細と経緯は [docs/DECISIONS.md](docs/DECISIONS.md)。GA4 の読み取り接続は [docs/GA4_ANALYTICS.md](docs/GA4_ANALYTICS.md)。
