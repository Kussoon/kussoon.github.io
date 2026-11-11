# パン屋マップ：連続検索とクラスタ読込失敗の調査

調査日：2026-11-11。基準main：`90a4cb224705b66d49d7d2d5ffd5ad9521babaeb`。
対象HTML blob：`e2278afe8a3a0435f7cbfe3eb15c02c36ee8236b`。
独立ブランチ：`fix/bread-marker-refresh-20261111`。マージ・公開は行わない。

## 結果と原因

最新mainでもNo.17→97→107→111を最初のクラスタズーム処理の300ms待機中に切り替えると再現した。店舗名をinputイベントで変更し、各一覧ボタンをクリックする。単独検索では表示される。Playwrightの通常fill/clickはマシン速度によって300msを超えるため、再現試験はイベントを連続発火し、通常操作も別に試験する。時間だけを待ってピン出現を前提にしない。

[修正前の状態ログ](diagnostics/main-before.log)と[画像](diagnostics/main-before.png)、[回帰テストの修正前失敗](diagnostics/main-before.json)を保存。PR #414のKNOWN-ISSUES、pageerror空配列、診断画像、`nine-coordinate-fix.browser.cjs`も照合した。#414は各店舗ごとのreloadと500ms待機を採用しており、連続操作の回帰を保証しない。

- No.111への切替後、検索結果は `[111]`、ズーム16、クラスタ内のマーカーは1件、描画用featureGroupは0件、マーカーのDOMとmap所属はなし。例外は発生しない。
- 初回検索で地図を広域から16へ更新すると、Leaflet本体の `{animate:false}` とは独立にMarkerClusterのズーム処理が開始する（`_inZoomAnimation=1`）。
- `renderMap()`はその間もclearLayers/addLayerを行い、`fitVisible()`は同一ズームで中心を即時変更する。MarkerCluster 1.5.3の `_moveEnd()` はアニメーション中にreturnするため、`_currentShownBounds`が前の場所のままになる。No.111はその古い範囲外なのでaddLayer時も描画対象にならない。
- 300ms後にアニメーションが終了しても、省略された移動は再実行されない。1秒待機後も内部1件/描画0件。さらに地図を1ピクセル動かすと内部座標を変えずに表示が復旧した。フィルター漏れ・座標欠損・店舗データの不整合ではない。
- クラスタ設定の `animate:false` だけを変更した比較では、同じ順序を3回繰り返して内部1件/描画1件を維持した。[比較ログ](diagnostics/animation-disabled.log)。

読込失敗もmainで再現した。typeof判定とL.layerGroupへの切替は存在するが、案内文を追記する `.mapnote` 要素は存在しない。`Cannot read properties of null (reading 'append')` により、facilityPins作成・mapへのlayer追加・初回updateに到達しない。

## 最小修正

`maps/unified-bread-map.html` の初期化のみ変更する。

1. MarkerClusterの `animate:false` を指定する。検索時の同期的な地図移動に合わせ、古い表示範囲のまま移動イベントが省略される状態を避ける。近接クラスタとspiderfy、施設固定ピンは保持する。通常のクラスタ分裂・結合のアニメーションは省略される。
2. フォールバック案内のp.mapnoteを作成し、既存の地図コンテナへ追加する。L.layerGroupによる個別表示と残りの初期化を続行する。

ライブラリ内部APIへの書込み、時間待ちの再描画、店舗データの変更は加えない。テストのみLeafletオブジェクトを参照するフックをHTML配信時に挿入する。これは製品HTMLには含めない。

## 回帰試験

`v2/tests/bread-marker-refresh.browser.cjs`、Actions `bread-marker-refresh.yml`。

Chromium/WebKit × 1440/390px × 正常読込/JS読込失敗の8条件。正常時は本番と同じ1.5.3を取得し、SHA256 `1e4e1d22972a3926f48598e0caf14e3fe7049835d428a344fed4f9e3665b3508` を照合して配信する。外部タイル・CSS・解析通信は遮断する。

- 9店舗の独立検索（各reload）、一覧→詳細と実座標のマーカー・DOM・画面内位置
- 17→97→107→111、逆順を各3回、各段階と待機後の表示
- 通常のfill/clickによる連続検索
- 5都市を個別に絞り込み、店舗種別、参考候補の三角ピン・説明
- ピン→詳細→地図へ戻る、拡大・縮小・全体表示
- リセット後の施設まとめピン、正常時の近接クラスタ、非公開SAILORと該当なし
- pageerrorなし、失敗時の案内文と個別表示

実行状況は下の追記を参照。iPhone Safari実機・背景地図や入口位置の妥当性は対象外。ローカルWebKitは起動を試したがlibgtk-4等が不足し、sudoも利用できないためActionsで検証する。

## データ保全と座標PRとの統合

`bread-data`スクリプト全体はmainとバイト一致。SHA256：`8fbe757de6798bf97f095bff0b07eb8e65caf4b82d228271eb54ebc2d31ce7ea`。Excelマスター、店舗情報、9店舗の座標、#410/#412/#413/#414のブランチへ書込みなし。

このPRはmainをbaseとし、座標PRに依存しない。#414は検証用HTMLと候補Excelを管理するため、本PRの本番HTML初期化修正とはファイルが異なり直接の競合はない。ただし将来、座標版HTMLを本番HTMLへ丸ごと置換すると今回の修正が失われる。統合する別作業では、修正済みmainのHTMLを基準に承認座標のみを反映するか、#414の検証HTMLへこの初期化差分を移植してから本番候補を作る。#410→#412→#414の既存依存関係は変更しない。#413は根拠資料として独立参照する。

ローカル一時ファイルに#414 head `194daae272ddaab3bf9f31df568a0d1ff6d0a6b8` の検証HTMLを取得し、同じ初期化差分だけを適用して回帰試験を行う。元PR・Excel・元検証HTMLは編集しない。将来の統合でも、9件の承認座標・対象外254件・263レコードの保全検査と本回帰試験の両方を再実行する。

### ローカル実行記録

- 修正前main：回帰テストがNo.111で失敗。shown=[111] / clusterCount=1 / rendered=0 / markers=[]。
- 修正後：Chromium（システム版）×1440/390px×正常/読込失敗の4条件すべてPASS。
- `git diff --check`、JavaScript構文検査、bread-dataバイト一致：PASS。
- WebKitとPR #414一時統合版の結果は検証完了後に追記する。
