# 追加済み：庁舎rendererの振る舞い検査

`office-directory.test.cjs` を9/9合格へ更新し、集約runnerの17番目へ追加した。失敗を削除・skipせず、親市を含むAPI戻り値・施設別3/6リンク・経路・A限定ゲートの正負を検査する。

# 追加済み：現行行政区検索

`nationwide-search.browser.cjs` を実ブラウザjobへ追加。共通読みテストで浜松新3区と元データ非破壊を検査し、全国実データ検査で1892候補すべての到達先コード集合を照合する。

# 追加済み：再タップ回帰テスト

`v2/tests/nationwide-retap.browser.cjs` を実ブラウザjobへ追加。1280/390px、3自治体の実座標クリック、投影hash・viewBox・popup・選択・明示戻り・解除後パン制限を検証する。基準実装では失敗、個別修正後に成功することを確認した。スクリーンショットは各テスト名で保存し、別テストの証拠を上書きしない。

# 実装済み回帰テスト（第1段階）

- `node v2/tests/run-national-contracts.cjs`: 既存14検査＋全国実データ検査＋台帳検査。関連v2変更PRで自動実行。
- `node v2/tests/nationwide-2026.browser.cjs`: 実HTMLとローカル実データを同じ静的サーバーで配信し、Chromiumで操作。外部通信を遮断。実行前に `npm ci --prefix v2/tests/browser` と同ディレクトリで `npx playwright install chromium`。既存Chromium利用時は `KUSSOON_CHROMIUM` に実行ファイルを設定できる。
- `.github/workflows/v2-nationwide-contracts.yml`: read-only権限のデータ・部品jobと実ブラウザjob。失敗時も画面とpageerrorをartifactへ保存。生成物をpushしない。
- 負のデータ検査は区域コード重複・県不一致・区域数差・arc欠落・不正座標を実際に拒否する。URL台帳は読み取りのみ。

再タップ・浜松・旧庁舎期待値は後続PRで失敗を先に再現してから修正する。初回基盤PRで既存の赤いテストを成功扱いに変えない。以下の提案表は前回の設計履歴であり、上記の実装済み範囲と区別する。

---

# V2全国統合版・回帰テスト整備計画

基準: main `c69c970c982724b20d9a327e1fd1c223f356aebd`、PR #1〜#245。
今回は計画・根拠の記録のみ。下記の新規テスト・workflowは未実装である。
[有効仕様](../national/MAINTENANCE_RULES.md)、[S-ID台帳](v2-national-pr-ledger-20261104.md)、[優先課題](v2-national-regressions-20261104.md)を参照する。

## 今回実行した既存検査

固定SHAから取得したソースをローカル作業領域へ配置して実行。Node v24.22.1。
11ファイルが合格した。Nodeの個別testケース数とファイル数を混同しない。

|コマンド（nodeに続くパス）|結果|保証する範囲／限界|
|---|---|---|
|`v2/shared/test-map-viewport.cjs`|合格|ズーム基準点、パン、ピンチ、ホイール、reset。DOMスタブ|
|`v2/shared/test-map-viewport-touch-pan.cjs`|合格|タップ、マウス、長距離パン、子capture解除、投影範囲。合成イベント|
|`v2/shared/test-municipality-renderer.cjs`|合格|成分範囲、小島、単一境界、選択塗り。合成図形・スタブ|
|`v2/shared/test-place-labels.cjs`|合格|日本語検索・凹形・島・穴の代表点。全実区域の可読性ではない|
|`v2/shared/test-municipality-quiz.cjs`|合格|10問重複排除、4択、スコア、終了。公開UIの利用可否とは別|
|`v2/national/test-2026-single-stroke.cjs`|合格|2塗り＋1境界path・累積なし・CSS。全県境一致ではない|
|`v2/national/test-2026-overview-focus-toolbar.cjs`|合格|focus/hover・4ボタン・初期OFFのソース接続|
|`v2/national/test-2026-mobile-popup.cjs`|合格|CSS、ResizeObserver、リンク配置の文字列検査。矩形やスクロール未確認|
|`v2/national/test-density-contract.cjs`|合格|旧density系のOFF・13px・768・固定5C。2026経路は保護しない|
|`v2/shared/test-reading-bridge.cjs`|合格|コード・名称・読みの厳密照合と欠落時の退避|
|`v2/common/js/test-office-directory-data.cjs`|合格|47県1912地域・1912施設の形式・参照。外部到達性・住所現況は未保証|
|`v2/tests/office-directory.test.cjs`|6合格／2失敗|既存期待値の不整合。R/T01を参照。本監査による変更前からのソースで発生|

