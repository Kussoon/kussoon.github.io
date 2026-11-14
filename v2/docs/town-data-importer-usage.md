# V2町名データ候補の検査・変換ツール

PR #450の調査・比較試作用です。自治体の現行町名と2020年統計境界は同一と断定せず、出力は正式データへ直接接続しません。

## 使い方

```sh
node scripts/build-town-candidates.test.cjs
node scripts/build-town-candidates.cjs 28217 v2/data/towns/kawanishi-2020.topojson /tmp/kawanishi-candidates.json
node scripts/build-town-candidates.cjs 28219 /path/to/28219.topojson /tmp/sanda-candidates.json
node scripts/build-town-candidates.cjs 28301 /path/to/28301.geojson /tmp/inagawa-candidates.json
node scripts/audit-kawanishi-town-source.cjs
```

TopoJSONでは`town`レイヤーを優先し、市域外枠の`city`レイヤーを町名候補に混ぜません。ポリゴンの一意なIDには`R2KAxx_ID`を優先し、`KEY_CODE`が同名区画で重複し得ることを記録します。出力の読み仮名は未照合のままです。川西市の比較試作用ABR読みデータは別ファイルで照合状態を明示します。

## 保持する区別

- 統計ポリゴン数、異なる統計表示名、現行住所町字数は別々に数えます。
- 同名の複数ポリゴンは検索表示ではまとめ、地理形状と元区画IDは保持します。
- 住所名と読みの照合は、統計境界の現行性や正式町名性を証明しません。
- 読み不明や異表記は推測で補完せず、出典・照合状態を記録します。

## 安全性

既存5市の町名データ、`v2/geography/data/hierarchy.json`、`v2/region-top/data/regions.json`、全国V2の規則・地図は変更しません。正式な町名地図への接続は現行資料照合と実機確認後に行います。
