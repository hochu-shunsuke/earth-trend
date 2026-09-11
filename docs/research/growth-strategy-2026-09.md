# earth-trend 成長戦略リサーチ

調査日: 2026-09-11  
対象: [earth-trend.com](https://earth-trend.com/)  
前提: 個人運営、広告費はほぼ使わず、まず日本語圏で再現性を作り、英語・スペイン語へ展開する。

## エグゼクティブサマリー

earth-trend の勝ち筋は「Google Trends より速い」「対応国が多い」ではない。Google の公式 Trending Now はすでに 125 カ国で提供され、発見数を従来比10倍にし、約10分ごとに更新する規模に達している。[1] TrendMap も40カ国超、履歴、分類、AI説明、3D表示を掲げており、機能数の競争は個人開発には不利である。[2]

一方で earth-trend には、複数国の現在を一画面で眺め、色と大きさで「世界の注意」を直感的に感じ、国を横断できる明確な個性がある。狙うべきポジションは次である。

> 世界でいま起きている「関心の偏り」を、国をまたいで発見し、背景まで理解できる場所。

現状はライブ体験の基礎が強いが、その価値が検索・AI検索・再訪・外部リンクに蓄積する構造が弱い。各国ページの内容は30分ごとに上書きされるため、面白い瞬間がURLとして残らない。検索エンジンには改修前のトップページの抜粋が残り、期限切れの分析URLが「Error: trends 404」の状態でインデックスされている。トップの古い抜粋は直近の構成変更後の再クロール待ちとして自然だが、分析エラーは能動的な修正が必要である。また、サイト名だけを外部検索した範囲では、第三者サイトからの目立った言及やリンクは確認できなかった。

したがって優先順位は以下になる。

1. インデックス品質を直す。エラーになる分析クエリを検索結果から外し、サイトマップの更新日時を正確にする。
2. ライブ画面とは別に、日付が固定された「今週、世界が検索したもの」を毎週1本残す。
3. AIで国横断クラスタリング・翻訳・下書きを省力化し、人間が意味と出典を確認して公開する。
4. その固定記事から、X、Reddit、ニュースレター、記者・データ可視化コミュニティへ配る。
5. PVではなく「2カ国以上見た」「詳細を開いた」「共有した」「翌週戻った」で改善する。

90日で目指すべき成果は、爆発的PVではない。「検索可能な安定コンテンツ」「共有される定型フォーマット」「毎週戻る理由」という3つの成長装置を作ることである。

## 1. 市場の現状

### 1.1 検索トレンド市場は大手が機能面を押さえている

Google Trending Now は、125カ国、40カ国では地域単位にも対応し、発生時刻、継続時間、関連ニュース、時系列グラフ、比較、エクスポートまで備える。[1] したがって、単なる「国別急上昇ワード一覧」は公式サービスの代替として弱い。

独立系では次の競合が見つかった。

| サービス | 公開上の訴求 | earth-trend への示唆 |
|---|---|---|
| Google Trending Now | 125カ国、約10分更新、関連ニュース、比較、エクスポート | 鮮度・網羅性では戦わない |
| TrendMap | 40カ国超、3D、履歴、カテゴリ、AI説明 | 最も近い直接競合。機能の足し算では消耗する |
| Trendopic | 50カ国超、ニュース、関連検索、コミュニティ[19] | 保存・会話・発見のループが差になる |
| TrendPulse | 53カ国、時間単位の更新、国別閲覧[20] | 一覧だけでは同質化しやすい |
| AI TrendMap | 検索以外も含む最大15領域、28カ国[21] | データ源の多さを追うより、検索行動に焦点を絞る |

学術面でも、Google Trending Now の1年超・125カ国・1,358地域を収録した GoogleTrendArchive が2026年に公開され、国をまたぐ注意、危機反応、情報拡散を研究できるデータとして位置づけられている。[3] つまり「現在値を見る」以上に、「時間と国をまたいで比較できること」に価値がある。

### 1.2 検索流入はAI回答によってクリックされにくくなっている

Pew Research Center が米国成人900人の2025年3月の検索行動を調べたところ、Google検索の18%にAI要約が現れた。通常の検索結果へのクリックは、AI要約がない場合15%に対し、ある場合8%。AI要約内の出典クリックは1%だった。[4] 日本の比率を直接示す調査ではないが、「検索結果に表示されれば訪問される」という前提は弱くなっている。

一方、ChatGPTなどAIサービスから外部サイトへの送客は存在する。Similarweb は主要AIサービスから上位1,000ドメインへの流入を2025年5月に13億訪問と推計した。[5] OpenAI は、公開サイトが ChatGPT Search に表示されるには OAI-SearchBot をブロックしないこと、ChatGPTからのリンクに `utm_source=chatgpt.com` が付くことを案内している。[6]

結論は「SEOかAI対策か」ではない。検索可能で、出典が明確で、他では得にくいページを作ることが両方に効く。Googleも、AI Overviews / AI Mode に特殊なschemaや `llms.txt` は不要で、通常のインデックス、内部リンク、本文中の明確な情報、良いページ体験が中心だとしている。[7][8]

## 2. earth-trend の現在地

### 2.1 強み

- 24カ国を一画面で俯瞰し、国別の固有URLへ進める。今回のトップ改修は初見の価値を大きく改善している。
- 国ページには、検索語、概算検索量、初出、関連ニュース、翻訳がHTMLとして存在する。JavaScriptだけの図より検索エンジンとAIが理解しやすい。
- 日本語・英語・スペイン語の canonical / hreflang が実装済み。
- `/robots.txt` と `/sitemap.xml` は公開され、サイトマップには84 URLが入っている。
- About に運営者、連絡先、データ源、更新頻度、非公式サービスであることが明記されている。情報の「誰が・どう作ったか」を示す土台はある。
- GA4と、国移動、バブル選択、分析遷移、検索、共有、画像保存などのカスタムイベントが実装済み。成長を行動単位で測れる準備がある。
- 30分スナップショット、Redisの一括処理、共有キャッシュにより、アクセスごとに24カ国を取得する構造ではない。

Googleは、独自情報・分析、明確な著者や作成方法、読者に実質的価値がある people-first content を重視している。[9] earth-trend の「検索は世界の好奇心の記録」という思想と可視化は、ここに合っている。

### 2.2 弱みとリスク

#### A. 面白い瞬間が消え、検索資産にならない

国ページのURLは安定しているが、中身は30分ごとに変わる。昨日の「なぜ複数国で同じ人物が急上昇したのか」を後から共有・引用できない。今の構造は再訪には向くが、ロングテール検索、被リンク、AIの出典には蓄積しにくい。

#### B. インデックスに低品質な状態が混ざっている

公開検索のスポットチェックで、`/en/analysis?geo=US&seed=...` が `Error: trends 404` の抜粋でインデックスされていた。分析ページの canonical はクエリを除いた `/en/analysis` だが、期限切れのseed付きURL自体が検索結果に出ている。これはユーザー体験とサイト全体の信頼の両方に悪い。

対処は、分析を当面 `noindex,follow` にするか、seedを永続的に再現できるデータと固有URLに変えること。現状なら前者が安全である。

#### C. サイトマップの `lastmod` が信用できない

84 URLすべてが、サイトマップを取得した瞬間と同じ `lastmod` を返している。About のような静的ページまで毎回「今更新」と申告している。Googleは `lastmod` を、本文などの有意な変更時刻と継続的に一致する場合にのみ利用し、`priority` と `changefreq` は無視すると明記している。[10][11]

国ページは最新スナップショット時刻、固定記事は公開・更新時刻、Aboutは実際の更新日を使うべきである。不明なら誤った `lastmod` を出すより省略する。

#### D. トップページが検索エンジンにとってノイジー

本番トップのHTMLは約345 KB、圧縮転送でも約109 KBだった。国ページは約73 KB、圧縮転送で約19 KB。トップの見た目に必要なのは各国の `word / traffic / firstSeen` だが、クライアント境界へニュース見出し・URL・媒体名まで含む全データを渡している。速度・転送量だけでなく、検索抜粋に大量の外国語トレンドが反復して現れ、ページの主題をぼかしている。

マーケティング施策でアクセスを増やす前に、トップ用データを必要3項目へ射影し、検索エンジン向けに短い説明と国リンクを明確にするべきである。

#### E. ブランド指名と外部評価がほぼ育っていない

`earth-trend.com` の指名検索では自サイトは見つかるが、外部の目立った紹介・リンクは今回の検索範囲では確認できなかった。また「earth trend」は気候・地理分野でも使われる一般語で、同名に近いSNSアカウントもある。ブランド検索だけに頼れない。なお、公開検索と `site:` 検索は完全なインデックス件数や被リンク一覧を保証しないため、最終判断はSearch Consoleの「ページ」と「リンク」で行う。

一貫した表記、短い説明文、作者プロフィール、公式SNSへの `sameAs`、独自の定期コンテンツ名を揃える必要がある。たとえばコンテンツ名を「World Attention Brief / 世界の関心週報」と固定すると、一般語のブランドを補強できる。

#### F. 計測は実装済みだが、意思決定の形になっていない

GA4タグとイベントはあるが、この調査環境ではGA4 Admin APIが無効で、プロパティIDもリポジトリに保存されていないため、実数の取得まではできなかった。したがって、以下の評価は公開ページ・検索結果・実装の監査であり、セッション数や継続率の断定ではない。

最初の1週間でGA4探索レポートを作り、現在値を凍結する必要がある。Search Consoleの実データも併せて初めて、「何を伸ばすか」を数字で決められる。

### 2.3 Vercel利用量について

共有された画面の「99.9%」は全プロジェクト内で earth-trend が占める比率であり、契約上限の99.9%を使った意味ではない。30日合計の Fluid Active CPU は3時間5分で、日別はおおむね5〜7分だった。絶対的に危険かどうかはプラン上限・Functionsの呼び出し回数・転送量と合わせないと判断できない。

ただし、現構造では30分ごとのスナップショット処理が24カ国取得と最大33秒の翻訳warmingを同期実行するため、アクセスが少なくても一定のCPUが発生する。これは「人気で高い」のではなく「定期バッチの固定費」である可能性が高い。成長前に、Vercel Usageで Function 名・Invocations・Duration・Fast Data Transferを分解し、`/api/cron/snapshot` が何割か確認する。集客判断とインフラ判断を混ぜないことが重要である。

## 3. 推奨ポジショニング

### 誰のためか

最初の主対象を3層に分ける。

1. **好奇心で眺める人**: 「海外では何が起きている？」を楽しむ。拡散を生む。
2. **発信者・記者・編集者**: 話題の発見、国ごとの差、記事の入口が欲しい。引用と再訪を生む。
3. **マーケター・研究者**: 時間比較、国比較、履歴、出力が欲しい。将来の有料価値になり得る。

当面は1と2に集中する。3向けの高度なダッシュボードを急ぐと、Google TrendsやTrendMapとの機能競争になる。

### 一文の約束

日本語:

> 世界はいま、何を気にしている？ 24カ国の検索急上昇を、国をまたいで眺める生きた地図。

英語:

> See what the world is suddenly curious about, across countries, in one living map.

「Google Trendsを見やすくしたサイト」ではなく、「パーソナライズの外へ出る観測装置」として語る。これは現在のAboutの思想とも一致する。

## 4. 成長の仕組み

### 4.1 Live / Archive / Story の3層にする

| 層 | 役割 | URL例 | 更新 |
|---|---|---|---|
| Live | 今を眺め、国を横断する | `/`, `/jp`, `/en/us` | 30分 |
| Archive | 後から比較・引用できる | `/week/2026-W37`, `/country/jp/2026-W37` | 週1回 |
| Story | なぜ複数国で話題か理解する | `/stories/2026-09-11-...` | 閾値を超えた時だけ |

Liveは鮮度と体験、Archiveは検索と被リンク、StoryはAI検索・Discover・SNSを担う。全トレンドをページ化してはいけない。Googleは、AIなどを使った大量の低付加価値ページが scaled content abuse に当たり得ると案内している。[12]

週報は次の固定フォーマットにする。

- 今週、最も多くの国で同時に上がった3テーマ
- 日本だけで特異だった3テーマ
- 先週から急に広がったテーマ
- 各テーマの対象国、初出、概算規模、一次または信頼できるニュース出典
- データ収集時刻、集計方法、AIを使った箇所、人が確認した箇所

最初は週1本で十分。12週間で12本の良いURLを作る方が、毎日数百の薄いページを作るより安全で強い。

### 4.2 AIの正しい使い方

AIは公開量を増やす装置ではなく、人間が見つけにくい国横断パターンを抽出する装置として使う。

推奨パイプライン:

1. 24カ国の検索語を多言語埋め込みで同一トピックに束ねる。
2. 「3カ国以上」「前週になかった」「ニュース出典が2件以上」などで候補を絞る。
3. AIが、なぜ話題か・国ごとの差・未知語の読み方を出典付きで下書きする。
4. 公開前に人が、固有名詞、日時、因果関係、翻訳、リンク先を確認する。
5. ページに収集時刻、データ源、AI支援の範囲、編集者名を記す。

GoogleはAIを調査や構造化に使うこと自体を否定しておらず、正確性・品質・関連性と、作成方法の文脈を重視している。[9][12] この方法なら、AIが競合と同じ説明文を量産するのではなく、earth-trend固有のデータ処理を価値に変えられる。

### 4.3 AI検索への対応f

- `OAI-SearchBot` を許可する。現状のワイルドカード許可で基本的には到達可能。
- 学習への利用を望まない場合は、検索用の `OAI-SearchBot` は許可しつつ `GPTBot` だけをrobots.txtで拒否できる。[6]
- `llms.txt` を優先施策にしない。Googleは生成AI検索への特別なファイルを不要としている。[7]
- 一文で引用できる定義、数字、更新時刻、対象国、方法、出典を本文に書く。図の中だけに閉じ込めない。
- Archiveには `Dataset`、Storyには `Article`、一覧には既存の `ItemList` を、画面上の内容と一致する範囲で使う。schemaは理解補助であり、表示保証ではない。[13]
- GA4で `sessionSource = chatgpt.com` と `utm_source=chatgpt.com` を分けて見る。[6]
- Search Consoleの生成AIパフォーマンスレポートが利用可能なら、通常検索と分けて表示・クリックを追う。[7]

### 4.4 SEOの狙い方

「Google トレンド」「世界 トレンド」のhead keywordは公式と大手が強く、最初の主戦場にはしない。次の検索意図を狙う。

- 比較: 「日本 アメリカ 検索トレンド 違い」「世界 同時 急上昇」
- 解説: 「なぜ ○○ が海外で話題」「○○ どの国で検索」
- 定期: 「今週 世界で検索されたもの」「2026年9月 世界のトレンド」
- 利用: 「世界の話題 ネタ」「海外ニュース 話題 探し方」

国ページは「現在」の入口として維持し、月・週・テーマの固定ページでロングテールを取る。内部リンクは、週報→関連国→分析、国→今週の同国アーカイブ、Story→関連週報、の循環にする。

### 4.5 Discoverと画像検索

earth-trendは視覚性が高く、DiscoverやSNSと相性が良い。Google Discoverは、インデックス済みでポリシーを満たせば特別なschemaなしで対象になり、タイムリーで独自の洞察と、幅1200px以上の高品質画像を推奨している。[14] 現在の1200×630 OG画像はサイズ条件を満たすが、国ページごとの「その瞬間の特徴」が伝わる構図にする余地がある。

- Story/週報ごとに固有OG画像を作る。
- `max-image-preview:large` を許可する。
- ロゴだけではなく、その記事の比較図を `og:image` と本文内画像にする。
- altには「赤い円が新規、円の大きさが検索量」など図の意味を記す。
- 画像保存時に小さくドメインと時刻を入れ、共有先から戻れるようにする。

### 4.6 配信チャネル

#### X / Bluesky

毎日1投稿ではなく、シグナルがある時だけ投稿する。型を固定する。

> いま5カ国で同時に急上昇している「○○」。最初は韓国、40分後に日本と米国へ。背景は…… [比較画像]

単なるトレンド一覧の自動投稿はノイズになる。国横断の発見とリンクを1つに絞る。

#### Reddit / Hacker News / Product Hunt

ローンチを連投しない。`r/dataisbeautiful`、`r/InternetIsBeautiful`、`r/SideProject` 等には、各コミュニティの現行ルールを確認し、サイト宣伝ではなく「独自に見つけたデータ上の発見」を投稿する。コードや方法を説明できる状態にする。英語版の初期被リンクと率直なUXフィードバックが目的で、継続流入の主柱にはしない。

#### 記者・ニュースレター・授業

「無料ツールです」では弱い。毎週の具体的な発見を、記者・データジャーナリスト・海外ニュース系ニュースレターに10〜20件だけ個別送付する。引用しやすい固定URL、PNG、方法、注意点を同梱する。Google自身もGoogle Trendsをニュースルーム向け教材として提供しており、検索トレンドと報道の用途はすでに成立している。[15]

#### メール

再訪の兆候が確認できてから「週1・世界の関心3件」のメールを追加する。日次通知は個人運営では品質維持が難しく、解除率も上がりやすい。登録前に週報12本を作り、何が届くかを見せる。

## 5. 90日アクションプラン

### 0〜14日: 壊れた流入を止め、基準値を作る

1. Search Consoleでドメイン所有権を確認し、サイトマップを送信。`/`, `/jp`, `/en/us`, `/es/tw` をURL検査する。
2. Bing Webmaster Toolsにも登録し、サイトマップを送る。固定記事の公開・更新時だけIndexNow通知を検討する。IndexNowは変更通知であり、インデックス保証ではない。[16][17]
3. seed付き分析ページを `noindex,follow` にする。永続化できるまでサイトマップ上の `/analysis` も低優先ではなく非インデックス候補とする。
4. すべて同じ `lastmod` をやめ、実際の更新時刻にする。
5. トップへ渡すデータを `word / traffic / firstSeen` に絞る。検索用の説明文は1回だけHTMLに置く。
6. `max-image-preview:large` を設定する。
7. GA4とSearch Consoleを接続し、下記のダッシュボードを作る。
8. ChatGPT referral、Bing/Copilot、organic socialをチャネルとして明示する。
ff成果物: 技術エラー0、基準値レポート、週報テンプレート、配信文テンプレート。

### 15〜45日: 検索・共有資産を作る

1. 「世界の関心週報」を毎週1本、計4本公開する。
2. 各記事に固有の1200×630画像、編集者名、データ時刻、方法、出典を付ける。
3. トップと各国ページから最新週報へ内部リンクする。
4. X / Blueskyで週3件以内、1投稿1発見で配信する。
5. 英語版を同時公開。スペイン語版はGA4でスペイン語圏の利用が確認できてから優先度を上げる。
6. データ可視化コミュニティへ、最も面白い1本だけ投稿する。

成果物: 4本の固定URL、4枚以上の共有画像、最初の第三者言及・リンク。

### 46〜90日: 勝った型だけ増やす

1. 反応の良かった週報テーマをStory化する。
2. 3カ国以上で同時上昇する語を自動検出し、公開候補キューを作る。
3. 記者・ニュースレター20件へ、相手に関連する発見だけを送る。
4. 再訪率があるなら週刊メールを開始する。
5. 国別・テーマ別のどちらが検索と再訪を生むか比較する。
6. CPU、転送量、キャッシュヒット率をセッション数と並べ、成長1,000セッション当たりのコストを見る。

成果物: 12本前後の週報、勝ちテーマ2〜3種、繰り返せる配信ループ。

## 6. 計測設計

### 北極星指標

**Weekly Meaningful Explorers**: 1週間に「2カ国以上を見た」または「トレンド詳細から分析・検索・共有のいずれかを行った」ユニークユーザー数。

単純PVより、earth-trend固有の価値である「国をまたいで発見した」を測れる。

### ファネル

| 段階 | 指標 | 既存イベント / 追加 |
|---|---|---|
| 獲得 | organic clicks、referring domains、AI referrals、SNS referrals | Search Console、GA4 |
| 初回価値 | トップ→国、国切替、バブル選択 | `country_change`, `bubble_select` |
| 深掘り | 分析、Google検索、ニュースクリック | `explore_click`, `google_search_click`; `news_click`を追加 |
| 拡散 | 共有、画像保存 | `share_click`, `share_image_download` |
| 継続 | 7日/28日再訪、週報再訪、メール購読 | GA4 cohort; `newsletter_signup` |
| 効率 | 1,000 meaningful explorers当たりCPU・転送量 | Vercel + GA4 |

### 90日間の判断基準

現時点で母数が取れていないため、架空のPV目標は置かない。まず以下を満たす。

- インデックス可能なページでエラー表示: 0
- 安定したcanonicalページのインデックス率: 90%以上を目安
- トップ訪問者の国ページ到達率: 20%以上を仮説値として検証
- 国ページ訪問者の深掘り率: 10%以上を仮説値として検証
- 共有または画像保存率: 1〜3%を初期レンジとして検証
- 4週連続で週報を公開し、各記事の検索表示回数と外部参照を計測
- 90日で質のある参照ドメイン10件を目標。ただし相互リンクや大量登録は使わない

数字が基準を下回った場合、記事本数を増やす前に、見出し、画像、国横断の発見の質を直す。

## 7. 今やらないこと

- 125カ国対応を急がない。24カ国で比較体験を完成させる。
- 全トレンドのAI自動記事化をしない。
- `llms.txt` や特殊なAI schemaを成長施策の中心にしない。
- FAQ schemaの増産をしない。GoogleのFAQリッチ結果は主に著名な政府・医療サイトに限定されている。[18]
- 広告を買って未完成の継続導線へ流さない。
- SNSで自動投稿を大量生成しない。
- PVだけで成功を判断しない。

## 8. 優先度つき実装バックログ

### P0

- 分析クエリURLの `noindex,follow` または永続化
- sitemap `lastmod` の正確化
- トップのRSC/HTMLペイロード削減
- Search Console / GA4 / Vercelの共通ダッシュボード
- OAI-SearchBot到達確認、ChatGPT referralのチャネル定義

### P1

- 週報用の固定URL、Article metadata、固有OG画像
- 国横断クラスタ候補の自動抽出
- 週報↔国ページ↔分析の内部リンク
- `news_click` と週報読了イベント
- `max-image-preview:large`

### P2

- RSS/Atomフィード
- 週刊メール
- 埋め込み可能な小型ウィジェット
- 記者向けPNG/CSVダウンロード
- 利用が確認できた言語・国だけ追加

## 最終提言

earth-trend は、ライブの「眺めて面白い」はすでに持っている。足りないのは、その瞬間を後から見つけ、引用し、共有し、翌週戻れる形にすることだ。

最も費用対効果が高い次の一手は、**インデックス品質の修正とトップ軽量化を行いながら、「世界の関心週報」を週1本、12週間続けること**。AIはその週報を大量生産するためではなく、24カ国から人間では見落とす共通点を見つけるために使う。この形なら、公式Google Trendsと競争せず、earth-trendにしかない一次的な分析とブランドを積み上げられる。

## Sources

1. [Google Trends launches Trending Now experience with new insights — Google](https://blog.google/products-and-platforms/products/search/google-trends-trending-now-update/)
2. [Real-time Global Search Trends & 3D Visualization — TrendMap](https://www.trendmap.org/)
3. [GoogleTrendArchive: A Year-Long Archive of Real-Time Web Search Trends Worldwide — ICWSM/AAAI](https://ojs.aaai.org/index.php/ICWSM/article/view/42793)
4. [Google users are less likely to click on links when an AI summary appears — Pew Research Center](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)
5. [The Top 50 Sites Getting Traffic from AI Chatbots — Similarweb](https://www.similarweb.com/blog/marketing/seo/top-50-sites-getting-ai-chatbots-traffic/)
6. [Publishers and Developers FAQ — OpenAI](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
7. [Optimizing your website for generative AI features on Google Search — Google Search Central](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
8. [AI features and your website — Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
9. [Creating helpful, reliable, people-first content — Google Search Central](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
10. [Build and submit a sitemap — Google Search Central](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
11. [Sitemaps ping endpoint is going away — Google Search Central](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)
12. [Guidance on using generative AI content on your website — Google Search Central](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
13. [General structured data guidelines — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
14. [Get on Discover — Google Search Central](https://developers.google.com/search/docs/appearance/google-discover)
15. [Basics of Google Trends — Google News Initiative](https://newsinitiative.withgoogle.com/resources/trainings/google-trends/basics-of-google-trends/)
16. [IndexNow Documentation](https://www.indexnow.org/documentation)
17. [IndexNow FAQ](https://www.indexnow.org/faq)
18. [Changes to HowTo and FAQ rich results — Google Search Central](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
19. [Trendopic — Trending Topics by Country & Local Discussions](https://trendopic.com/)
20. [TrendPulse — What the World Searches For](https://trendpulse.quest/)
21. [AI TrendMap — See What's Actually Trending Worldwide](https://ai-trendmap.com/en/)
