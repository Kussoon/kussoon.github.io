# パン屋マップ住所・座標監査（2026-11-11）

このフォルダは263件の監査資料と比較ページです。座標候補は本番マップ・Excel正本へ反映していません。

- [比較ページ（v2検証環境）](https://kussoon.com/v2/verification/bread-coordinate-audit/20261111/)
- [全263件の監査Excel](reports/kussoon-bread-coordinate-audit-20261111.xlsx)
- [修正推奨・要確認Excel](reports/kussoon-bread-coordinate-issues-20261111.xlsx)
- [監査報告書](reports/kussoon-bread-coordinate-audit-report-20261111.md)
- [比較ページと同じ263件のCSV](reports/audit-records.csv)

## 保管と採否

Excelは監査成果物です。店舗の共通Excelマスターではありません。共通マスターの更新・正本の切替はこのPRに含みません。

GitHub上のファイルとコミット履歴で版を追跡できます。iPhoneに毎版保存する必要はなく、必要な版だけ取得できます。PRが未マージの間、これらの追加資料はPRのブランチ上にのみあります。v2比較HTML自体は先の依頼でmainに配置済みです。

報告書は成果物作成時点の記録を保全しています。「PRを作成していない」という記述はその時点の状態です。本PRはその後に監査資料の保管と検証追加を行うものです。

## 自動検証

`.github/workflows/bread-coordinate-audit.yml` はPRで実行し、正本やPagesを更新する処理を持ちません。権限はcontents:readです。

- 263件、No./キーの重複なし、通常245・参考17・閉店履歴1
- A4・B53・C137・D4・E65、距離未確定67件
- 修正候補はNo.111〜114のみ
- Chromium/WebKit、幅1440px・390pxで検索、絞り込み、現位置/候補切替、閉店履歴、横方向のはみ出しを確認
- スクリーンショット・実行結果はActionsのArtifactsに14日間保存

テストは地図タイルへの通信を意図的に止め、背景地図を取得できない状態でも操作が成立するか検証します。スクリーンショットはオフライン背景です。実際の地図画像・建物外形・座標精度、iPhone Safari実機の確認を意味しません。Excel/CSVはブランチに保存されるため、ActionsのArtifactsの保存期限とは無関係です。

マージや本番への座標反映はユーザーの別途承認が必要です。
