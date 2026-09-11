# earth-trend

[earth-trend.com](https://earth-trend.com) — 世界24カ国の検索急上昇を、国をまたいで眺めるWebアプリ。

無料データソース(Google Trends RSS・Googleサジェスト)のみで動く。外部API課金なし・運用稼働ほぼゼロが不変条件。
プロダクトの背骨は [docs/PHILOSOPHY.md](docs/PHILOSOPHY.md)、意思決定の履歴は [docs/DECISIONS.md](docs/DECISIONS.md)。

**UIは英語1本**(2026-09-11)。読者の母国語への変換はブラウザのGoogle翻訳に任せる = 3言語ではなく100言語以上に届く。
トレンド語には `translate="no"` を付けてあるので、ブラウザ翻訳をかけても原語(「파운드리」等)の生の文字は必ず残る。
これは PHILOSOPHY の「原語の生の文字は常に残す」と同じ結論に、維持コストゼロで到達する。

Next.js 16 (App Router) / React 19 / TypeScript / pnpm。テストはまだ無い(`src/lib/world.ts` の純粋関数だけ手動で検証)。

## 画面

| URL | 中身 |
|---|---|
| `/` | 世界一覧。24カ国のミニマップを俯瞰し、国を選んで潜る(ホーム) |
| `/jp` `/us` … | 国ページ。バブル図＋語ごとのニュース・登場時刻。左右スワイプで隣国へ |
| `/analysis` | 連想グラフ。急上昇語から「次に検索される語」を辿る(Canvas描画・`noindex`) |
| `/globe` | 地球儀。世界の急上昇を俯瞰する(※`GEO_CENTER` に座標がある9カ国のみ表示) |
| `/about` | 運営者・データ源・FAQ |

## ルーティング

ロケール接頭辞は無い。国スラグは国コードの小文字で、**スペインだけ `/spain`**
(`lib/trends.ts` の `GEO_SLUG`/`SLUG_GEO` が正。`lib/copy.ts` の `countryPath` にも同じ値がある)。

旧URL(`/ja` `/en` `/es` 接頭辞、`/trends`)は `next.config.ts` の redirects で正準URLへ301。
middleware は使わない(全リクエストでVercel Middlewareを起動しないため)。

> ⚠ **国を追加するときは** `lib/trends.ts` の `ALLOWED_GEO`/`GEO_LABELS`/`GEO_HL` と、
> `lib/copy.ts` の `COUNTRY_LABELS` を揃える。`next.config.ts` 側の作業はもう要らない
> (ロケール接頭辞を廃止したので rewrites が消えた)。

## データの流れ

世界の状態は **`world:v1` という1個のキー**に畳んである。24カ国ぶんで実測340KB程度のJSONが
30分ごとに書き換わるだけなので、国別・ティック別にキーを割らない。

```
Google Trends RSS (24カ国)
   │  Upstash QStash が15分ごとに叩く
   ▼
POST /api/cron/snapshot   … UTC :00/:30 のみ実処理(それ以外は skip して即返す)
   │
   ├─ GET world:v1            前回の状態                              … 1 コマンド
   ├─ 24カ国のRSSを並列取得
   ├─ mergeGeo()              前回 + 今回を running union
   │                           traffic=最大 / firstSeen=最小(pubDate) / lastSeen=今
   │                           並びは 検索量 × 0.5^(経過/30分) の減衰スコアで上位20件
   │                           6時間見かけない語は落とす。訳は同一文字列から引き継ぐ
   ├─ SET world:v1            1回で保存                               … 1 コマンド
   │  + RPUSH hist:<YYYY-MM-DD>  細い履歴(語/traffic/firstSeenのみ・TTL 30日)
   └─ revalidateTag(TRENDS_DATA_CACHE_TAG)

閲覧時: getWorld() が GET world:v1 を1回。国別ページもトップも地球儀もこの1エントリを共有する
```

**なぜ1キーなのか** — 旧構成は `snapshot:<geo>`(24国×3ティック)+ 語ごとの翻訳キーに分解していた。
そのため国別ページ1枚の描画で語数ぶんの個別GETが出て、無人でも無料枠500K/月の37%を消費していた。
1キー化でサイクルあたり4コマンドになり、
**読み取りは閲覧量に比例しなくなった**(`unstable_cache` の再計算時に1回だけ)。

**キャッシュの考え方** — 全ページ・全図が `getWorld()`(単一 `unstable_cache` キー)を共有するので、
どこを見ても「同じ瞬間」のデータになる。更新の主経路は snapshot 完了時のタグ失効で、
各ページの `revalidate = 3600` は cron が止まったときの安全網。
`/api/trends*` に CDN キャッシュは**付けない**(URLごとに別タイマーになり、この単一性が崩れてドリフトするため)。

Upstash が未設定・失敗した場合は `worldFromRss()` が RSS 直取得にフォールバックする
(= 動くが、running union の蓄積は効かない)。

## 環境変数

| 変数 | 要否 | 効果 |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 実質必須 | スナップショットの蓄積(running union)。無いと RSS 直取得に劣化 |
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
| `GET /api/trends?geo=US` | 1国の急上昇 |
| `GET /api/trends-all` | 全24カ国。地球儀・一覧の図用 |
| `GET /api/suggest?q=...&hl=ja` | Googleサジェスト中継。1時間キャッシュ |
| `POST/GET /api/cron/snapshot` | スナップショット実行(要 `CRON_SECRET`) |

## 無料枠の制約(踏みやすい罠)

- **Upstash 無料枠**: 50万コマンド/月・256MB・**帯域10GB/月**。帯域は見落としやすい。
  現構成の消費はサイクルあたり GET 1 + SET 1 + RPUSH/EXPIRE 2 = 4コマンド、
  48サイクル/日で**月約6千コマンド(枠の1%強)**。読み取りは閲覧量に比例しない。
  キーを国別・語別に割り戻すと一気に数十倍になるので、分解したくなったらこの数字を思い出すこと。
- **Vercel Hobby は非商用限定**。広告を入れた瞬間に Pro($20/月)が必須になる。
- **自前の翻訳は持たない**(2026-09-11の英語1本化で gtx への定期アクセスごと廃止)。
  再導入を検討するときは、非公式EPへの定期アクセスが何を意味するかを先に読むこと。

詳細と経緯は [docs/DECISIONS.md](docs/DECISIONS.md)。GA4 の読み取り接続は [docs/GA4_ANALYTICS.md](docs/GA4_ANALYTICS.md)。
