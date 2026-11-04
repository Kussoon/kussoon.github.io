# V2全国統合版・総合監査（2026-11-04）

監査基準: 最新main `c69c970c982724b20d9a327e1fd1c223f356aebd`。
対象: [2026全国統合試作](https://kussoon.com/v2/national/official-2026-nationwide-pilot.html)。
開始時点のPR #1〜#245を対象とし、V2関連218件／対象外27件へ分類した。

|成果物|参照先|
|---|---|
|① 現在有効な確定仕様書|[既存MAINTENANCE_RULESを更新](../national/MAINTENANCE_RULES.md)|
|② PR履歴・仕様照合台帳|[pr-spec-ledger.md](pr-spec-ledger.md)|
|③ 未反映・回帰疑い一覧|[regression-findings.md](regression-findings.md)|
|④ 回帰テスト整備計画|[regression-test-plan.md](regression-test-plan.md)|

主要な仕様判断単位40件: 正常反映15／未反映・回帰疑い8／意図的変更4／要確認13。
これはPR件数、URL分類件数、個別テストケース数とは別の集計。
全PRの細部を40規則だけで網羅したという意味ではない。Cを除く現行要件・継承確認項目は36件。

今回の変更はこの文書群のみ。本体HTML・JS・JSON、CI設定、テスト実装は変更しない。
実ブラウザは起動できず、iPhone Safariも未確認。
Nodeの実ページ処理検証はgeometry・viewportをスタブ化しており、実画面の確認とは区別する。
APIで省略された77ファイルのpatch、レビュー提出の全件確認、全47地図形状の再生成・照合は残件として台帳に明記した。

既存テスト11ファイルは合格。別の旧庁舎テストは8項目中6合格・2失敗で、古い期待値の不整合を記録した。
「全テスト合格」「全機能監査完了」「公開サイト正常」とは報告しない。
本監査の集計と判定は上記SHAに固定し、後続PRで更新する。

公式URLの既存資料は再利用する。
[全国分類台帳](official-url-nationwide-classification-20261103.json)の1,912区域と現行庁舎JSONは、URL・分類とも全件一致した。
分類はA 1,907／B 1／C 1／未判定3。これは2026-11-03までの既存調査証拠であり、今回外部URLを全件再訪問した結果ではない。
旧61件の[引継ぎ記録](official-url-followup-20261102.json)を新しい分類台帳へ無条件に上書きしない。
