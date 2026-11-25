# KussoonのJageocoder一括住所変換 引継ぎ

## 容量確認と実行状況

対象は全国住居表示・地番辞書 `jukyo_all_v22.20260417.zip`。配布ZIPの中央ディレクトリをHTTP Rangeで取得し、各エントリーの非圧縮サイズを合計しました。ファイル本体のダウンロードは行っていません。

| 項目 | バイト | 十進GB |
|---|---:|---:|
| 配布ZIP | 5,599,646,978 | 5.60 |
| 展開後合計 | 16,674,367,468 | 16.67 |
| ZIPと展開先の合計 | 22,274,014,446 | 22.27 |
| 現環境のディスク空き | 1,405,616,128 | 1.41 |

展開後の主辞書 `address_node.sqlite` 単体でも16,390,758,400バイト。作業領域、/tmp、共有ダウンロード領域は同じファイルシステムです。/dev/shmは約5.23 GBの一時メモリ領域で、ZIP単体にも足りず、端末全体のメモリ上限も8 GiBです。別に使用できる永続ボリュームや、この環境に容量を追加する設定項目は確認できませんでした。

同じ領域にZIPと辞書を保持する場合、空き25 GiB程度の永続ストレージを用意してください。別々のディスクならZIP側に約5.60 GB、展開先に約16.67 GBと、それぞれ作業余裕が必要です。25 GiBは展開時の余裕を含む目安です。

現環境では辞書の展開、20住所のローカル再現、全国4,613住所の変換・候補抽出は未実施です。既存ファイルは保持しています。 [辞書配布ページ](https://info-proto.com/static/jageocoder/latest/)

## 導入

Python 3.12で公式パッケージ2.2.1.1をインストールできることを前回確認済みです。以降のコマンドは十分な空き容量がある作業ディレクトリで実行します。

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install 'jageocoder==2.2.1.1'
curl --fail --location --continue-at - --output jukyo_all_v22.20260417.zip 'https://info-proto.com/static/jageocoder/latest/jukyo_all_v22.20260417.zip'
printf '%s\n' '3f100270c487764a249f3c9b456f77f3c20c4229  jukyo_all_v22.20260417.zip' | sha1sum -c -
mkdir -p dictionary
unzip -n jukyo_all_v22.20260417.zip -d dictionary
jageocoder list-datasets --db-dir=dictionary
```

README.mdは辞書と同じ場所に置き、配布元、原典、ライセンス、辞書ハッシュを記録します。 [利用条件](https://jageocoder.info-proto.com/license)

## 20住所の再現確認と全国実行

```bash
mkdir -p trial
unzip -n kussoon-jageocoder-address-trial-20261125.zip -d trial
python local_batch.py dictionary trial/input.csv trial-local.jsonl
# 再現確認の後に実行
python local_batch.py dictionary national-input.csv national-local.jsonl
```

入力はUTF-8 CSVの `id,address`。全国入力はPR #762の4,613 IDを保持し、基準日時点の住所を優先しました。空欄の行は公式住所原文を使用しています。ジオコーダーには住所のみを渡します。別リストでもこの形式を使えます。

20住所では、デモの座標取得用 `final1.csv` と住所正規化用 `final0.csv` をIDで突合し、一致文字列、未照合部分、照合住所、レベル、座標有無、座標値を比較します。空欄や999.9等の無効値は座標欠落として扱います。デモの辞書表示は20260418、配布のファイル日付は20260417です。差が出た場合は住所表記、辞書構成、設定、座標参照の差を記録してから全国処理の可否を判断します。

全国比較はPR #762の採用案を基準にIDで結合し、照合の末尾と座標対応範囲、未照合部分、出典、座標差を確認します。採用候補は行政区域内か検証し、同一座標に異なる住所が割り当てられた場合は、共通の代表点かを明示して審査します。座標を持たない住居番号を認識しても、親番点をその住居番号の完全一致として扱いません。 [PR #762](https://github.com/Kussoon/kussoon.github.io/pull/762)

同梱の前回ZIPには20住所の比較表・両設定応答・WebAPI補助照会・評価を収録しています。サイズ内訳の原記録は `sizes.txt`。Excel正本と公開地図は保持しています。
