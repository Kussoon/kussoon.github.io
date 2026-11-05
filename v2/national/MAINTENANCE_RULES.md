# Kussoon V2 地図開発・確定仕様規則集

基準: 2026-11-06（日本時間）、main `476a6f91dbb7a95a99bb10caf571c125411ca9d2`（PR #290まで）。**このファイルを今後の地図開発で参照する唯一の規則集**とする。既存の[PR #1〜#245照合台帳](../audit/v2-national-pr-ledger-20261104.md)、[S01〜S49の当時の到達状況](../audit/v2-national-current-spec-20261104.md)、[不整合記録](../audit/v2-national-regressions-20261104.md)、[回帰計画](../audit/v2-national-regression-test-plan-20261104.md)は証拠・履歴である。以前のA/B/Cは当時のpilotについての判定であり、現在の公開版へ転記しない。

**適用の優先順位:** ユーザーが実機で承認し、後続のマージ済みPRで明示された最終決定を採る。PR番号だけで判断しない。対象ページを必ず特定する。正式公開版は [`/maps/national-municipalities.html`](../../maps/national-municipalities.html)。`v2/national/map.html`は転送、`official-2026-nationwide-pilot.html`、RC1、独立試作は別経路。**「コード確認」は動作確認済みを意味しない。** 不一致が残る場合、旧仕様を無条件に復活させない。

## 監査の分母と限界

GitHubのPR一覧で #1〜#290 の**実在288件**を列挙し、件名・本文・マージ状況を分類（#267/#282はPRではない）。既存台帳の #1〜#245 は本文・変更ファイル・取得可能なpatchを照合済みという当時の記録を再利用。今回 #246〜#290 の実在43件を追加分類し、地図関連29件／他コンテンツ14件。従って分類済み288件、未分類0件、地図関連247件（既存218＋今回29）、その他41件。追補43件は取得できた差分も確認し、重点6件（#91/#244/#259/#287/#288/#290）はCSS・JSの決定を個別に照合した。地域6リポジトリは実在59件を一覧分類し、操作・表示仕様に関係する19件の本文と差分を照合した。合計347件を分類（地図仕様関連266件／その他81件、未分類0件）。レビューの全件再調査、承認の実機原本、地域公開ページの全件実操作は未確認。

状態欄: **限定確認**=既存の対象限定テスト等／**コード確認**=現行ソースを照合したが公開実操作未確認／**要確認**=採否または実動作不足／**不整合**=根拠のある差異。古いS-IDは既存台帳の仕様番号。以下のR-IDが今後の変更影響を追跡する番号であり、個々の規則は表の1行で管理する。コード・テスト欄の相対名はリポジトリ内の現行ファイル。PRリンクと旧S-IDを[履歴台帳](../audit/v2-national-pr-ledger-20261104.md)と突き合わせる。

