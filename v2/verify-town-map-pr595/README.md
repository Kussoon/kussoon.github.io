# PR595基準の共通町名マップ比較試作

規範は `../docs/town-map/TOWN_MAP_MASTER_SPEC.md`（TOWNMAP-SSOT-001）のみ。本書は実装・再生成手順です。

- `/v2/verify-town-map-pr595/?code=28214`：宝塚市125町名・20地域。
- `/v2/verify-town-map-pr595/?code=28204`：共通化の西宮市回帰比較用。
- いずれも同一の `index.html` と `town-map.js` を実行します。自治体別の地図プログラムはありません。
- 承認済み `/v2/verify-pr595-one-label/` と正式ページは変更しません。

## 実際に再利用する処理

`../verify-pr595-one-label/common/js/` の12モジュールをそのまま読み込みます。UI、D3ズーム、viewport、データ検証、所属判定、採点状態、4択、隣接関係、1ラベル生成、文字倍率、SVG描画、ジェスチャーです。

`town-map.js` は承認済みHTMLから共通処理を抽出したものです。町名・読み・位置補正・地域注記・地域分割はJSONへ移動しました。抽出は `scripts/build-pr595-shared-preview.cjs` で再現でき、西宮321ラベルの位置差をブラウザで照合します。

宝塚市は既存SVG専用コントローラーを使用しません。`Kussoon/takarazuka` のコミット `fe3c5692ab0547348b67a47874a1c43f2c382c5a` にある398境界図形レコード（統計キーは337種）を、既存台帳125町名へ集約しました。元の座標・arcは保持し、内部の丁目境界だけを統合しています。「布売自由ガ丘」→「売布自由ガ丘」は既存出典台帳の表記補正です。9町名の複数区域、全136接続パーツを保持します。2020年統計境界と現行住所境界は同一ではありません。

新規の候補データ生成は `scripts/generate-town-map-label-candidates.cjs` を使用します。PR595時点とmainで内容が同一の全国 `label-engine.js` / `readable-labels.js` を実際に読み込みます。第一外周の投影重心を基本にし、町域外・穴に出る場合だけ既存 `safeInteriorCenter` を使います。宝塚では4町名が該当します。これは新自治体用の比較候補であり、西宮321地点や全国の既存配置を置換しません。ズーム中の候補探索はありません。

## 次の自治体の追加

三田市28219・猪名川町28301・神戸市28100も、原則として以下のデータだけを追加します。

1. `data/<自治体コード>.json`：名称、台帳件数、読み、データURL、地域読み、追加所属、任意の注記・候補・分割設定。
2. `data/<自治体コード>.topojson`：町名で集約したtown GeometryCollection、S_NAME属性。飛び地・穴は保持。
3. `data/<自治体コード>-membership.json`：communitiesとtowns。複数所属は設定JSONのadditionalRegionsに列挙。
4. 必要な場合のみ、地域で分割される町域のTopoJSON（exceptionUrl）。

`?code=<自治体コード>` で同じページから読み込みます。地図HTML・JS・CSS・操作・採点コードの変更は不要です。神戸の区名等は重複しない町域ID設計の検証が必要で、実データ未整備の市まで完成済みとは扱いません。

## 再生成

`node scripts/build-pr595-shared-preview.cjs` で共通ページ・ランタイム・西宮設定を再生成します。

宝塚データは固定コミットから取得した元TopoJSONと町名台帳を引数にし、`node scripts/build-pr595-takarazuka-data.cjs <元TopoJSON> <元町名台帳>` で生成します。`topojson-client@3.1.0` が必要です。

続いて `node scripts/generate-town-map-label-candidates.cjs v2/verify-town-map-pr595/data/28214.topojson v2/verify-town-map-pr595/data/28214.json` を実行します。`d3@7.9.0` と `topojson-client@3.1.0` を使用し、独立した準備環境では `D3_MODULE_PATH` / `TOPOJSON_CLIENT_PATH` で指定できます。

## 検証の範囲

`scripts/audit-pr595-common-town-pilot.cjs` はChromium1280・WebKit390/320で、西宮との位置差、宝塚125ラベル・20地域・追加所属・136パーツ、内部アンカー、全125町名×クイズ1/2、全パーツの内部代表点への実入力、読み切替、固定100％ボタン、ズーム時測定キャッシュを検査し、画像とJSONを保存します。

物理iPhoneのスクロール・ピンチ・連続ドラッグの体感と指の接触面積は別途実機受入が必要です。全境界点の正しさや全国1000自治体の完全対応をこの検査だけで証明したとは扱いません。
