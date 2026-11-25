# 全国イオン系列スーパー 市区町村別分布データ v0.1

店舗基準日 2026-11-23。Excel Ver.1.3.3の通常掲載4,613店舗を、住所に対応する行政区域、屋号、実運営法人で集計した検証版です。市単位は1,741区域、行政区単位は1,892区域を集計母数とします。

- [結果・監査・残件](audit-report.md)
- [データ仕様](DATA_SPECIFICATION.md)
- [出典・利用条件](data-sources.md)
- [集計サマリー](generated/summary.json)
- [市単位の集計](generated/city/) ／ [行政区単位の集計](generated/ward/)
- [屋号・グループ全対応と店舗ID](generated/audit/brand-crosswalk.csv) ／ [個別確認対象](generated/audit/individual-followup.csv)

## 再生成

リポジトリをチェックアウトし、このディレクトリから実行します。Python 3.11以上とGitを使います。入力ファイルは作業用ディレクトリに置きます。[固定版URLとハッシュ](data-sources.md)

```bash
python -m pip install -r requirements.txt
python build-data.py --workbook /path/to/master.xlsx --audit /path/to/audit.zip
python verify-data.py --workbook /path/to/master.xlsx --audit /path/to/audit.zip
```

既存の地図用JSONは既定でリポジトリの `v2/verification/aeon-national-map-v0.11/stores.json` を参照します。別版を突合する場合は `--legacy` を指定します。生成先は `generated/` です。別の検証先には `--output` を指定します。

将来版はExcelの同じ列・シートと、全通常掲載IDを収録した同版の照合用JSONおよび住所監査を渡します。住所監査は全件CSVまたはそのCSVを `01-…csv` として格納したZIPに対応します。掲載4区分の期待件数が変わる場合は `--expect` にキーが `通常掲載`、`参考・保留`、`対象外`、`履歴・休業・予定` のJSONを渡します。地図データを更新する場合はそのチェックアウトを `--repo` に渡し、`verify-data.py --base` に保護対象を含む比較元コミットを指定します。確認一覧をレビューし、入力が変わったID別ルールを根拠とともに見直します。

構造上の不一致は異常終了します。レビュー待ちはサマリーで `pending` を返します。確認待ちも終了コードで判定する場合は両プログラムに `--strict` を付けます。v0.1の厳格検査は確認待ちのため終了コード2です。
