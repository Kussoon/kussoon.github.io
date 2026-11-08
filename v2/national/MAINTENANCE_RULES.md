Warning: truncated output (original token count: 20838)
Total output lines: 330

# Kussoon V2 地図開発・確定仕様規則集

初回監査基準: 2026-11-06（日本時間）、main `476a6f91dbb7a95a99bb10caf571c125411ca9d2`（PR #290まで）。**追補: PR #292〜#308のマージ済み変更を反映。#291はこの文書を整備するDraft PRであり、#292以降のPR集計は下記追補で別管理。****このファイルを今後の地図開発で参照する唯一の規則集**とする。既存の[PR #1〜#245照合台帳](../audit/v2-national-pr-ledger-20261104.md)、[S01〜S49の当時の到達状況](../audit/v2-national-current-spec-20261104.md)、[不整合記録](../audit/v2-national-regressions-20261104.md)、[回帰計画](../audit/v2-national-regression-test-plan-20261104.md)は証拠・履歴である。以前のA/B/Cは当時のpilotについての判定であり、現在の公開版へ転記しない。

**適用の優先順位:** ユーザーが実機で承認し、後続のマージ済みPRで明示された最終決定を採る。PR番号だけで判断しない。対象ページを必ず特定する。正式公開版は [`/maps/national-municipalities.html`](../../maps/national-municipalities.html)。`v2/national/map.html`は転送、`official-2026-nationwide-pilot.html`、RC1、独立試作は別経路。**「コード確認」は動作確認済みを意味しない。** 不一致が残る場合、旧仕様を無条件に復活させない。

## 監査の分母と限界

GitHubのPR一覧で #1〜#290 の**実在288件**を列挙し、件名・本文・マージ状況を分類（#267/#282はPRではない）。既存台帳の #1〜#245 は本文・変更ファイル・取得可能なpatchを照合済みという当時の記録を再利用。今回 #246〜#290 の実在43件を追加分類し、地図関連29件／他コンテンツ14件。従って分類済み288件、未分類0件、地図関連247件（既存218＋今回29）、その他41件。追補43件は取得できた差分も確認し、重点6件（#91/#244/#259/#287/#288/#290）はCSS・JSの決定を個別に照合した。地域6リポジトリは実在59件を一覧分類し、操作・表示仕様に関係する19件の本文と差分を照合した。合計347件を分類（地図仕様関連266件／その他81件、未分類0件）。レビューの全件再調査、承認の実機原本、地域公開ページの全件実操作は未確認。

※ 初回の集計数値（288件／347件／34規則など）はPR #290時点の監査スナップショット。後続の17件（#292〜#308）とR35〜R38は追補で管理し、全履歴の再監査済み件数として上書きしない。

状態欄: **限定確認**=既存の対象限定テスト等／**コード確認**=現行ソースを照合したが公開実操作未確認／**要確認**=採否または実動作不足／**不整合**=根拠のある差異。古いS-IDは既存台帳の仕様番号。以下のR-IDが今後の変更影響を追跡する番号であり、個々の規則は表の1行で管理する。コード・テスト欄の相対名はリポジトリ内の現行ファイル。PRリンクと旧S-IDを[履歴台帳](../audit/v2-national-pr-ledger-20261104.md)と突き合わせる。

