# earth-trend

検索トレンドを探索する3ビュー(グラフ/地球儀/リスト)のWebアプリ。
ドキュメントはリポジトリルートの docs/ を参照。

## 開発
```
pnpm install
pnpm dev
```
環境変数: `.env.example` 参照(GEMINI_API_KEY)。Vercel本番では BASIC_AUTH=user:pass を設定するとBasic認証がかかる(v1公開まで)。
