# GA4接続(データ駆動の改善サイクル用)

AIエージェント(Claude)がGA4の実データを読んで改善提案できるようにするため接続。
方針: 「分析→提案」はAIが自律、「実装→デプロイ」はオーナー承認(自動デプロイ禁止の既存方針と一致)。

## 構成の考え方

- 読み取りはGoogle Analytics Data API(GA4)。サービスアカウント認証を使う。
- サービスアカウントを作るGCPプロジェクトの所有者と、GA4プロパティの所有者は別アカウントでよい —
  GA4側の「管理 → プロパティのアクセス管理」でサービスアカウントのメールを「閲覧者」として招待すれば繋がる
  (GCPプロジェクトの所有権とは無関係)。
- プロパティID・サービスアカウントのメールアドレス・鍵ファイルなど具体的な識別情報は
  **このリポジトリがpublicのためコミットしない**(Claudeのメモリ側で管理)。
- 鍵ファイルは `.secrets/` 配下に置き、gitignore済み。**絶対にコミットしない**。

## 読み取り方法

Python `google-analytics-data` ライブラリ(または任意のGoogle Auth対応クライアント)で
`GOOGLE_APPLICATION_CREDENTIALS=<鍵ファイルパス>` を指定して `BetaAnalyticsDataClient` から
`properties/<GA4プロパティID>` にクエリする。

```python
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric

client = BetaAnalyticsDataClient()
req = RunReportRequest(
    property="properties/<GA4プロパティID>",
    dimensions=[Dimension(name="pagePath")],
    metrics=[Metric(name="screenPageViews"), Metric(name="activeUsers")],
    date_ranges=[DateRange(start_date="7daysAgo", end_date="today")],
)
resp = client.run_report(req)
```

再現用の使い捨てvenvが必要な場合: `pip install google-analytics-data`(プロジェクト本体の依存には加えていない。
分析はスクラッチ的に行う想定のため)。

具体的な接続情報(プロパティID・サービスアカウントメール・鍵の再発行コマンド等)はClaudeのメモリに保存済み。
