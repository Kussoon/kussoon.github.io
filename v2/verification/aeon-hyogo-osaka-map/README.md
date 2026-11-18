# 兵庫・大阪318店舗 統合地図検証版

[地図を確認する](https://kussoon.com/v2/verification/aeon-hyogo-osaka-map/)

正式公開前の検証ページ。兵庫176／大阪142。店舗台帳の基準日は2026-11-18（兵庫営業情報は11-15正本）、大阪座標の最終確認日は2026-11-19。本文は兵庫県公開版を維持している。

- [座標監査報告](COORDINATE-AUDIT.md)
- [大阪142店の座標・出典CSV](osaka-coordinate-audit.csv)
- [P3全99店の追加照合CSV](osaka-coordinate-followup.csv)
- [未解決事項](UNRESOLVED.md)
- [ブラウザ・データ検証報告](VERIFICATION-REPORT.md)
- [正式公開前チェックリスト](PREPUBLICATION-CHECKLIST.md)
- [機械検証結果](DATA-VALIDATION.json)
- [更新Excelの識別情報](DELIVERABLE-MANIFEST.json)

Excelは納品ファイル `hyogo-osaka-aeon-master-v0.2-coordinates-20261118.xlsx` を使用。兵庫176行の全35項目は入力正本と同一。大阪はP4 43／P3 99。全318店の同一データを地図・一覧へ使用する。

本番ページ、総合トップ、サイトマップは変更しない。noindex,nofollowは検索除外の指定であり、認証によるアクセス制限ではない。

`verify.cjs` はリポジトリルートで `node v2/verification/aeon-hyogo-osaka-map/verify.cjs` として実行。依存関係とChromium／WebKitを `v2/tests/browser` に準備する。専用GitHub Actionsが同じ処理を実行する。座標空欄のテストデータはローカル検証サーバーだけで生成し、配信HTMLに架空の座標を保存しない。
