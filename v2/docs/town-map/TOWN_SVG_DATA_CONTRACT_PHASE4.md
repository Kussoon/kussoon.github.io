# Kussoon V2｜町名SVGデータ契約・共通化第4段階（2026-11-17）

## 目的・適用ゲート
西宮市SVG第6比較版の見た目・動作・クイズ・既存データを**一切変更せず**、将来の他市導入に先行して自治体単位のデータ読込契約を共通化する。

共通モジュール：`v2/common/js/town-svg-data-contract.js`。この第4段階は**データ読込・基礎検証のみ**を担当する。地図の投影、ラベル配置、地域間の所属境界、点滅、クイズ採点、iPhoneの操作は担当しない。

### 入力 manifest
| キー | 説明・必須性 |
|---|---|
| municipalityId | 必須。ASCII英小文字・数字・ハイフンの自治体識別子 |
| topologyUrl | 必須。サイト内絶対パス。TopoJSON |
| mappingUrl | 必須。サイト内絶対パス。地域所属JSON |
| exceptionUrl | **任意**。特殊形状がある自治体のみ指定。未指定なら余分なファイルを読まない |
| objectName | 必須。TopoJSON内の町域オブジェクト名 |
| townNameProperty | 必須。図形の町名IDプロパティ |
| expectedTownCount | 必須。正の整数。独立町名数と照合 |
| expectedRegionCount | 必須。正の整数。地域数と照合 |

`KussoonTownSvgDataContract.load(manifest, {fetchJSON, topojsonClient})` は、既存ページが必要とする `topology, mapping, subtopology, features` と検証済みの `manifest` を返す。特殊形状未指定の場合のみ `subtopology=null`。

### 検証内容
- 町域TopoJSONの形式・対象オブジェクト、町名数、町名IDの欠落・重複。
- コミュニティ配列の地域数、名前の欠落・重複、町名所属レコードの基本形式。
- 特殊形状URLの有無を区別し、無ければアクセスしない。
- 入力に勝手な町域結合、分割、地域割当変更、読み補完、ラベル追加・間引きをしない。

### 西宮市への互換性検査
`scripts/test-town-svg-data-contract.cjs` で西宮市の実データ `v2/data/nishinomiya-town-v2-premerged.topojson` と `/nishinomiya/data/community-town-map.json` および `v2/data/nishinomiya-uekoto-community.topojson` をロードし、321町名・26コミュニティ・特殊形状6図形をチェックする。さらに特殊形状不要な別の**架空データ**で、飛び地をMultiPolygonとして町名ID1件に保ち、例外ファイルを読まないことを確かめる。

**架空データは宝塚・尼崎の実データではない**。実際の飛び地・「船出」周辺の所属には出典確認と市固有の例外設定が必要。

### 重要な設計上の残件
1. この段階は既存の `town-svg-core.js` を置換しない。既存の `loadTownData` は例外TopoJSON必須のまま残り、正式V6もそれを使う。
2. 地域割当の正規化・複数所属（岡田山など）の例外は西宮市側のHTMLにあり、移行しない。地域JSONの所属先が既知の26地域に含まれるか、全321町に所属が存在するかはこの新ローダーの責任外。後続の地域所属アダプターで検証する。
3. 全321町名の読み、ラベル補正、クイズ採点は従来の確定ルールと全件回帰を必要とする。
4. 共通エンジンの完成宣言・他市公開・西宮市正式置換は、設計・自動検査・利用者の実機確認を経てから行う。

## 採否
独立した新部品としてCI成功なら採用可能。ただし**既存SVG第6比較版への組み込みと他市適用はこのPRの範囲外**。マスター仕様の仕様変更としては「特殊形状を全市で必須としない」ことを採用候補とする。
