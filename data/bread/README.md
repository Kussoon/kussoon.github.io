# 阪神間 パン屋マップ｜共通Excel正本（v1.4.4）

このフォルダは**5市共通Excelマスターの正式採用案**です。ドラフトPRがmainにマージされるまでは、正式な公開済み正本ではありません。

## 正本と比較用データ

- [共通Excelマスター v1.4.4](masters/five-city-master-v1.4.4-20261111.xlsx) — **正本**。263件、11シート、式・履歴・管理項目を保存。
- [manifest.json](manifest.json) — 正本の版番号、SHA256、11シート、公開HTMLとの同期を管理。
- [比較用CSV](views/five-city-master-v1.4.4-20261111.csv) — GitHub上の差分確認用。**CSVは正本ではありません。**

新しいExcelは作り直していません。PR [#414](https://github.com/Kussoon/kussoon.github.io/pull/414) に保存されたv1.4.4**候補**のExcelを**同一Git blob・同一SHA256**のまま正式用ファイル名へ配置する提案です。原本の概要・履歴に残る「候補」という表記は、作成時点の記録として保持し、採用状態はmanifestで管理します。数式・書式・入力規則等を崩す再保存はしていません。

## 採用する内容

- 管理263件（通常掲載245・参考候補17・閉店履歴1）、公開262件。
- 座標修正9件：**No.17・97・107・111・112・113・114・207・209**。
- 他254件の座標、店名・住所・公式リンク・備考・公開文に変更なし。
- No.97の概略位置、No.209の売場営業実態未確定、その他の未解決事項は**確認済みへ昇格しません**。
- Excelの座標が正確であることと、店舗の営業継続・入口の実測・全件の位置確定とは別です。

## 公開HTMLとの同時採用

本提案では本番HTML [阪神間 パン屋マップ](https://kussoon.com/maps/unified-bread-map.html) の **v1.3.13** への変更と、Excel v1.4.4の正式採用を**1つの公開用PRでまとめます**。元の本番HTMLはv1.3.11です。

- [Kussoon公式ドメインの検証ページ](https://kussoon.com/v2/verification/bread-integration/20261111/)：PR #420により既に検証用HTMLだけ公開。検索エンジン非掲載指定。
- 利用者から2026-11-11に**iPhone Safariの6項目が正常**との実機確認報告あり。
- PR #418の統合版はChromium/WebKit × PC/スマホ幅 × MarkerCluster正常/読込失敗の8条件合格。
- 元の[公開用HTML単独ドラフトPR #421](https://github.com/Kussoon/kussoon.github.io/pull/421)は**マージせず保存**し、本提案の同時採用PRが最終公開候補となります。二重マージを避けてください。

監査・根拠は[PR #410](https://github.com/Kussoon/kussoon.github.io/pull/410)、[PR #412](https://github.com/Kussoon/kussoon.github.io/pull/412)、[PR #413](https://github.com/Kussoon/kussoon.github.io/pull/413)、[PR #414](https://github.com/Kussoon/kussoon.github.io/pull/414)および[PR #418](https://github.com/Kussoon/kussoon.github.io/pull/418)を参照してください。**これらの既存PRを連続マージする必要はありません**。

## 次回以降の管理

新しい正本は版番号・日付つきの別ファイルとして追加し、既存のマスターはGitHub履歴で保存します。将来の店舗営業実態監査やB/D/E座標再調査は今回の9件修正とは別工程とし、確認できない情報を勝手に確定させないでください。

**正式公開・PRマージはユーザーの最終承認後のみ。**