`node --test` の子プロセス経由では環境内で個別出力を取得できなかったため、最後のテストは `node ファイル名` で実行して2件のAssertionErrorを確認した。
不足する参照ファイルを取得する前のENOENTは調査環境の準備エラーであり、リポジトリの機能不具合件数へ含めない。

調査専用プローブ（未コミット）では、実ページinline JSをNode VMで実行し、西宮・多可・中央区の×→再タップ時のreset経路と、浜松新区／旧区の検索候補を確認した。
viewport・renderer・地図形状はスタブ／合成でありブラウザではない。
現行office-directoryのDOMスタブ＋実データで通常3・中央区6リンクとA/B/C/未判定のゲートも確認した。
既存URL分類台帳と全1,912件の現行URL・分類を照合し差分0（nullとunclassifiedを正規化）。

## 既存資産を優先する追加設計

|分類|再利用する既存ファイル|追加・更新案|検査内容・仕様／PR|実施順|
|---|---|---|---|---|
|選択・吹き出し|`v2/tools/shared-topology/test-national-navigation.mjs`|同ファイルに状態遷移検査を追加|S01〜S05、#81/#148/#245。単なるregion値変更でなく実clickを通し、×→同一再タップ→再選択を検査|1|
|選択・吹き出しの実画面|`v2/tests/office-popup.browser.cjs`を共通ヘルパー候補として調査|`v2/tests/nationwide-2026-interactions.browser.cjs`|2026専用DOMで西宮・多可・中央区、色／popup／viewBox／地理点の画面座標不変を検査。#81/#93/#239〜#245|1|
|地図操作|`v2/shared/test-map-viewport.cjs`、`test-map-viewport-touch-pan.cjs`|既存へパン方向・drag後click抑止・cancel・2→1本指を追加。上記browserと連結|S14〜S20、#65/#70/#82/#135/#136/#224/#239〜#241/#245。SVG外移動・キャプチャ・選択解除後も移動範囲維持|2|
|庁舎・リンク|`v2/tests/office-directory.test.cjs`、`v2/common/js/test-office-directory-data.cjs`|旧期待値を現行仕様へ更新し、rendererをDOMで検査するケースを追加|S07〜S11、#86〜#93/#150〜#212。区と親市のリンク・目的地を分離、A以外無効、部分欠落・不正URL・取得失敗|1|
|全国検索・行政区|`test-national-navigation.mjs`、`test-reading-bridge.cjs`、既存`audit-2021-2026-code-crosswalk.cjs`|`v2/shared/test-national-search-2026.cjs`を提案|S30/S31、#145/#170/#204/#231。候補コード⊆現行2026コード、浜松22138/22139/22140あり・旧7区なし、正式名・読み・コード各検索|1|
|ラベル配置|`v2/shared/test-established-label-adapter.cjs`、`v2/tests/national-centered-labels.test.cjs`、`readable-labels.test.cjs`等|継承方針決定後、`v2/shared/test-label-contract-2026.cjs`を提案|S21/S29、#31〜#38/#55〜#59/#71〜#79/#94/#95/#100/#143〜#146/#225/#228。5Cの同じ地理アンカー、庁舎点未登録時5B、田尻・中央区、全件ON/OFFで位置比較|3|
|読み仮名・名称|`test-reading-bridge.cjs`、`test-place-labels.cjs`、`v2/tests/national-readings.test.cjs`|同既存と2026ラベル契約テストへ追加|S24〜S28、#35/#55〜#62/#144/#145/#214〜#226/#239。OFFでも正式な市区・郡町村、読み交互4行・初期OFF・漢字基準線不変・欠落フォールバック|3|
|県境・描画|renderer／single-strokeテスト、`audit-2026-prefecture-seams.cjs`、`audit-2026-shared-seam-integrity.cjs`|既存自己試験と生成物診断を継続、browserに代表境界比較を追加|S06/S36〜S39、#102/#107〜#114/#120〜#131/#187/#230/#233〜#239。重複pathを増やさず、画面線幅と地理一致を別に判定|4|
|全国データ整合|`v2/scripts/audit-office-map-codes.cjs`、コードcrosswalk、47県生成器とvalidator|既存を定期・関連変更時に実行し結果を再生成|S38〜S40、#107/#139/#145/#150/#186/#231。コード集合差、浜松再編、北方6・未定7・親市20、読みと庁舎・URL分類のキー照合|2|
|クイズ整合|`test-municipality-quiz.cjs`、navigationテスト|既存を保持、通常地図復帰と秘匿検査を継続|S32、#147/#149。UI非表示を尊重しロジック保存、クイズ中の検索・popup・地名漏洩防止|4|