## 1. 地図データ・行政区域・県境

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R01 2026行政区域|全国47県・1,905区域。地図と庁舎1,912件の集合差（北方6・所属未定7・親市20）を用途別に扱い、浜松は現行3区。旧版のコードを混在させない。 **条件・例外:** 公開全国版。法的境界の現況保証ではない。|[#186](https://github.com/Kussoon/kussoon.github.io/pull/186) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231) [#248](https://github.com/Kussoon/kussoon.github.io/pull/248) [#251](https://github.com/Kussoon/kussoon.github.io/pull/251) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284)|`maps/national-municipalities.html`<br>`v2/data/national/2026-common/`|`national-2026-data.test.cjs`|コード確認|
|R02 県境・市区町村境|塗りpathと境界pathを分け、同じ線分を累積描画しない。選択専用の太線を重ねない。 **条件・例外:** 公開版は共通Topologyが7県、残り40県と全国概要は別経路。局所太線・白隙間はS39として未解決。|[#128](https://github.com/Kussoon/kussoon.github.io/pull/128)–[#131](https://github.com/Kussoon/kussoon.github.io/pull/131) [#187](https://github.com/Kussoon/kussoon.github.io/pull/187) [#268](https://github.com/Kussoon/kussoon.github.io/pull/268) [#277](https://github.com/Kussoon/kussoon.github.io/pull/277) [#279](https://github.com/Kussoon/kussoon.github.io/pull/279) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`v2/progressive-preview/municipality-renderer.js`<br>`progressive-geometry.js`|`test-2026-single-stroke.cjs`<br>`progressive-seam-visual.browser.cjs（比較試験）`|要確認|

## 2. 描画方式・軽量化・性能

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R03 段階描画|全国概要から倍率に応じた詳細・地名へ進み、全国から区域へ到達できる。境界計算Workerは操作を塞がず古い応答を破棄する。 **条件・例外:** 公開版。全端末FPS・メモリ上限は未確定。|[#217](https://github.com/Kussoon/kussoon.github.io/pull/217) [#261](https://github.com/Kussoon/kussoon.github.io/pull/261) [#263](https://github.com/Kussoon/kussoon.github.io/pull/263)（未マージ） [#265](https://github.com/Kussoon/kussoon.github.io/pull/265) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284)|`v2/progressive-preview/national-progressive-labels.js`<br>`progressive-geometry.worker.js`|`national-2026-rc1.browser.cjs`<br>`national-map-move.browser.cjs`|コード確認/性能未確認|
|R04 詳細読込|詳細は必要な県を読込み、県キャッシュを制限する。選択色・操作はWorker完了待ちにしない。 **条件・例外:** 失敗時fallback・古い応答・実機メモリは別検証。|[#259](https://github.com/Kussoon/kussoon.github.io/pull/259) [#263](https://github.com/Kussoon/kussoon.github.io/pull/263)（試作） [#265](https://github.com/Kussoon/kussoon.github.io/pull/265) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`maps/national-municipalities.html`<br>`v2/progressive-preview/national-progressive-labels.js`|`national-map-move.browser.cjs（Workerのみ）`|要確認|

## 3. ラベル配置・地名表示

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R05 地名の表示対象|全国では段階的に表示し、県選択では読込済み県内の周辺名を初期表示。切替で選択名のみ表示できる。 **条件・例外:** 固定5C・13画面px・768は旧density由来。公開版の全国段階表示と県内balancedを別々に評価する。|[#79](https://github.com/Kussoon/kussoon.github.io/pull/79) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#217](https://github.com/Kussoon/kussoon.github.io/pull/217) [#260](https://github.com/Kussoon/kussoon.github.io/pull/260) [#263](https://github.com/Kussoon/kussoon.github.io/pull/263) [#265](https://github.com/Kussoon/kussoon.github.io/pull/265) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`national-progressive-labels.js`<br>`v2/shared/established-label-adapter.js`|`pilot-label-scope.browser.cjs`<br>`national-2026-rc1.browser.cjs`|コード確認|
|R06 位置の根拠|地物内の代表点と連続成分を使い、恣意的な個別座標を増やさない。田尻町の空港島など飛地は検証済み庁舎側を優先する旧5Cの根拠を保持。 **条件・例外:** 旧5Cと現行balanced/段階索引の同等性は未確定。全県品質を自動合格としない。|[#94](https://github.com/Kussoon/kussoon.github.io/pull/94) [#95](https://github.com/Kussoon/kussoon.github.io/pull/95) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) [#253](https://github.com/Kussoon/kussoon.github.io/pull/253) [#261](https://github.com/Kussoon/kussoon.github.io/pull/261)|`v2/shared/established-label-adapter.js`<br>`v2/progressive-preview/label-index.json`|`compare-2026-labels.browser.cjs`|要確認|
|R07 区・郡付き名称|政令市区は市名＋区名。郡付き町村は郡名＋町村名、読みONで各段の読みを対応付ける。 **条件・例外:** 郡データは2021出典と2026コード・名称一致922件に限定。39405は保留。|[#214](https://github.com/Kussoon/kussoon.github.io/pull/214)–[#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#266](https://github.com/Kussoon/kussoon.github.io/pull/266) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`v2/progressive-preview/county-overlay.js`<br>`administrative-labels.js`|`progressive-county-labels.test.cjs`|限定確認|

## 4. 読み仮名・初期表示

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R08 よみ初期OFF|初期状態は漢字のみ。切替時に検証済みコード・名称の読みだけ表示し、欠落を推測しない。 **条件・例外:** 北方6の読み欠落S48は未解決。初期ONの旧仕様は#223/#226で置換。|[#223](https://github.com/Kussoon/kussoon.github.io/pull/223) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#261](https://github.com/Kussoon/kussoon.github.io/pull/261) [#266](https://github.com/Kussoon/kussoon.github.io/pull/266) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284)|`maps/national-municipalities.html#readingMode`<br>`v2/shared/reading-bridge.js`|`national-2026-public.browser.cjs`<br>`national-readings.test.cjs`|限定確認|

## 5. 区域の選択・色分け・点滅

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R09 県別淡色|全国47県を県別淡色で塗り、選択区域だけを視覚的に強調する。境界pathはアニメーションしない。 **条件・例外:** パレットの隣接県・色覚多様性の全件承認は未記録。西宮/宝塚への移植は別決定。|[#281](https://github.com/Kussoon/kussoon.github.io/pull/281) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284)|`prefecture-colors.js`<br>`prefecture-colors.css`|`prefecture-colors-pulse.browser.cjs（旧試作）`|要確認|
|R10 選択の最終点滅|公開版だけ白↔元の県別淡色を各0.5秒、step-endで瞬間切替。フェードなし。reduced-motionでは元色で固定。 **条件・例外:** 旧琥珀・元色脈動(#281)、黄赤0.6秒(#286)、黄赤0.5秒(#287)を公開版では置換。試作ページは別。|[#281](https://github.com/Kussoon/kussoon.github.io/pull/281) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284) [#286](https://github.com/Kussoon/kussoon.github.io/pull/286) [#287](https://github.com/Kussoon/kussoon.github.io/pull/287) [#289](https://github.com/Kussoon/kussoon.github.io/pull/289)|`maps/national-municipalities.html`<br>`v2/progressive-preview/prefecture-colors.css`|`national-2026-public.browser.cjs（旧期待値で不整合）`|コード確認/テスト不整合|

## 6. タップ・再タップ・選択解除

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R11 ×と再タップ|×は吹き出しのみ閉じ、選択と投影・位置を保持。同一区域再タップは選択のみ解除、次のタップで再選択・吹き出し。 **条件・例外:** 県/全国へ戻る専用操作と区別。公開版での一連の実機再検証は未記録。|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#250](https://github.com/Kussoon/kussoon.github.io/pull/250) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`maps/national-municipalities.html`<br>`v2/progressive-preview/national-progressive-labels.js`|`nationwide-retap.browser.cjs（pilot対象）`|公開版要確認|
|R12 空白・他区域|空白操作や別区域・検索選択で選択状態と閉じ状態を明確に遷移させる。 **条件・例外:** 旧S44の空白解除は公開版のクリック処理で未実装。空白を押しても現行選択は維持される。今後の採否は要確認。|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204) [#261](https://github.com/Kussoon/kussoon.github.io/pull/261)|`maps/national-municipalities.html`<br>`national-progressive-labels.js`|`audit-legacy-behavior.browser.cjs（診断）`|要確認|

## 7. 拡大・縮小・ドラッグ・スクロール

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R13 地図操作|wheel B案、ダブルクリック、±、ピンチ、上下左右ドラッグと全体表示を提供。ドラッグをタップと区別し、フォーカス後も移動可能範囲を維持。 **条件・例外:** 公開版では地図上の押下でホイールが有効になり、地図外で解除する。Ctrl付きホイールは例外。地点フォーカスの初期枠と移動制約は別管理。地域の回答地図にはR29を適用。|[#65](https://github.com/Kussoon/kussoon.github.io/pull/65) [#70](https://github.com/Kussoon/kussoon.github.io/pull/70) [#82](https://github.com/Kussoon/kussoon.github.io/pull/82) [#135](https://github.com/Kussoon/kussoon.github.io/pull/135) [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)–[#245](https://github.com/Kussoon/kussoon.github.io/pull/245) [#259](https://github.com/Kussoon/kussoon.github.io/pull/259)|`map-viewport.js`<br>`maps/national-municipalities.html`|`nationwide-touch.browser.cjs`<br>`national-map-move.browser.cjs`|限定確認|
|R14 全体表示|現在の全国/県/区域フォーカスの初期枠へ戻し、選択の解除や県全体への再投影と混同しない。 **条件・例外:** 県/全国切替は別操作。|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245) [#259](https://github.com/Kussoon/kussoon.github.io/pull/259)|`maps/national-municipalities.html#mapReset`<br>`map-viewport.js`|`pilot-map-ui.browser.cjs`|公開版要確認|

## 8. 自治体情報の吹き出し

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R15 可変高さ・下端|単独市町村も区＋親市も内容に応じて伸び、地図高−16pxを上限に内部スクロール。下端は8px、右4ボタンと横に重ならず、住所や3/6リンクを縮めたり切ったりしない。 **条件・例外:** #244の厳密一致→#259で廃止→#287で誤復活→#288で二施設のみ解除→#290で単独も解除。#91の省スペース/二施設の可読性を継承。|[#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#244](https://github.com/Kussoon/kussoon.github.io/pull/244) [#259](https://github.com/Kussoon/kussoon.github.io/pull/259) [#287](https://github.com/Kussoon/kussoon.github.io/pull/287) [#288](https://github.com/Kussoon/kussoon.github.io/pull/288) [#290](https://github.com/Kussoon/kussoon.github.io/pull/290)|`maps/national-municipalities.html .office-popup/.popup-scroll/.popup-content`|`pilot-ui.browser.cjs（pilotのみ）`<br>`公開版の3/6リンク下端テスト未整備`|コード確認/公開実機未確認|
|R16 内部スクロール|吹き出し内部をスクロールして全施設・全リンクへ到達し、地図は動かさない。×後も選択は残す。 **条件・例外:** iOS動的バー・慣性・キーボード時の実機確認が必要。|[#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) [#259](https://github.com/Kussoon/kussoon.github.io/pull/259) [#290](https://github.com/Kussoon/kussoon.github.io/pull/290)|`maps/national-municipalities.html #popupScroll`<br>`office-directory.js`|`pilot-ui.browser.cjs（pilot）`|公開版要確認|

## 9. 政令指定都市の区と親市

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R17 二施設・6枠|区役所→親市役所を同じカードに別施設として記載し、各3リンク枠を設ける。見出しから親市も判別できる。 **条件・例外:** 公式URLがA以外の枠は無効表示のため、有効アンカーが必ず6個とは限らない。|[#87](https://github.com/Kussoon/kussoon.github.io/pull/87) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#259](https://github.com/Kussoon/kussoon.github.io/pull/259) [#290](https://github.com/Kussoon/kussoon.github.io/pull/290)|`v2/common/js/office-directory.js`<br>`maps/national-municipalities.html`|`office-directory.test.cjs`<br>`pilot-ui.browser.cjs`|限定確認|

## 10. 検索・都道府県切替・ナビゲーション

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R18 全国検索|名称・読み・5桁コードから現行区域に到達し同名候補へ県名を付ける。浜松旧7区を候補から除外。 **条件・例外:** 旧S45の地図上の市区町村へのキー操作と旧S46の検索入力から先頭候補を選ぶ操作は、公開版の入力処理にない。候補ボタン自体の標準キーボード操作とは別。復元の採否は要確認。|[#204](https://github.com/Kussoon/kussoon.github.io/pull/204) [#251](https://github.com/Kussoon/kussoon.github.io/pull/251) [#261](https://github.com/Kussoon/kussoon.github.io/pull/261) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`maps/national-municipalities.html`<br>`v2/shared/reading-bridge.js`|`nationwide-search.browser.cjs（pilot）`|要確認|
|R19 公開URLと導線|正式URLは/maps/national-municipalities.html。旧/v2/national/map.htmlからクエリ/ハッシュ付きで転送。総合トップ・地域トップ・地図一覧から案内する。 **条件・例外:** pilot/RC1は比較資料。|[#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284) [#285](https://github.com/Kussoon/kussoon.github.io/pull/285)|`maps/national-municipalities.html`<br>`v2/national/map.html`<br>`maps/index.html`|`national-map-move.browser.cjs`|限定確認|

## 11. スマートフォン・タブレット・PC

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R20 画面幅|右4操作とカードを横に分離し、狭幅でも吹き出しの下端とリンク到達性を保つ。 **条件・例外:** 単独と二施設とも同じ可変高。320/375/390pxの旧pilotテストを公開版にも適用すべき。|[#83](https://github.com/Kussoon/kussoon.github.io/pull/83) [#84](https://github.com/Kussoon/kussoon.github.io/pull/84) [#90](https://github.com/Kussoon/kussoon.github.io/pull/90) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#259](https://github.com/Kussoon/kussoon.github.io/pull/259) [#290](https://github.com/Kussoon/kussoon.github.io/pull/290)|`maps/national-municipalities.html @media(max-width:600px)`|`pilot-ui.browser.cjs（旧pilot）`|公開版テスト未整備|

## 12. データ読込・キャッシュ

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R21 読込順とキャッシュ|全国概要・必要県詳細・ラベル索引・庁舎を各実経路で読込む。URL移動後の依存先は絶対パスとする。 **条件・例外:** 通信失敗・旧応答競合・キャッシュ破棄・実機メモリは別判定。|[#114](https://github.com/Kussoon/kussoon.github.io/pull/114) [#187](https://github.com/Kussoon/kussoon.github.io/pull/187) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245) [#265](https://github.com/Kussoon/kussoon.github.io/pull/265) [#285](https://github.com/Kussoon/kussoon.github.io/pull/285)|`maps/national-municipalities.html`<br>`national-progressive-labels.js`|`national-map-move.browser.cjs`<br>`national-2026-data.test.cjs`|限定確認|

## 13. 公式URL・庁舎情報

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R22 庁舎情報|表示名から『本庁舎』『号館』等は省けるが、住所・元JSON・経路の施設識別は変えない。 **条件・例外:** 単独/複数施設で文字を無理に縮小しない。|[#86](https://github.com/Kussoon/kussoon.github.io/pull/86) [#87](https://github.com/Kussoon/kussoon.github.io/pull/87) [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#150](https://github.com/Kussoon/kussoon.github.io/pull/150)–[#212](https://github.com/Kussoon/kussoon.github.io/pull/212)|`v2/common/js/office-directory.js`<br>`v2/data/offices/`|`office-directory.test.cjs`|限定確認|
|R23 公式リンクA判定|公式サイト枠は監査Aかつ安全なURLだけ有効。B/C/未判定は無効枠。Wikipedia/経路の扱いを別にする。 **条件・例外:** HTTP 200だけではAにならない。台帳更新の時点差を確認。|[#188](https://github.com/Kussoon/kussoon.github.io/pull/188)–[#212](https://github.com/Kussoon/kussoon.github.io/pull/212) [#248](https://github.com/Kussoon/kussoon.github.io/pull/248)|`v2/common/js/office-directory.js`<br>`v2/audit/official-url-nationwide-classification-20261103.json`|`office-directory.test.cjs`<br>`test-office-directory-data.cjs`|限定確認|

## 14. 回帰テスト・公開前検査

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R24 影響規則を先に宣言|変更PRに影響R-IDと旧S-ID、対象ページ、最終優先PR、置換理由、コード経路、検査種別を記し、意図的変更時は両方のテスト期待値を更新する。 **条件・例外:** 静的/部品/ブラウザ/実機を混同しない。試作の合格を本番合格へ転記しない。|[#248](https://github.com/Kussoon/kussoon.github.io/pull/248) [#253](https://github.com/Kussoon/kussoon.github.io/pull/253) [#259](https://github.com/Kussoon/kussoon.github.io/pull/259) [#261](https://github.com/Kussoon/kussoon.github.io/pull/261) [#290](https://github.com/Kussoon/kussoon.github.io/pull/290)|`v2/tests/run-national-contracts.cjs`<br>`.github/workflows/`|`audit-ledger.test.cjs（旧台帳）`|運用規則|
|R25 公開ページの回帰門|正式URLの選択点滅、3/6リンク可視性、狭幅内部スクロール、再タップ、境界を公開ページで検査する。 **条件・例外:** 移設検査は公開HTMLの変更で起動するが、公開版検証は旧HTMLのパスを参照し、両方とも選択色CSS単独の変更では起動しない。|[#284](https://github.com/Kussoon/kussoon.github.io/pull/284) [#285](https://github.com/Kussoon/kussoon.github.io/pull/285) [#289](https://github.com/Kussoon/kussoon.github.io/pull/289) [#290](https://github.com/Kussoon/kussoon.github.io/pull/290)|`v2/tests/national-2026-public.browser.cjs`<br>`.github/workflows/v2-national-2026-public.yml`|`旧pulse期待値を要更新。公開版#290の高さテスト未整備`|不整合|

## 15. その他

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R26 クイズの段階導入|全国2026のクイズUIは意図的に保留。共通ロジックを保持し、通常地図と状態を混ぜない。 **条件・例外:** 西宮など既存クイズの点滅方式の全国への移植は未承認。|[#149](https://github.com/Kussoon/kussoon.github.io/pull/149) [#281](https://github.com/Kussoon/kussoon.github.io/pull/281) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`v2/shared/municipality-quiz.js`<br>`maps/national-municipalities.html`|`test-municipality-quiz.cjs`|コード確認|
|R27 試作の採否|全国共通Topology生成#270/#272、統合試作#263、7県比較#277/#279は正式47県採用と区別。2026共通境界の全県展開は未決。 **条件・例外:** マージ済み試験ページも公開版採用の根拠ではない。|[#187](https://github.com/Kussoon/kussoon.github.io/pull/187) [#263](https://github.com/Kussoon/kussoon.github.io/pull/263) [#270](https://github.com/Kussoon/kussoon.github.io/pull/270) [#272](https://github.com/Kussoon/kussoon.github.io/pull/272) [#275](https://github.com/Kussoon/kussoon.github.io/pull/275) [#277](https://github.com/Kussoon/kussoon.github.io/pull/277) [#279](https://github.com/Kussoon/kussoon.github.io/pull/279) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`v2/national/shared-seam-test.html`<br>`progressive-shared-test.html`|`shared-seam-preview.browser.cjs`<br>`progressive-shared-seven.browser.cjs`|要確認|

## 地域学習マップへの適用

全国版と同じ操作でも、回答用地図・町名検索・比較試作では優先規則が異なる。以下の公開地域ページは各地域リポジトリで管理する。[地域サイトの既存棚卸し](../docs/inventory.md)と[地域PRの照合結果](../audit/v2-national-pr-ledger-20261104.md#regional-pr-trace)を参照。

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R28 町名検索のホイール|西宮・宝塚・尼崎・芦屋・伊丹の町名検索は初期無効、マウスで地図をクリックして有効、地図外クリックで解除。初回の町域クリックは選択にも使い、ドラッグやピンチを選択と誤認しない。西宮・伊丹の直接選択は後続PRで確定。|[西宮 #21](https://github.com/Kussoon/nishinomiya/pull/21)→[#22](https://github.com/Kussoon/nishinomiya/pull/22)、[宝塚 #7](https://github.com/Kussoon/takarazuka/pull/7)、[尼崎 #9](https://github.com/Kussoon/amagasaki/pull/9)、[芦屋 #9](https://github.com/Kussoon/ashiya/pull/9)、[伊丹 #4](https://github.com/Kussoon/itami/pull/4)→[#5](https://github.com/Kussoon/itami/pull/5)|各地域の `town-search.html`|PR時のChromium確認あり。5市横断の継続自動テストは未確認|コード確認|
|R29 場所当てと二重回答|西宮・宝塚の対象回答地図では初回クリックで回答とホイール有効化。回答地図のダブルクリック拡大を止め、短時間の同一回答を抑止し、別区域への即時回答は受け付ける。問題ごとに判定をリセット。西宮・甲東は正解後3秒で進行し、PC操作案内は右上の操作を遮らない。|[西宮 #14–#20](https://github.com/Kussoon/nishinomiya/pulls?q=is%3Apr+is%3Amerged)、[宝塚 #5](https://github.com/Kussoon/takarazuka/pull/5)・[#6](https://github.com/Kussoon/takarazuka/pull/6)。回答地図にR13のダブルクリック拡大を一律適用しない。|西宮・宝塚の `community-map-quiz.html` と対象地区の `location-quiz.html`|PR時のChromium確認あり。継続自動テスト未確認|代表コード確認|
|R30 尼崎の町内境界|町名検索では同じ町の複数サブパスの内部線を通常・選択時とも目立たなくし、異なる町との外周を保持。hover着色はhover可能な精密ポインターに限定し、キーボードのfocus表示を残す。|[尼崎 #10](https://github.com/Kussoon/amagasaki/pull/10)（塚口町選択のみ）→[#11](https://github.com/Kussoon/amagasaki/pull/11)（全町選択とhover）→[#12](https://github.com/Kussoon/amagasaki/pull/12)（通常表示も）|`amagasaki/town-search.html` の `.town` とhover条件。全国版R02の共有境界とは別方式。|PR時のChromium確認あり。継続画像回帰は未確認|コード確認|
|R31 西宮・宝塚の配置試作|西宮の全域試作は449図形を322町名グループへ結合し、全件を残して局所中央と隣接補正で配置。初期16pxの設定では拡大時18pxまで。鞍掛町／久保町・上ケ原七〜十番町は代表回帰。西宮市の仁川町（丁目を合成した試験例）・一ケ谷町は代表成分の回帰対象。宝塚市の市域ラベルは広域地図で複数水平断面を比較した。|[#36](https://github.com/Kussoon/kussoon.github.io/pull/36)、[#47](https://github.com/Kussoon/kussoon.github.io/pull/47)→[#48](https://github.com/Kussoon/kussoon.github.io/pull/48)→[#49](https://github.com/Kussoon/kussoon.github.io/pull/49)→[#51](https://github.com/Kussoon/kussoon.github.io/pull/51)（#50未マージ）、[#72](https://github.com/Kussoon/kussoon.github.io/pull/72)・[#73](https://github.com/Kussoon/kussoon.github.io/pull/73)（比較）|`v2/nishinomiya/full-map-app.js`、`v2/nishinomiya-four-town-test/pilot.js`、`v2/irregular/`<br>`v2/national/density.html`|`nishinomiya-staggers.test.cjs`、`universal-centers.test.cjs`。全域322件のブラウザ回帰未確認|試作のコード・部品確認。地域公開版への採用は要確認|
|R32 兵庫県49区域|V2比較では40市町＋神戸9区を全件表示し、学習・ナンバー用途で配置を共有。balancedを初期値にし、西宮市は南寄りの広い領域、洲本・たつの・相生は同じ高さの左右中央を形状から選ぶ。庁舎50地域とは別の母数。|[#37](https://github.com/Kussoon/kussoon.github.io/pull/37)→[#38](https://github.com/Kussoon/kussoon.github.io/pull/38)、[#39](https://github.com/Kussoon/kussoon.github.io/pull/39)・[#40](https://github.com/Kussoon/kussoon.github.io/pull/40)・[#44](https://github.com/Kussoon/kussoon.github.io/pull/44)・[#45](https://github.com/Kussoon/kussoon.github.io/pull/45)|`v2/hyogo/labels.html`・`labels-app.js`。地域公開版の `hyogo/study-all.html` には `LABEL_OFFSET` がある。|`hyogo49-labels.test.cjs`。ブラウザの見た目は別確認|比較ページのコード・部品確認|
|R33 芦屋59町と読み|読み比較は59町名全件、中心優先、境界またぎと重なりを許容。東芦屋町などの補正は形状から決める。漢字＋読みの初期状態はこの比較の設定。全国公開版にはR08を適用。|[#30](https://github.com/Kussoon/kussoon.github.io/pull/30)→[#31](https://github.com/Kussoon/kussoon.github.io/pull/31)→[#33](https://github.com/Kussoon/kussoon.github.io/pull/33)。[試作記録](../docs/ashiya-reading-trial.md)|`v2/ashiya/readings.html`・`readings-app.js`|`readable-labels.test.cjs`・`universal-centers.test.cjs`|比較ページのコード・部品確認|
|R34 西宮全域クイズの広幅表示|700px以上でアプリ幅を最大960pxとし、地図の表示サイズ変更時にLeafletを再描画して中心位置を維持。回答欄は読みやすい幅を保つ。この幅は全域場所当ての設定。|[西宮 #15](https://github.com/Kussoon/nishinomiya/pull/15)|西宮の `full-location-quiz.html`|`390/768/1024/1440px` はPR時にChromiumで確認。継続自動テスト未確認|コード確認|

## 吹き出し高さの決定履歴（R15・R16）

|PR|当時の判断|後続の位置付け|
|---|---|---|
|[#91](https://github.com/Kussoon/kussoon.github.io/pull/91)|西宮で実機承認した省スペースの3ボタン、神戸市中央区など二施設は文字を無理に縮小せず内部スクロール|可読性とリンク到達性を維持|
|[#244](https://github.com/Kussoon/kussoon.github.io/pull/244)|狭幅で吹き出しを右4ボタンの実測高さへ合わせる|当時の高さ一致|
|[#259](https://github.com/Kussoon/kussoon.github.io/pull/259)|旧175px制約で6リンクが切れたため、厳密一致を明示的に廃止。可変高・内部スクロール・横方向の非重複|新しい優先決定|
|[#287](https://github.com/Kussoon/kussoon.github.io/pull/287)|一律のtoolbar高さ上限を再導入|#259に反する回帰。最終仕様ではない|
|[#288](https://github.com/Kussoon/kussoon.github.io/pull/288)|二施設に例外を付け上限を解除、単独は制限を残す|暫定修正|
|[#290](https://github.com/Kussoon/kussoon.github.io/pull/290)|単独にも可変高を適用しtoolbar計測とmulti-office高さ例外を除去|**単独・二施設双方の最終決定**|

指定6件はいずれもマージ済み。GitHub上のレビュー投稿は6件とも0件で、#91の西宮実機承認と#259の要件はPR本文の記録を根拠とした。

公開コードの `.office-popup` は `bottom:8px;max-height:calc(100% - 16px)`、`.popup-scroll` は内部スクロール、`.popup-content` は不要な下余白なし。**右4ボタンと高さを一致させる検査を追加してはならない。** 高さではなく地図内・横の非重複・最後のリンクのスクロール到達・×後の選択維持を検査する。現行pilot向け `pilot-ui.browser.cjs` は公開版の#290を直接保護しない。

## 廃止・置換・未採用の扱い

|旧規則・試作|最終判断|
|---|---|
|吹き出しの4ボタン高さ厳密一致 #244 / #287|#259、最終#290で廃止。#288の単独施設制限も#290で廃止|
|旧2リンク、初期読みON、選択専用太枠|各々#89/#93、#223/#226、#129で置換。既存S33〜S35を参照|
|旧琥珀色、元色のゆっくりした脈動、黄赤0.6秒/0.5秒|公開版のみ#289の白↔県別元色0.5秒に置換。試作のCSS・表示を一律変更しない|
|旧densityの固定5C・13px・768|2026公開版へ同一仕様として採用済みとは認定しない。S21〜S26の比較・採用理由を先に確認|
|全国47県の新しい共通Topology生成 #270/#272、pilot opt-in #263、7県比較 #277/#279|#270/#272/#263は未マージ。試験ページのマージは全国本番採用を意味しない。S39は保留|
|全国2026クイズUI|#149で保留。既存地域クイズの仕様は別管理|

上表の**明示的な廃止・置換は7系統**（高さ一致、2リンク、初期読みON、選択太枠、琥珀選択、脈動、黄赤点滅）。同一系統内の中間PRを追加で数えない。固定5C等と試作は採否未確定であり廃止件数に入れない。

## 発見した不整合と回帰テストの順序

1. **確定したテストとコードの不整合:** [公開ブラウザテスト](../tests/national-2026-public.browser.cjs)と[移動検査](../tests/national-map-move.browser.cjs)は `kussoon-selected-area-pulse` を期待するが、公開CSSは#289の `kussoon-selected-area-two-tone`。旧期待値のまま検査を通したり、新規色へ戻したりせず、#289を正本に公開版の正負テストへ更新する。関連workflow `v2-national-2026-public.yml` のpull_request pathsには現行HTMLとCSSが含まれない。移設検査 `maps-national-move.yml` は現行HTMLを監視するがCSSは監視しない。地図本体・テスト実装は次PR。
2. **R15/R16/R17/R20:** 公開版を320/375/390/844pxで開き、単独（泉佐野市・西宮市）と二施設（神戸市中央区）の全3/6枠について初期下端、最後の枠の内部スクロール到達、ヒットテスト、右4ボタンの非重複、×後の選択・地図位置を検査。#287相当の `max-height:var(--toolbar-height)` 変異で失敗させる。既存 `pilot-ui.browser.cjs` を公開URL対応に再利用する。
3. **R10/R11/R12/R14:** 公開URLで白↔元色の時刻差、動きを減らす設定、同一区域の×→再タップ→再選択、空白クリック、全体表示/県切替を別々の状態遷移として検査。旧pilotの `nationwide-retap.browser.cjs` と `pilot-map-ui.browser.cjs` を流用する。
4. **R02/R06/R09/R18:** 二重線・島・細長い区域・47県隣接の比較、ラベル全件の品質、色覚多様性、検索Enter/キーボードを追加。#267の境界課題は視覚観測とデータの位相を区別する。
5. **R04/R13/R21:** iPhone Safari/Androidの指操作、ブラウザバー・safe-area、遅い通信時の旧応答、メモリとFPSは実機で別に測る。Playwright WebKitを実機合格と書かない。

### 集計と変更前の照合

- R-IDは34件。地域・用途限定の比較規則と、採否確認の条件を含む。廃止・置換は全国7系統に、尼崎の選択時限定から通常表示への拡張（R30）を加えた8系統。
- 現行コードとの確認済みの差は、旧S-IDからの未反映3項目（S44・S45・S46、採否は要判断）と、検査側2系統（点滅の旧期待値、workflow監視範囲）。境界S39は保留。
- 回帰検査の未整備・不足を確認した規則は18件（全国12件 R02/R04/R06/R09/R11/R12/R14/R15/R16/R18/R20/R25、地域の継続検査を確認できなかった4件 R28/R29/R30/R34、試験の不足2件 R10/R31）。R10は既存テストが現在の点滅を検証しない。実機だけで評価する性能・可読性はこの数に加えない。
- [機械照合用の対応表](rule-test-map.json)はR-ID、コード・テストの起点、旧S-ID、確認の粒度を記録する。変更前に対象ファイルと照合し、関連R-IDをPR本文に記入する。依存先やデータだけを変える場合も、対応する入口まで辿る。

変更前に `R-ID・対象ページ・最後に優先するPR・置換理由・コード経路・現在のテスト範囲・新しい正負テスト・実機未確認範囲` をPR本文へ記載する。ルールを変える場合はこの1ファイルを同じPRで更新し、旧決定とユーザー承認根拠を削らず記録する。地図本体の修正と規則集の監査は別PRにする。
