# V2全国統合版 回帰テスト整備計画

監査日：2026-11-04 JST

固定main：[`c69c970c982724b20d9a327e1fd1c223f356aebd`](https://github.com/Kussoon/kussoon.github.io/commit/c69c970c982724b20d9a327e1fd1c223f356aebd)
対象：`v2/national/official-2026-nationwide-pilot.html`

本PRは設計・記録のみ。新しい実行テストやCI、本体コードを追加・変更しない。

|分類|既存検査|追加提案（優先順）|根拠PR・仕様|限界|
|---|---|---|---|---|
|選択・吹き出し|test-national-navigation.mjs、office-directory.test.cjs|P0 v2/tests/nationwide-selection.browser.cjs：西宮8手順、同一path.d・地理点画面位置・viewBox・contentBounds比較|81/148/245、S01–06|DOMモックだけでは再投影を逃す|
|地図操作|test-map-viewport.cjs、test-map-viewport-touch-pan.cjs|P0 上記E2Eへ多可町×後の上下左右パン、実SVG子path capture、ドラッグ後誤選択防止を追加|136/239–241/245、S15–20|合成pointerはiOS暗黙captureの実発火を証明しない|
|ラベル配置|test-density-contract.cjs、test-established-label-adapter.cjs、centered-labels各試験|P1 v2/tests/nationwide-label-contract.browser.cjs：田尻/中央区/三田、固定5C地理座標、ON/OFF・選択・ズーム後不変、13画面pxと768上限|79/95/146/224/225/228、S11–14|文字列存在チェックでは実接続を保証しない|
|読み仮名|test-reading-bridge.cjs、test-place-labels.cjs|P1 v2/tests/nationwide-readings.browser.cjs：初期OFF、三重/岐阜/長野、区4行、名称不一致fallback、郡の同名異読|144/145/223/226/239、S08–11|コード照合成功と画面内での可読性は別|
|県境・描画|test-municipality-renderer.cjs、test-2026-single-stroke.cjs、test-shared-border-contract.cjs、233–237診断|P2 v2/tests/nationwide-borders.browser.cjs：選択とfocus時の線幅、DOM path数、拡大スクリーンショット。元地形に対する正式な隣接基準/カバレッジ検査は別計画|102/107–131/187/230/233–239、S23–26|一致辺抽出の正確性≠全境界品質|
|庁舎・リンク|test-office-directory-data.cjs、office-directory.test.cjs、test-2026-mobile-popup.cjs|P1 v2/tests/nationwide-popup-layout.browser.cjs：320/390/428/960幅、3/6リンク、下端、内部scroll、A以外hrefなし|86/87/89/91/93/186/212/242–244、S05–07/27/30|HTTP200のみでAにしない。住所最新性は別監査|
|全国整合|audit-office-map-codes.cjs、audit-2021-2026-code-crosswalk.cjs|P2 47県実データ・manifest・読み・officeコード・指定市親参照の同一SHA検証を再利用、例外コードを理由付き固定|150–212/231、S22/25–28|1902/1905/1912を同じ件数とみなさない|
|検索・クイズ|test-place-labels.cjs、test-municipality-quiz.cjs、test-national-navigation.mjs|P2 同名市・県不要の市名検索・読み・5桁コード・非同期順序を実入口で検査。クイズUI非表示は維持|142/149/204、S28–29|共通クイズが成功しても公開再開の承認ではない|

## CI設計

将来追加するワークフロー案：`.github/workflows/v2-nationwide-contracts.yml`。対象HTMLだけでなく読み込むshared/common JS、データ、仕様書、対応テスト自身の変更をトリガーにする。文書変更だけのPRで巨大データ再生成を起動しない。
各テストは仕様IDと関連PRを保持し、修正前に失敗/修正後に成功を確認する。状態テスト・実ページE2E・目視/実機を別ジョブ/別記録にし、未実施を合格と表示しない。失敗を文字列期待値の変更だけで消さない。

## 今回の既存テスト実行

Node v24.22.1。固定mainからの既存チェックアウトに、比較APIで確認した変更ファイルを重ねた読み取り用スナップショット。地図本体をコミットしない。

|既存コマンド（node以下）|結果|
|---|---|
|`v2/shared/test-map-viewport.cjs`|合格|
|`v2/shared/test-place-labels.cjs`|合格|
|`v2/shared/test-municipality-quiz.cjs`|合格|
|`v2/shared/test-municipality-renderer.cjs`|合格|
|`v2/shared/test-established-label-adapter.cjs`|実行不可：必要データ未展開（ENOENT）|
|`v2/shared/test-reading-bridge.cjs`|合格|
|`v2/shared/test-map-viewport-touch-pan.cjs`|合格|
|`v2/national/test-2026-mobile-popup.cjs`|合格|
|`v2/national/test-shared-border-contract.cjs`|実行不可：必要データ未展開（ENOENT）|
|`v2/national/test-density-contract.cjs`|合格|
|`v2/national/test-2026-single-stroke.cjs`|合格|
|`v2/national/test-2026-overview-focus-toolbar.cjs`|合格|
|`v2/tools/shared-topology/test-national-navigation.mjs`|実行不可：必要データ未展開（ENOENT）|
|`v2/common/js/test-office-directory-data.cjs`|合格|

14コマンド中11合格、3実行不可。コマンド数と内部assert数を混同しない。ローカルのデータ不足であり、リポジトリのデータ欠落と断定しない。GitHub Actionsのチェック結果は監査PRの確認記録で別途報告する。
