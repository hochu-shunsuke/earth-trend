# バックログ

優先度順。原則「ローンチして流入の手応えを見てから」着手するものを置く。
着手判断の基準は ARCHITECTURE.md の3軸と DECISIONS.md の選定基準。

## ローンチ前(残タスク)
- [x] ルートを単一gitリポジトリに統合 → GitHub(private: hochu-shunsuke/bizz)にpush済み
- [x] GA4導入(NEXT_PUBLIC_GA_ID 未設定時は読み込まれない。GA4プロパティ作成後にVercelの環境変数へ設定)
- [ ] Vercelダッシュボードでimport(Root Directory: `app`)→ *.vercel.app で公開
- [ ] 実画像でのE2E確認(40枚変換→ZIP→実際にCreators Marketへ申請が通るか)
- [ ] デプロイ後 `src/lib/site.ts` のSITE_URLを *.vercel.app URLに更新 → GSC登録(URLプレフィックス)→ sitemap送信
- [ ] サイト名・独自ドメイン決定は手応えが出てから。**AdSenseは *.vercel.app では審査不可のため独自ドメイン購入とセットで実施**

## ローンチ直後
- [ ] 機能募集の初期版: Googleフォーム埋め込み+X導線(DB不要・5分)
      → 流入が付いたら投票ボードに昇格を検討(不変条件3の例外判断が必要)
- [ ] llms.txt 設置(LLMO)
- [ ] note/Zennに解説記事(被言及づくり。AI引用・SEO両効き)
- [ ] X初動投稿(クリエイター界隈向け)

## 第2弾ツール着手時
- [ ] `app/AGENTS.md` にデザイン規約を追記(トークン・カード様式・components/再利用の強制)
      — AIに実装を任せる体制でデザイン統一を保つ唯一の手段
- [ ] 共通UI(ドロップゾーン等)のコンポーネント抽出 ← Rule of Three: 2個目で共通部を抽出
- [ ] AdSense審査申請(コンテンツページが複数になってから)

## アイデア置き場(選定基準を通してから昇格)
- 同人入稿プリフライト(習慣性○・印刷所アフィリ○)
- LINE絵文字・着せかえ規格対応(/line-stampの拡張として)
