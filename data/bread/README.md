# 阪神間パン屋マップの管理用正本

次回の月次点検には [5市共通Excel v1.4.5](masters/five-city-master-v1.4.5-20261121.xlsx) を使用します。[公開地図 v1.3.13](https://kussoon.com/maps/unified-bread-map.html) のデータ更新日は2026年11月11日です。管理263件のうち通常掲載245件・参考候補17件が公開対象で、1件は閉店履歴です。

2026年11月21日、No.17・97・107・207・209の緯度・経度セルを列順に並べ直しました。読み取り専用モードでも各行の後半にある店舗キーや管理番号を読み取れます。11シートとセルの内容を継承しています。[旧正本 v1.4.4](masters/five-city-master-v1.4.4-20261111.xlsx) と[比較用CSV](views/five-city-master-v1.4.4-20261111.csv) は引き続き参照できます。採用版・データ日・ハッシュは [manifest.json](manifest.json) に記録します。

## 監査と公開の経緯

| 資料 | 引き継ぐ内容 |
|---|---|
| [#410](https://github.com/Kussoon/kussoon.github.io/pull/410)・[#413](https://github.com/Kussoon/kussoon.github.io/pull/413) | 全263件の座標監査と重点12件の二次調査。No.5・92・93・192・214は追加根拠待ち。 |
| [#412](https://github.com/Kussoon/kussoon.github.io/pull/412)・[#414](https://github.com/Kussoon/kussoon.github.io/pull/414) | いかり4店舗と追加5店舗の座標差分。No.97は概略位置、No.209は売場の営業実態が未確定。 |
| [#415](https://github.com/Kussoon/kussoon.github.io/pull/415)・[#418](https://github.com/Kussoon/kussoon.github.io/pull/418) | 連続検索時のピン消失、クラスタ読込失敗時の対策と統合検証結果。 |
| [#419](https://github.com/Kussoon/kussoon.github.io/pull/419)・[#420](https://github.com/Kussoon/kussoon.github.io/pull/420) | iPhone用の一時プレビューと公式ドメインの実機確認用ページ。 |
| [#421](https://github.com/Kussoon/kussoon.github.io/pull/421)・[#422](https://github.com/Kussoon/kussoon.github.io/pull/422) | HTML単独案を経て、#422で公開地図v1.3.13と旧正本v1.4.4を同時採用。 |

## 次回の更新

正本を版番号・日付付きの別ファイルとして保存し、店舗キーでExcel・比較用CSV・公開HTMLを照合してください。店舗データを変更したときは、変更履歴と管理記録を同じPRで更新します。営業状況や入口位置の未確定事項は「未解決事項」シートから引き継ぎます。
