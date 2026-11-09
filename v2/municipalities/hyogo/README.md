# 兵庫県V2（全国共通リポジトリ版）
2026年11月10日。別リポジトリ `Kussoon/hyogo` の `v2-regions.js` から承認済み10地域・49区域と郡名12件を移植し、全国共通クイズ1・2と「全域（49区域）」に対応。

出典：[兵庫県の10県民局・県民センター](https://web.pref.hyogo.lg.jp/area/)、[既存兵庫県V2の確定地域データ](https://github.com/Kussoon/hyogo/blob/main/v2-regions.js)。

- 神戸（こうべ）：9区域
- 阪神南（はんしんみなみ）：3区域
- 阪神北（はんしんきた）：5区域
- 東播磨（ひがしはりま）：5区域
- 北播磨（きたはりま）：6区域
- 中播磨（なかはりま）：4区域
- 西播磨（にしはりま）：7区域
- 但馬（たじま）：5区域
- 丹波（たんば）：2区域
- 淡路（あわじ）：3区域

神戸市9区は別々に出題。県内49区域を2026全国索引・manifestと照合する。

共通地図、ラベル、採点JS/CSSは変更しない。元の `Kussoon/hyogo` は削除・上書きしない。検証版のためnoindexを維持し、公開後にiPhone Safari実機確認を行う。

テスト：`node v2/municipalities/hyogo/quiz.contract.test.cjs`、`node v2/tests/run-national-contracts.cjs`
