# 阪神間お菓子マップ 管理用正本

次回の店舗調査・地図更新には [管理用Excel v0.4.3](masters/kussoon-sweets-common-master-v0.4.3-20261121.xlsx) を使用します。5市510店舗・10シートを収録しています。

2026年11月21日、[PR #426](https://github.com/Kussoon/kussoon.github.io/pull/426) で公開済みの住所3件を同期し、店舗IDで公開429店舗の住所がすべて一致することを確認しました。変更前後の住所はExcelの「変更履歴」で確認できます。

- [店舗マスター比較CSV（510店舗）](views/kussoon-sweets-master-v0.4.3-510stores-20261121.csv)
- [正本の版・保存先・SHA-256](manifest.json)

## 更新方法

住所や座標を変更するときは、この正本から次版を作り、店舗IDで公開HTMLの該当項目と照合します。更新したExcel、変更履歴、比較用CSV、正本へのリンクを同じPRで管理します。

## 過去の版と監査記録

- [v0.4.2 S2検証候補](masters/kussoon-sweets-common-master-v0.4.2-s2-candidate-20261112.xlsx)
- [v0.4.1検証候補](masters/kussoon-sweets-common-master-v0.4.1-candidate-20261102.xlsx)
- [S2座標監査の採否と検証結果](../../v2/verification/sweets-s2-coordinate-audit/20261112-final/)（採用24店舗、保留82店舗）
