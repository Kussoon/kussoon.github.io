# 全国イオン系列スーパー分布図 Ver.0.1

PR #769の全国4,613店舗を行政区域コードで可視化するKussoonの検証版。台帳基準日は2026年11月23日、行政区域基準日は2026年1月1日。市町村単位と行政区単位の切替、4種類の表示対象、自治体検索、店舗詳細とランキングを収録しています。

[集計照合](data/validation.json) · [ブラウザ検証](browser-verification.md) · [出典と利用条件](data-sources.md) · [確認事項](unresolved.md)

## 手元で表示

リポジトリまたは確認用ZIPから実行できます。ZIPには生成済みの画面形状と再利用する地図操作スクリプトが含まれるため、展開後すぐ手元で起動できます。リポジトリから起動する場合は下の手順で画面形状を生成します。

```bash
python serve-preview.py
```

起動時に表示されるURLを同じ端末のブラウザで開きます。サーバーが配信するページには検索除外を設定しています。公開URLの設置条件は[出典と利用条件](data-sources.md)に記載しています。

## 再生成と検査

Python 3.11以上、openpyxl 3.1.5、Node.jsを使用します。次回更新時は、先に[PR #769の再生成手順](https://github.com/Kussoon/kussoon.github.io/blob/9be7cc4adc05a604df47fa85f34339e43c050373/v2/verification/aeon-municipality-distribution-data-v0.1/README.md)で最新のExcel、照合JSON、行政区域監査、採用根拠から集計版を作成・検査してください。

今回の固定集計版は `9be7cc4adc05a604df47fa85f34339e43c050373` です。そのコミットを取得し、`git archive` 等で `v2/verification/aeon-municipality-distribution-data-v0.1/` を作業用ディレクトリに展開します。`--snapshot` はそのディレクトリを指します。`--workbook` は同版が参照するExcel正本を指定します。

```bash
python -m pip install openpyxl==3.1.5
python prepare-data.py --snapshot /path/to/aeon-municipality-distribution-data-v0.1 --workbook /path/to/master.xlsx
python prepare-geometry.py
node verify-map.mjs
```

1. `prepare-data.py` はPR #769の集計原票と、台帳の表示名・公式住所原文・公式URLを店舗IDで照合します。全県で集計する小型の `data/index.json` と、自治体詳細を開いたときに読む県別 `data/stores/*.json` を作成します。`data/validation.json` に原票ハッシュと照合結果を記録します。
2. `prepare-geometry.py` は現行の地図HTML・manifestが参照する47県のTopoJSONから、全国概要と都道府県別の詳細SVGパスを `data/geometry/` に作成します。境界配信用の生成データはローカルの検証成果物です。
3. 集計版を変更する場合は `prepare-data.py` の `PR_HEAD` と想定件数、画面に表示する基準日を確認し、固定値の期待件数を `verify-map.mjs` と `verify-browser.py` の検査で更新します。対象区域・階級は元の集計との照合を行ってください。
4. 動作確認にはPlaywrightを使用します。`python verify-browser.py --engine chromium` はインストール済みのChromiumを使い、`--engine webkit` はPlaywrightのWebKitを使用します。`--url` にローカル検証サーバーのURL、`--profile` に検査する画面幅を指定できます。

今回の作業は隔離した検証ディレクトリに限定しています。公開の全国市区町村マップ、ナンバープレート、兵庫県の記事、既存の全国店舗位置マップ、サイトマップのGit差分は0件です。