## 1. 地図データ・行政区域・県境

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R01 2026行政区域|全国47県・1,905区域。地図と庁舎1,912件の集合差（北方6・所属未定7・親市20）を用途別に扱い、浜松は現行3区。旧版のコードを混在させない。 **条件・例外:** 公開全国版。法的境界の現況保証ではない。|[#186](https://github.com/Kussoon/kussoon.github.io/pull/186) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231) [#248](https://github.com/Kussoon/kussoon.github.io/pull/248) [#251](https://github.com/Kussoon/kussoon.github.io/pull/251) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284)|`maps/national-municipalities.html`<br>`v2/data/national/2026-common/`|`national-2026-data.test.cjs`|コード確認|
|R02 県境・市区町村境|塗りpathと境界pathを分け、同じ線分を累積描画しない。選択専用の太線を重ねない。 **条件・例外:** 公開版は共通Topologyが7県、残り40県と全国概要は別経路。局所太線・白隙間はS39として未解決。|[#128](https://github.com/Kussoon/kussoon.github.io/pull/128)–[#131](https://github.com/Kussoon/kussoon.github.io/pull/131) [#187](https://github.com/Kussoon/kussoon.github.io/pull/187) [#268](https://github.com/Kussoon/kussoon.github.io/pull/268) [#277](https://github.com/Kussoon/kussoon.github.io/pull/277) [#279](https://github.com/Kussoon/kussoon.github.io/pull/279) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283)|`v2/progressive-preview/municipality-renderer.js`<br>`progressive-geometry.js`|`test-2026-single-stroke.cjs`<br>`progressive-seam-visual.browser.cjs（比較試験）`|要確認|

## 2. 描画方式・軽量化・性能

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R03 段階描画|全国概要から拡大率に応じて47県・市区町村へ到達可能とし、県pathタップによる県全体選択は行わず県の下向き3列メニューから選ぶ。離島を含む全域表示を維持。**#303:** 県選択後は軽量な全国地名索引から対象県の市区町村名だけを抽出して、詳細TopoJSONや庁舎を待たずに選択欄を先行有効化する。重い地図読込と市区町村一覧の利用を分離する。 **#309:** URLの `?pref=28` 等でmanifest確認済みの県コードを指定された場合は、全国版既存 `goPref` で直接県表示へ移行する。未指定・無効な県コードは全国初期表示を維持する。県別サイトでは同一エンジンを使い別実装を複製しない。 **学習モード（2026-11-07承認）:** `?studyPref=28` 等は全国表示を保ったまま県の実境界の外接矩形に25%余白を設けて表示する。県別詳細モード `?pref=XX` と併存し、未指定では従来の全国初期表示。学習フォーカスの「全体表示」は全国全体ではなく、起動時の対象県フォーカスへ戻す（Draft PR #344・未承認）。|[#217](https://github.com/Kussoon/kussoon.github.io/pull/217) [#261](https://github.com/Kussoon/kussoon.github.io/pull/261) [#265](https://github.com/Kussoon/kussoon.github.io/pull/265) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284) [#292](https://github.com/Kussoon/kussoon.github.io/pull/292) [#300](https://github.com/Kussoon/kussoon.github.io/pull/300) [#303](https://github.com/Kussoon/kussoon.github.io/pull/303) [#309](https://github.com/Kussoon/kussoon.github.io/pull/309)|`maps/national-municipalities.html`<br>`v2/progressive-preview/national-progressive-labels.js`|`national-2026-rc1.browser.cjs`（旧）<br>`national-pref-county-contract.test.cjs`（静的、#292）<br>Safari実操作不足<br>`v2/tests/national-pref-county-contract.test.cjs`（先行表示の静的検査）<br>`v2/tests/national-pref-county-contract.test.cjs`（studyPref静的契約）|兵庫県試作 PR #327 実機承認／正式版自動回帰静的確認済み・実機未検証|
|R04 詳細読込|詳細地図は必要な県のみ20m版TopoJSONを読み込み、県キャッシュを制限してWorkerを非同期運用する。**#303:** 市区町村一覧の有効化を地図の取得・JSON解析・arc展開・全国共通読みデータ照合・庁舎JSON取得の完了と連動させない。既存の2026年地名索引を再利用して選択県だけの名称候補を先行表示し、詳細と庁舎は独立して読み込む。地図準備中の市区町村選択はコードを保持し、準備完了時にフォーカス。県切替時は古い非同期応答を破棄し、県詳細が先に完成した場合は後続の軽量索引コールバックで上書きしない。失敗時fallback/メモリ/実機速度は継続検証する。|[#259](https://github.com/Kussoon/kussoon.github.io/pull/259) [#263](https://github.com/Kussoon/kussoon.github.io/pull/263)（試作） [#265](https://github.com/Kussoon/kussoon.github.io/pull/265) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#303](https://github.com/Kussoon/kussoon.github.io/pull/303)|`maps/national-municipalities.html`<br>`v2/progressive-preview/national-progressive-labels.js`<br>`v2/progressive-preview/national-progressive-labels.js`|`national-map-move.browser.cjs（Workerのみ）`<br>`v2/tests/national-pref-county-contract.test.cjs`（先行表示の静的検査）|コード・静的検査／Safari・Edge実機速度未確認|

## 3. ラベル配置・地名表示

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R05 地名の表示対象|全国・県別とも対象自治体の地名を表示し、クイズ中にのみ解答名を隠す。行政区域コードに照合した正式名称と確定済み二要素（市名/区名・都名/特別区名・郡名/町村名）を利用する。**#307: 地図ラベルは読み仮名OFFでも、2要素が確認できる場合は各要素を上下2段に分ける。**読みONでは各名称と読みを組み合わせた4段。表示・文字幅・衝突/区域収まり判定は同じ段数と高さを使い、手動座標補正は禁止。ラベル用モデルのnameとlabelNameは正式名を維持する。 **学習フォーカス（#327/#328/#330）:** `?studyPref=XX` は全国1,905区域に対して全国版と同じ現行エンジン・文字サイズ・アンカー・配置を計算し、計算後に対象外の地名だけをCSSで隠す。隣接県の区域・境界は維持する。県内候補を再配置したり、密度で非表示になった候補を強制表示したりしない。**拡大時の重なり修正（PR #344/#345・main反映済み）:** #220/#221の拡大時重なり許可が密集ラベルを重ねる根本原因だった。全国共通エンジンで全倍率の衝突判定を維持し、既存アンカーと優先順位を変えず重なる候補を非表示にする。画面表示の文字幅・段組み差を吸収するため、高倍率では全国共通で横2画面px・縦6画面pxの衝突余白を使う。表示数は全国版・学習フォーカスとも高倍率で減る場合がある。縮小して箱が離れれば再表示する。ズーム・読み仮名切替・画面変更では、160msの配置更新待ちの間も既存アンカーのまま文字サイズ・行間を即時同期して一時巨大化を防ぎ、重なる候補を一時非表示にする。|[#79](https://github.com/Kussoon/kussoon.github.io/pull/79) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#217](https://github.com/Kussoon/kussoon.github.io/pull/217) [#260](https://github.com/Kussoon/kussoon.github.io/pull/260) [#263](https://github.com/Kussoon/kussoon.github.io/pull/263) [#265](https://github.com/Kussoon/kussoon.github.io/pull/265) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#300](https://github.com/Kussoon/kussoon.github.io/pull/300) [#305](https://github.com/Kussoon/kussoon.github.io/pull/305) [#306](https://github.com/Kussoon/kussoon.github.io/pull/306) [#307](https://github.com/Kussoon/kussoon.github.io/pull/307) [#344](https://github.com/Kussoon/kussoon.github.io/pull/344) [#345](https://github.com/Kussoon/kussoon.github.io/pull/345)|`national-progressive-labels.js`<br>`v2/national/density-labels.js`|`pilot-label-scope.browser.cjs`<br>`national-2026-rc1.browser.cjs`<br>`v2/tests/national-pref-county-contract.test.cjs`（UIの静的検査）<br>`v2/tests/national-pref-county-contract.test.cjs`（studyPref静的契約）<br>`v2/tests/national-study-label-layout.test.cjs`<br>`v2/tests/national-study-label-layout.browser.cjs`（全国1905候補・5府県・Chromium/WebKit、iPhone Safari実機とは区別）|PR #344/#345の自動回帰とChromium/WebKit試験成功、兵庫県実機確認済み／iPhone Safari実機は未検証|
|R06 位置の根拠|地物内の代表点と連続成分を使い、恣意的な個別座標を増やさない。田尻町の空港島など飛地は検証済み庁舎側を優先する旧5Cの根拠を保持。 **条件・例外:** 旧5Cと現行balanced/段階索引の同等性は未確定。全県品質を自動合格としない。|[#94](https://github.com/Kussoon/kussoon.github.io/pull/94) [#95](https://github.com/Kussoon/kussoon.github.io/pull/95) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) [#253](https://github.com/Kussoon/kussoon.github.io/pull/253) [#261](https://github.com/Kussoon/kussoon.github.io/pull/261)|`v2/shared/established-label-adapter.js`<br>`v2/progressive-preview/label-index.json`|`compare-2026-labels.browser.cjs`|要確認|
|R07 区・郡付き名称|政令指定都市の区は全国・県別とも『市名／区名』の**2段ラベル**（例:『札幌市』改行『中央区』、横浜市/鶴見区）、東京都特別区は『東京都／区名』（例:東京都/新宿区）を必須とする（#307）。郡付き町村も確認済みの郡名／町村名を2段表示する。検索・県内選択欄・吹き出しの自治体名はコード照合された**連結正式名称**を維持し、表記内容と地図上の段組みのみを区別。よみがなONはR08に従う。旧描画コード向けのname/labelNameは同じ正式名称とし、親市名の二重表示を防ぐ。未確認の郡名/読みは推測しない。|[#214](https://github.com/Kussoon/kussoon.github.io/pull/214)–[#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#266](https://github.com/Kussoon/kussoon.github.io/pull/266) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#292](https://github.com/Kussoon/kussoon.github.io/pull/292) [#293](https://github.com/Kussoon/kussoon.github.io/pull/293) [#305](https://github.com/Kussoon/kussoon.github.io/pull/305) [#306](https://github.com/Kussoon/kussoon.github.io/pull/306) [#307](https://github.com/Kussoon/kussoon.github.io/pull/307)|`county-overlay.js`<br>`national-progressive-labels.js`<br>`maps/national-municipalities.html`<br>`v2/national/vertical-popup-trial.html`|`progressive-county-labels.test.cjs`<br>`national-pref-county-contract.test.cjs`（静的＋名称例）|表示分割・名称・静的契約検査済み／Safari・Edge実機未確認|

## 4. 読み仮名・初期表示

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R08 よみ初期OFF|よみがなは初期OFF。コードと名称が確認済みの読みだけ表示し、欠落や未確認は補わない。**#307:** 市名＋区名、東京都＋特別区名、郡名＋町村名などの検証済み2要素ラベルは、OFF時『名称1／名称2』の2段、ON時『名称1／読み1／名称2／読み2』の4段を共通の地図レンダリング規則とする。吹き出し見出し直下の読みはON/OFFに連動するが見出しはフル正式名称を維持。|[#223](https://github.com/Kussoon/kussoon.github.io/pull/223) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#266](https://github.com/Kussoon/kussoon.github.io/pull/266) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284) [#295](https://github.com/Kussoon/kussoon.github.io/pull/295) [#296](https://github.com/Kussoon/kussoon.github.io/pull/296) [#305](https://github.com/Kussoon/kussoon.github.io/pull/305) [#307](https://github.com/Kussoon/kussoon.github.io/pull/307)|`maps/national-municipalities.html`<br>`v2/national/vertical-popup-trial.html`<br>`national-progressive-labels.js`<br>`reading-bridge.js`<br>`maps/national-municipalities.html`|`national-readings.test.cjs`（既知6失敗）<br>試作吹き出しON/OFF/未確認読みのブラウザ回帰なし<br>`v2/tests/national-pref-county-contract.test.cjs`（公開の静的契約）|表示分割・名称・静的契約検査済み／Safari・Edge実機未確認|

## 5. 区域の選択・色分け・点滅

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R09 県別淡色|全国47県を固定の8色テーブルで塗り、隣接する都道府県は必ず異なる色にする。配色は毎回ランダムにせず、県コードに対する固定割当を使う。全国表示・`?studyPref=XX`・`?pref=XX`の区域詳細で同じ色テーブルを共有する。隣接とは県境を共有することを指し、県境のある島の境界も含める（例：兵庫/岡山、岡山/香川、広島/愛媛）。海峡を隔てるだけの隣接感や橋は県境に含めない。選択区域の点滅は既存CSSで行い、県別の元色と境界pathを変えない。|[#281](https://github.com/Kussoon/kussoon.github.io/pull/281) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284) [#328](https://github.com/Kussoon/kussoon.github.io/pull/329)|`prefecture-colors.js`<br>`prefecture-colors.css`|`prefecture-colors.test.cjs`（47固定割当・全88隣接ペア）<br>`prefecture-colors-public.browser.cjs`（全国・studyPref・県別詳細・選択点滅）|自動契約・Chromium/WebKit検証|

|R10 選択の最終点滅|公開版だけ白↔元の県別淡色を各0.5秒、step-endで瞬間切替。フェードなし。reduced-motionでは元色で固定。 **条件・例外:** 旧琥珀・元色脈動(#281)、黄赤0.6秒(#286)、黄赤0.5秒(#287)を公開版では置換。試作ページは別。|[#281](https://github.com/Kussoon/kussoon.github.io/pull/281) [#284](https://github.com/Kussoon/kussoon.github.io/pull/284) [#286](https://github.com/Kussoon/kussoon.github.io/pull/286) [#287](https://github.com/Kussoon/kussoon.github.io/pull/287) [#289](https://github.com/Kussoon/kussoon.github.io/pull/289)|`maps/national-municipalities.html`<br>`v2/progressive-preview/prefecture-colors.css`|`national-2026-public.browser.cjs（旧期待値で不整合）`|コード確認/テスト不整合|

## 6. タップ・再タップ・選択解除

|ID・名称|現在有効な規則／適用条件・例外|根拠・最終決定|現行コード|自動テスト・不足|状態|
|---|---|---|---|---|---|
|R11 ×と再タップ|×は吹き出しだけ閉じ、選択と位置は保持。同じ市区町村の再タップで選択を解除して点滅を止め、次回のタップで選択し直せる。#304でこの操作を紹介する『区域の点滅は、もう一度押すと止まります。』を冒頭案内に追加。吹き出しの上下移動、再選択・閉じる操作の確定仕様を維持する。|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#250](https://github.com/Kussoon/kussoon.github.io/pull/250) [#283](https://github.com/Kussoon/kussoon.github.io/pull/283) [#294](https://github.com/Kussoon/kussoon.github.io/pull/294) [#304](https://github.com/Kussoon/kussoon.github.io/pull/304)|`maps/national-municipalities.html`<br>`v2/progressive-preview/national-progressive-labels.js`<br>`v2/national/vertical-popup-trial.html`|`nationwide-retap.browser.cjs`（pilot）<br>上下移動→×→選択変更の回帰未整備|HTML・静的契約確認／Safari実機未確認|
|R12 空白・他区域|空白タップでは区域選択を解除しない。別区域・検索選…10838 tokens truncated…索・吹き出し・全画面

[#297](https://github.com/Kussoon/kussoon.github.io/pull/297) を正式版 `/maps/national-municipalities.html` に適用。

- **検索UI（R18/R38）:** キーワード例を『例: やま、川、岡』に変更。35件上限の検索候補があふれるとき、一覧の左に視認できるスクロールトラックと操作可能なつまみを置く。非スクロール時はバーを隠す。候補一覧の選択を維持。
- **説明UI（R19）:** 長い文章から箇条書きへ変更。『市区町村の位置を押すと吹き出しが出ます』『地図内のボタンでよみがなが出せます』を明記。
- **吹き出し（R15/R16/R35）:** タイトルバー限定から、リンク・×・内部の操作ボタン以外の全体を上下ドラッグ可能へ変更。左右は禁止。長文で従来のタッチスクロールと競合するため、本文の上下送出ボタンを追加し、3/6リンク到達性を維持。通常の操作要素はドラッグ開始対象外とする。
- **全画面（R13/R37）:** 地図右下に全画面切替を追加。iPhone Safariでは本物のFullscreen APIを使えないため、ブラウザーUIの内側で画面いっぱいに表示する。対応環境では標準Fullscreen API。**全画面表示中の吹き出しは常時非表示。** 復帰可能で地図操作・読み切替は維持。

**検証区別:** 公開HTML内スクリプト構文と既存/追加の静的テストアサーションは確認済み。iPhone Safari、タッチ移動、全画面切替、スクロールバーの実動作、3/6リンクの見切れは実機未確認。規則表の列挙テストを実行済みの保証として使用しない。

## 2026-11-06 追補：PR #298 全画面の吹き出し・検索順・表示整理

[#298](https://github.com/Kussoon/kussoon.github.io/pull/298) で、**R37にあった『全画面中は吹き出しを禁止』という#297の仕様を置換**。地図左下に通常と同じ自治体情報吹き出しを表示し、既存の上下移動・読み仮名・3/6リンク・×を維持する。全画面を地図の表示領域として使いつつ、選択情報は表示可能にする。以前の非表示CSSやJS判定を戻してはならない。

- R18: 検索結果は市区町村コードの昇順に**並べ替えてから**35件へ制限する。県コード順、同一県内は自治体コード順。検索候補の表示情報、左側スクロールバー、選択方法は維持。
- R19: 通常時に出ていた『全国のまま 拡大20.85倍・地名28件』等の診断的なステータスは非表示。ただし読み込み中・エラーの案内は必要なときに表示する。『開発時の比較版』リンクを公開ページから除去（比較版データ・ページは温存）。読み込み注意文を『読み込みに時間がかかることがあります。』に変更。
- R37: 全画面でも吹き出しを表示し、左下を初期位置とする。必要に応じて上下ドラッグ可能。

**回帰確認:** 既存テストの旧『全画面の吹き出し非表示』期待値は#298で新しい期待値に置換。HTML内のJavaScript構文3件と静的契約アサーションを確認済み。iPhone Safariでの実機・視覚回帰は未確認。

## 2026-11-06 追補：PR #299 地図右側の操作ボタン配置

[#299](https://github.com/Kussoon/kussoon.github.io/pull/299) を正式版へ適用。R13/R14/R37の変更として、右下の拡大縮小は **『＋』『－』のみ、左＋・右－の同幅2列**。その下に『全体表示』『よみがなON/OFF』を配置する。独立した『全画面／戻る』は**地図右上隅**へ配置する。通常表示・全画面表示とも同じ配置意図を維持し、safe-areaを考慮する。ボタンの文字は通常14px、狭い画面13px（ズーム記号22px）。アクセシビリティ用の『地図を拡大／縮小』ラベルは残す。

以前の右下5段構成や拡大縮小の『＋ 拡大』『－ 縮小』という視覚文言は、本番では#299で置換した。全画面中の左下吹き出し（#298）を隠す変更はしない。

検証: 公開HTMLのスクリプト構文と静的契約アサーションは確認済み。iPhone Safari上の画面配置・実機操作は未確認。

## 2026-11-06 追補：PR #300 県・市区町村の選択UIと全国範囲

[#300](https://github.com/Kussoon/kussoon.github.io/pull/300) で正式公開版の地域ナビゲーションと文言を変更。対応R-IDは **R03/R05/R08/R18/R19/R24**。

- 県選択は「都道府県を選ぶ」ボタンを押して**下に**47県を北海道から順に**3列**表示。県名の独立ラベルは不要。従来のnative selectを非表示の状態ソースとして残し、カスタムメニューで変更イベントを発火させる。県全体を地図pathタップで選択する動作は復活させない。
- 市区町村は「まず都道府県を選択」を初期表示。県読込後に下向きへ開く**1列のスクロール一覧**で選択可能。ブラウザーがnative selectを上向きに展開する挙動を避ける。画面からは独立した『市区町村』の見出しを省く。外側タップ/Escapeで閉じる。
- 『周辺の市区町村名を表示』を公開画面から削除し、県内の通常表示では常時表示する。場所当てクイズ中は問題の答えを隠す例外を維持する。読みの初期OFFと選択時の操作は別規則R08/R11。
- 『全国地図の表示範囲』選択を廃止し、全国地図は**離島を含む全域**を固定で表示する。内部の nationExtent=all 値は残し、描画エンジンを壊さない。
- 冒頭の不要な県選択案内を削り、吹き出しの上下移動の説明は出現の説明に続ける。地図一覧・地域リンク・トップへのリンクはデータ注記の後の最下部へ移す。

**検証:** 公開HTMLのJS構文と新旧の静的契約チェックを確認済み。iPhone Safariでの3列レイアウト・下向き展開・全国の離島表示とズーム・名称表示は実機未確認。旧ブラウザー向けpilotのテスト成功を今回の公開版の動作確認と混同しない。

## 2026-11-06 追補：PR #301 横並びナビ・縮小可能範囲の修正

[#301](https://github.com/Kussoon/kussoon.github.io/pull/301) を正式版へ適用。対応R-ID：**R11/R12/R13/R14/R18/R19/R24**。

- **画面構成（R18/R19）:** 市区町村のキーワード検索欄と地域・表示範囲の選択欄を**横並び2列**に変更。選択メニューは#300の『都道府県3列・市区町村下方向展開』を維持。市区町村の初期案内は『次に市区町村を選択』に変更。
- **不要な小地図（R19）:** 『全国の中での位置（オレンジ色が選択中の都道府県）』の説明と小日本地図は公開画面から取り除き、描画呼出し・専用スタイルも除去する。全国本体の描画や離島全域設定とは別機能であり、削除の対象ではない。
- **縮小の下限（R13/R14）:** 市区町村へフォーカスすると従来はその区域の投影枠を1倍の下限に使い、選択後にそれ以上縮小できなかった。`v2/progressive-preview/map-viewport.js` の最小倍率をインスタンスごとに変更できるようにし、**選択時のみ県全体の投影境界から縮小下限を計算**する。全国表示/区域未選択は従来どおり最小倍率1。『全体表示』は以前と同様にリセット、再タップと×の選択保持はR11に従う。

**検証:** HTMLのインラインJS構文、既存・追加の静的アサーション、疑似SVGを用いたviewportの通常倍率→選択時の縮小→1倍への復帰→リセットの動作を確認。iPhone SafariおよびPC Edgeでの実機ズーム・タッチ動作は未確認。共通viewportのほかの地図での使用影響も継続回帰対象とする。

## 2026-11-06 追補：PR #302 検索・地域選択欄とフッター余白

[#302](https://github.com/Kussoon/kussoon.github.io/pull/302) で R18/R19 を更新。①検索欄の長い補足文を削除（検索機能は維持）、②横並びの右側『地域・表示範囲を選んで移動』の外側は**常時開く**構成へ変更し、見出しは左検索ラベルと同じフォント・太さにする（都道府県/市区町村の内側メニューだけは必要時に開く）、③フッター前の空間を縮小するためメインコンテンツ下側paddingを通常54px・狭幅36pxから8pxへ変更。#301の横並び、#300の県3列・市区町村下向き展開と、共有フッター・下部リンクを維持。

検査：インラインJavaScript構文と `v2/tests/national-pref-county-contract.test.cjs` 相当の既存・追加アサーションを確認。iPhone Safari等の表示検査は未実施。

## 2026-11-06 追補：PR #303 市区町村選択欄の先行有効化

[#303](https://github.com/Kussoon/kussoon.github.io/pull/303) で **R03/R04/R18** を更新。旧goPrefは県の20m詳細TopoJSONを取得・全域の読み仮名ソースと照合し、さらに庁舎情報を受け取ってから市区町村の選択一覧を作成していた。北海道ではこの待機が目立った。全47県の20m詳細地図を一括取得していたわけではない。

新仕様は、全国地図用の既存2026年地名索引から選択した県コードのレコードだけを取り出して一覧を先に表示し、有効化する。全国の索引ファイルは新たに二重ダウンロードしない。重い県別地図処理・全件読みソース照合・庁舎JSON取得とは非同期にする。選択欄が先に有効化された時点で市区町村を選んだ場合はその5桁コードを保持し、県別詳細の描画が完了したら該当区域に移動する。素早い県切替で前の県のリストを使わず、県別描画が先に完了した場合も索引側の遅延応答で上書きしない。

既存のR07（郡・市区名）、R08（確認済み読み）、R11/R12（区域選択）、R15〜R17（吹き出し）、R13/R14（ズーム）を維持する。**検証:** 公開HTML/索引JSの構文解析と静的契約アサーションが成功。iPhone Safari・PC Edge上の実測時間やUI操作は未確認。

## 2026-11-06 追補：PR #304 検索・地域選択を縦並びに戻す

[#304](https://github.com/Kussoon/kussoon.github.io/pull/304) で、#301の検索・地域選択の横並び2列を**縦並び1列に置換**した。#302の地域選択パネル常時展開、#300の県3列/市区町村下方向、#303の軽量な市区町村索引による先行有効化を維持する。冒頭案内は『吹き出しは上下に移動でき、×で閉じられます。』『区域の点滅は、もう一度押すと止まります。』『地図内のボタンでよみがなが出せます。』の順。該当規則はR11/R18/R19。既存の横並び2列のテスト期待値を縦並びへ更新した。HTML内JavaScript構文と静的/viewportモック契約は確認済み、iPhone Safariでの表示は未確認。

## 2026-11-06 追補：PR #305 政令市区と東京都23区の正式地名ラベル

[#305](https://github.com/Kussoon/kussoon.github.io/pull/305) でR05/R07/R08/R17を更新。旧県別描画は `region.name`（『南区』『北区』）をラベル・衝突計算に使い、全国地名索引の `fullName`（『札幌市南区』『横浜市鶴見区』）と不一致だった。県別描画は同じ5桁コードを持つ全国索引の正式名をラベルと文字幅計算に採用し、**市名を落とさない**。全国段階描画も正式名を使う。通常の行政区域名・座標・ジオメトリは改変しない。

- **政令市の区:** 『札幌市南区』『横浜市鶴見区』『大阪市鶴見区』『神戸市中央区』のように、全国・県別とも市＋区。既存の検証済み読みのpartsは維持。
- **東京都23区:** コード13101〜13123の23件すべて『東京都＋区名』を正式な表示名とし、読みON時には都名の読みも含む。東京都のその他の市町村や他県の区へ都名を付けない。
- **郡付き町村:** 既存の検証済み郡名（R07、#292）を維持する。
- **衝突とフィット:** 短い『南区』で文字幅を見積もらず、実際の長い正式名称を使って配置する。手動の個別座標補正は行わない。

検証: 2026全国地名索引1905件を使った東京都23区全件・札幌・横浜の名称検査と、県別表示経路の静的アサーション、関係JS構文を確認。iPhone Safari・PC Edgeの視覚的収まりと読みは未実機検証。

## 2026-11-06 追補：PR #306 キャッシュ・旧描画処理による区名短縮の回帰防止

[#306](https://github.com/Kussoon/kussoon.github.io/pull/306) は、#305で政令指定都市の区に『市名＋区名』を指定したあとも、実機の横浜市地図で『鶴見区』『港北区』と表示された報告を受けた修正。原因候補は、ブラウザーが修正前のラベル描画スクリプトをキャッシュしていて、新しい `labelName` を無視して旧 `name` を描画すること。**県別地図の表示専用モデルには、`labelName` と `name` の両方に全国索引の正式表示名を渡す**ことを規則とし、元の行政データや座標を変更しない。`place-labels.js`、`established-label-adapter.js`、`national-progressive-labels.js`、`density-labels.js` の参照URLは修正時にバージョンキーを更新する。全国版/県別版の政令市区、東京都23区、読み・文字幅計算の照合はR05/R07/R08/R17/R24で継続。

確認：2026地名索引を用いた名称の静的アサーション、HTML/JS構文をチェック。実機Safari/Edgeでの表示は未確認なので、キャッシュが唯一の原因とは断定しない。

## 2026-11-06 追補：PR #307 市・区／都・特別区／郡・町村の地図ラベル2段化

[#307](https://github.com/Kussoon/kussoon.github.io/pull/307) で **R05/R07/R08/R17** を確認・更新。都道府県別地図のラベルは、#305/#306により『札幌市中央区』のフル名称1行になっていた。ユーザーが望む全国地図の確定表示は**1行目『札幌市』、2行目『中央区』**。よみがなOFFの県別地図でも、コード照合済み2要素を2段表示する。よみがなONでは名称／読み／名称／読みの4段表示を維持する。

- 都市の区：札幌市／中央区、横浜市／鶴見区、神戸市／中央区など。全国と県別のラベルを統一する。
- 東京23特別区：東京都／千代田区、東京都／新宿区など。都名を省略しない。
- 郡のある町村：確認済みの郡名／町村名。未確認値は推測しない。
- ラベルの分割は**地図内表示のみ**。選択ボタン・検索・吹き出し見出しは『札幌市中央区』など連結した正式名を維持する。
- ラベル幅・高さ、衝突回避、区域への収まりも実際の2段/4段を前提として計算する。個別の手動座標による調整は追加しない。
- PR #305/#306で短い区名への逆戻りを防止した `name` / `labelName` の正式名称一致を保持し、全国側は名称2要素を分けるとき市名を重複追加しない。更新したJSの参照には `v=307` を指定する。

検証: 札幌市中央区・東京都新宿区・川辺郡猪名川町の名称行分割、旧キャッシュ由来の親市名重複防止と2段の文字幅計算、HTML/JS構文と公開版の回帰アサーションを確認。iPhone Safari・PC Edgeでの視覚位置や読み仮名の行間は未確認。

## 2026-11-06 追補：PR #308 地図上部への全国・都道府県移動ボタン配置

[#308](https://github.com/Kussoon/kussoon.github.io/pull/308) により **R14/R19** を更新。正式全国地図のパンくず見出し（例『日本全国 ＞ 北海道』）の**すぐ下・地図本体の上**へ『日本全国へ戻る』『都道府県全体へ戻る』の2ボタンを移す。いずれも既存のID、クリック動作、disabled状態を維持し、新しいボタンを複製しない。地図の下に残っていた説明『都道府県は上の選択欄から指定できます。地図を拡大して市区町村をタップしてください。ピンチ・ドラッグ・右下のボタンでも操作できます。吹き出しは上部の帯で上下に移動でき、×で閉じられます。』を**全文削除**。冒頭の別の使い方案内は維持する。

HTML内JavaScriptの構文・公開ページの既存＋追加契約アサーション（位置、ボタンの唯一性、不要説明削除）を確認済み。Safari実機の表示は未確認。

## 2026-11-06 追補：PR #309 全国エンジンを県別サイトで共有

[#309](https://github.com/Kussoon/kussoon.github.io/pull/309) により全国公開版に `?pref=28`（兵庫県）など都道府県コードを検証して既存 `goPref()` を呼ぶ初期表示導線を追加。値は既存manifestに一致したときだけ採用し、無指定/不正値は従来の全国初期表示。兵庫県リポジトリの[PR #8](https://github.com/Kussoon/hyogo/pull/8)は `/hyogo/v2-study-all.html` の複製地図HTMLを廃止し、この全国本番表示へリダイレクト。**47都道府県の地図エンジン・ラベル描画の複製は禁止**し、県別学習・クイズなど固有機能のみ県別サイトで維持する。全国エンジン自体に残るズーム時ラベル巨大化・重なりは未解決であり、本PRによる解消を主張しない。検証はコード静的テスト、Safari視覚実機未確認。

## 2026-11-07 都道府県学習モード：全国地図のフォーカス再利用

兵庫県の試作 [PR #327](https://github.com/Kussoon/kussoon.github.io/pull/327) をユーザー実機で承認。正式版へ `?studyPref=28` の表示を移植し、**全国地図と全国ラベルの自動配置は完全に維持**する。対象県へのフォーカスと、配置後の他県ラベルのCSS非表示だけを追加する。隣接県の地図は表示する。これまでの `?pref=28`（県詳細データモード）を置き換えず、独立した導線で併存。全国学習モードの密度制御で対象県の地名が省略される場合も元の全国版の仕様どおりであり、全地名表示や新規ラベルエンジンを採用したことにはならない。今後47県はコードの置換のみで展開する。試作実機確認と正式版静的テストは別の評価であり、正式版実機結果は未検証。


## 2026-11-09 追補：PR #344公開後の密度エンジンのキャッシュ

PR #344のマージ後、公開ページは `national-progressive-labels.js?v=308` を読み込んでいましたが、これと組み合わせる `density-labels.js` のHTML参照には版数キーがありませんでした。公開表示でラベル重なりが再発したため、関連する描画スクリプトも同じ更新単位でキャッシュ更新できるようにします。

`density-labels.js` のソースに版数コメントを置き、HTMLの `?v=` と静的契約テストで一致を検査します。公開版の最終確認では、実際に新しい版数付きURLが読み込まれ、ラベル重なりが解消していることを別途確認します。自動ブラウザー試験と公開CDN経由の確認を同一視しません。
