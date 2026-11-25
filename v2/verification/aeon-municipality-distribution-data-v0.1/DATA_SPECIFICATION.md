# データ仕様 v0.1

## 基準と結合キー

`store_id` は変更せず、Excel「全国統合ID」と完全一致します。通常掲載シートと全国統合マスターをIDで結び、全4区分の独立シートも監査します。店舗名・住所等の比較は原値同士で行い、表示用住所と公式住所原文を区別します。

`ward_area_code` はN03、`city_area_code` は政令市の区を親市に集約したコードです。どちらも5桁文字列です。Excelの6桁コードは末尾の検査数字を検証し、先頭5桁をPR #761の住所対応コード、全国地図のコード、正規化した自治体名と突合します。`parent_city_code` は政令指定都市の区に設定します。東京23特別区は両集計で独立します。市単位の政令市親コードに対応する範囲は `area-register.csv` の `parent_city_code` で追跡できます。

`municipalities.json` の `registry` は地図、庁舎台帳、ナンバープレート形状のコード集合を統合します。`levels.city` と `levels.ward` はそれぞれの選択可能な集計範囲を示します。

| 区域状態 | 意味 | 件数 |
|---|---|---|
| `has_stores` | 住所が照合済みの通常掲載店舗あり | 店舗数 |
| `zero` | 集計対象内で該当する通常掲載IDが0件 | 0 |
| `unconfirmed` | 所属未定地や割り当て確認待ち | null |
| `out_of_scope` | 今回の商圏集計範囲外 | null |
| `other_level` | 親市または行政区を別の集計単位で計上 | null |

## 屋号と法人

`original_brand` はExcelの有効屋号、`original_raw_brand` は全管理シートの屋号原値、`legacy_map_brand` は既存地図JSONの分類です。`brand` は統一屋号案、`brand_group` はKussoon独自の表示グループ案です。グループは法人とは独立です。全対応は `brand-rules.json` と実測の `brand-crosswalk.csv` で確認できます。

ID別根拠と採否は `brand-overrides.csv` に記録します。全店について現行公式名・公式店舗名・表示用店舗名を正規化し、長い屋号から照合します。照合で得た屋号と元分類を規則に照らし、会社名・施設名・複合分類だけで個別屋号を確定しません。名称の違いは `brand-verification.csv` の各名称欄と判定欄で追跡できます。

`brand_status` の `retained` はExcel分類の採用、`candidate` は表示分類の採用案、`pending` は個別屋号の判断保留です。`brand_rule_id` と `brand_basis` が派生分類の根拠、`master_brand_basis` が台帳の根拠欄、`brand_evidence_url` が既存根拠への参照です。実運営法人はExcelの `実運営法人` を引き継ぎ、根拠を確認した例外は `operator-overrides.csv` にID・元値・根拠を記録します。それ以外の空欄は `運営会社未確認` に集計します。屋号保留・法人未確認も全4,613店舗に含みます。

## 出力

CSVはUTF-8 BOM付き。Excelで開く場合、コード列を文字列として取り込んでください。CSVの `store_ids` と `area_codes` は空白区切りです。JSON内の店舗ID一覧は配列です。

| ファイル | 内容 |
|---|---|
| `stores.json` | 店舗ID、名称、行政区域コード、屋号・法人・根拠と状態 |
| `municipalities.json`、`area-register.csv` | 全国区域台帳、地図と庁舎台帳の差、区と親市、形状パーツ数 |
| `{city,ward}/prefectures.csv` | 都道府県別件数 |
| `{city,ward}/municipalities.csv` | 自治体別件数、区域状態 |
| `{city,ward}/{brands,brand-groups,operators}.csv` | 独立した屋号、屋号グループ、実運営法人の各集計 |
| `{city,ward}/{area-brands,area-operators}.csv` | 自治体と屋号または運営会社のクロス集計 |
| `{city,ward}/{ranking,with-stores,zero-stores,area-exceptions}.csv` | 順位、店舗あり、0店舗、例外。順位は同数同順位 |
| `{city,ward}/frequency.csv` | 件数ごとの区域数と対象コード・店舗ID |
| `{city,ward}/color-bins.csv` | 全屋号・全屋号グループ・全個別屋号について9階級の区域数、区域コード、店舗ID |
| `audit/*.csv` | 4区分ID、既存地図との差、自治体と屋号の全店検査、変更候補、個別確認 |
| `summary.json` | 全国集計、分母、予備集計との差、品質項目の合否と保留、原資料ハッシュ |

屋号別色階級の0件は、その分類に割り当てられた通常掲載店舗数を意味します。個別分類の判断保留は独立した枠で計上します。全屋号の0件と区域の状態区分は別に参照できます。公開前の色階級・表示分類の採否はこの成果物の外で決定します。
