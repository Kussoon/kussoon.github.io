# V2町名データ候補の検査・変換ツール

このツールはPR #450の調査用です。**自治体の現行町名と2020年統計境界は同一と断定できません。** 出力ファイルを正式な町名図に直接接続しないでください。

## 使い方

CODH/Geoshape 2020「町丁・字等別境界データセット」から、当該市町のGeoJSONまたはTopoJSONをダウンロードし、出典・版を控えてください。Webブラウザ上で公開データを直接読み込む方式はCORS・配信元変更に依存するため採用しません。

```sh
node scripts/build-town-candidates.test.cjs
node scripts/build-town-candidates.cjs 28217 /path/to/28217.geojson /tmp/kawanishi-candidates.json
node scripts/build-town-candidates.cjs 28219 /path/to/28219.topojson /tmp/sanda-candidates.json
node scripts/build-town-candidates.cjs 28301 /path/to/28301.geojson /tmp/inagawa-candidates.json
```

生成ファイルは検索用の仮の地名、統計区画ID、重複候補、出典を含みます。**形状は書き出さず、別の元ファイルを維持します。** 町名候補数は町名数の確定値ではありません。

## 未完了の検証

- 元ファイルの取得、ダウンロード元の原典確認、自治体ごとの全件監査
- `S_NAME` 等の属性名を実データで検査（未対応の項目名は空名エラーとなる）
- 名前の表記揺れ・外字の検査、読み仮名の自治体資料照合
- 町名と統計区画の対応、境界の視覚比較、過去5市との規則照合
- iPhone Safari・Android・PCによる地図の表示検査

### 安全性
出力には `status: unverified-statistical-areas` と `readingVerified: false` が付きます。既存の `v2/geography/data/hierarchy.json` や `v2/region-top/data/regions.json` は触らず、未検証リンクを追加しません。
