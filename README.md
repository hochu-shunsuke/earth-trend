# earth-trend

検索トレンドを探索する3ビュー(グラフ/地球儀/リスト)のWebアプリ。
無料データソース(Google Trends RSS・Googleサジェスト)のみで動作し、外部API課金なし。
ドキュメントはリポジトリルートの docs/ を参照。

## 開発
```
pnpm install
pnpm dev
```
Vercel本番では `BASIC_AUTH=user:pass` を設定するとBasic認証がかかる(v1公開まで)。
