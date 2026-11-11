# 最終統合検証版（未公開）

ドラフトPR：[#418](https://github.com/Kussoon/kussoon.github.io/pull/418)。PR #414の先に積み重ね、#415の初期化差分のみ適用。main・本番・既存5PRは変更していません。

- [統合検証HTML](unified-bread-map-v1.3.13-integrated-verification-20261111.html)
- [検証報告書・残る未検証事項](VERIFICATION-REPORT.md)
- [全263件の差分・Excel照合結果](all-263-diff.csv) / [静的検証JSON](validation.json)
- [最新mainとの差分表](main-comparison.csv) / [初期化コード差分](initialization.patch)
- [ブラウザー結果表](browser-results.csv) / [Actionsの証拠](evidence/actions/)
- [Excel v1.4.4候補](../../../../data/bread/masters/five-city-master-v1.4.4-candidate-20261111.xlsx)
- [専用Actions成功](https://github.com/Kussoon/kussoon.github.io/actions/runs/43024811395) / [既存V2回帰成功](https://github.com/Kussoon/kussoon.github.io/actions/runs/43024811319)

管理263・公開262、通常245・参考17・閉店履歴1を維持。9件の修正と他254件の座標不変、店舗情報・公開文・機能・Umami・フッターの保全を確認。統合版8条件と #415既存回帰8条件が全PASS。両エンジンで修正前No.111消失を再現。

## 再実行

リポジトリルートで `python3 v2/tests/verify-bread-master.py` と `python3 v2/tests/verify-bread-integration.py` を実行。参照SHAの取得・PlaywrightとMarkerCluster fixtureの準備・ブラウザー実行は `.github/workflows/bread-integration.yml` に記載。`bread-marker-refresh.browser.cjs` は #415からバイト一致で保管。親runnerは修正前の失敗理由を確認し、統合版と #415修正後HTMLの各4条件をエンジン別に実行する。

GitHub上のHTMLはコード表示です。検証用にダウンロードして使用し、正式公開しないでください。最終検収はChatで行います。