新しいファイル名は提案であり、既存テストへの少量追加で済む場合は新設しない。
旧ブラウザテストの `#municipal-popup`、`[data-id]`、初期読みON、proposal5、区のリンク1組という前提を2026版へコピーしない。
2026版は `#officePopup`、`[data-code]`、初期OFFを使う。適用先をテスト名・起動URLへ明示する。

## #81の失敗を取り逃さない判定条件

兵庫県→西宮市→任意の追加ズーム・パン→×→同一市域再タップ→再選択を、375×800／390×844／768×800／1280×800で実施する。
市域の代表点が見える位置を使い、クリックはpathへの合成dispatchだけでなく座標タップも含める。

|時点|選択|吹き出し|投影・viewBox・画面上の同じ地理点|
|---|---|---|---|
|市域選択後|西宮市1件|表示|選択フォーカス|
|×後|西宮市1件|非表示|直前と一致|
|同一市域再タップ後|なし|非表示|×前と一致。県全体投影へ戻らない|
|さらに再タップ|西宮市1件|表示|採用した再選択時フォーカス規則を明示|
|県全体へ戻る専用操作|なし|非表示|県全体へ戻り移動制限もリセット|

viewBoxはSVG座標系の値なので、投影の変更を検出するには地理点のスクリーン座標・区域pathの対応も比較する。
色だけ／hiddenだけ／resetを呼んだかだけの検査にしない。
同手順を多可町、神戸市中央区で繰り返し、中央区は二施設6枠と内部スクロール後の下段リンクも確認する。

## 実ブラウザ・実機で残っている確認

全国表示で上下左右パン、県選択、＋／−、ピンチ、全体表示、県全体へ、全国へを順に確認する。
指1本のドラッグ後に誤選択しないこと、2本指から1本へ戻ること、子pathを跨いでもパンが続くことを確認する。
375/390px幅の吹き出し矩形が地図内・4ボタン非重複、ボタン群と下端／高さが一致、画面回転後も保つことを計測する。
内部スクロールの終端でページ・地図へ操作が意図せず移らず、3／6枠すべてに到達できることを確認する。
読みは初期OFF、ONで漢字の基準点不変、OFFへ戻して元に一致することを比較する。
全国・兵庫・大阪奈良県境を拡大し、二重線・局所太線・focusリングと通常境界を区別する。

合成PointerEventやデスクトップChromium合格をiPhone Safari合格に置き換えない。
全項目が今回未確認であり、スクリーンショット・viewport・ブラウザ版・基準SHA・操作手順を次回結果へ残す。

## GitHub Actionsへ組み込む順序

1. 旧庁舎テストの期待値を直し、常に赤い基準を解消する。テスト削除や本体の旧仕様復元で緑にしない。
2. #81と浜松検索の失敗する状態遷移テストを用意して、個別修正と一緒に緑へする。監査文書だけの本PRには赤いテストを導入しない。
3. 現行の `v2-2026-nationwide-pilot.yml` にあるnavigation等を再利用する。ただしこのworkflowはデータ生成・ブランチへpushも行うため、軽量な操作検査を独立job／workflowに分ける提案とする。
4. pathフィルターを対象HTMLだけでなくshared/common/dataの実依存へ合わせる。既存 `v2-national-map-contract.yml` のdensity保護を残し、2026にも実行対象があることを確認する。
5. ブラウザ検査はローカル配信で外部計測を遮断し、リンクURLは検査するが外部公式サイトを毎PR全件訪問しない。外部到達監査は既存Pythonで別途実施する。
6. 大容量全国再生成・県境診断は関連データ変更時と定期検査へ分離し、生成元・SHA・想定コード差をartifactと台帳に残す。

文書だけの本PRでは多くのworkflowのpathsに一致しないため、Actions 0件は「全テスト成功」を意味しない。
PR作成後にrun/checkを確認し、0件なら未起動と報告する。今回確認した既存テスト失敗2件が残るため、正常な検証基盤として完成したとは扱わず、PRはマージを保留する方針とする。

先行PR #246には別環境での11合格／3配信データ未展開という実行記録がある。今回の11合格／旧庁舎2失敗とは実行対象・環境が異なり、件数を合算せず、[先行原文](https://github.com/Kussoon/kussoon.github.io/blob/b42cec489878c0774053b334d326eb0c42406c38/v2/audit/v2-national-regression-test-plan-20261104.md)を別証拠として保存する。
