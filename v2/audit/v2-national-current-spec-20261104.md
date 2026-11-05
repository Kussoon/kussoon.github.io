> PR #263性能追検証: [Worker化の範囲と測定結果](v2-national-regression-test-plan-20261104.md#progressive-performance)。S44〜S48・旧24失敗は独立残件。通常URL/仕様判定は変更せず、Draft試作の性能改善を本番解消と数えない。

> 2026-11-05 段階表示の別PR試作: [実装・証拠・限界](v2-national-regression-test-plan-20261104.md#progressive-restoration-prototype)。`?progressive=1`のみ。通常版49項目の判定とS44/S45/S46/S48・旧24失敗は維持し、本番解消扱いにしない。

# V2全国統合版・確定仕様と実装照合（2026-11-04）

初回監査の基準main: `c69c970c982724b20d9a327e1fd1c223f356aebd`。有効規則の正本は[既存MAINTENANCE_RULES](../national/MAINTENANCE_RULES.md)を更新して再利用する。今回は既存40項目を再評価し、新規S41〜S49を追加した49項目を記録する。A23／B12／C5／要確認9。Cは明示的変更・廃止の記録であり、Aも表に記した観測条件の範囲に限る。詳細な定義・集計方法は[PR照合台帳](v2-national-pr-ledger-20261104.md)参照。

前回UI修正時の基準main: `958fe45b8c69780f4f5fb1a83905a3783aaaeac0`。#248/#250〜#253はマージ済み。S12の高さ一致を今回の明示要件で置換し、S12/S13/S19を下記ブラウザ検証範囲でAへ更新。40番号とS21〜S26の保留B6件は維持する。

## 今回の補完監査の基準と読み方

基準main: `6bdd8693841e0723cfa427f5fb9532cd9930ee94`。#248〜#253/#259/#260はマージ済み（#249は別コンテンツ）。前回のA24/B6/C4/要確認6は履歴で、今回の49項目はA23/B12/C5/要確認9。S14/S15は実入力の閾値/イベント順を未検証のためAから要確認へ戻す。新規9件はA1/B6/C1/要確認1。

A=明記した条件で継承確認、B=利用者動作の継承漏れ・差異、C=根拠付きの意図的変更、要確認=必要な観測/採用根拠不足。旧版の「全件」がDOM生成/表示許可/画面内/全文字可視/全国パンで到達のどれかを区別する。Aの数やCI合格率で総合監査完了とはしない。性能未測定の機能を性能合格に含めない。

[段階表示の実測・見落とし原因](v2-national-regression-test-plan-20261104.md#behavior-audit)と[再評価行列](#behavior-reassessment)が今回の根拠。以下の過去基準SHA・旧集計・旧未マージ記述は記録当時の履歴として読む。

<a id="formal-specs"></a>

## 機能別の有効仕様と現行照合

仕様の正本は既存の[MAINTENANCE_RULES.md](../national/MAINTENANCE_RULES.md)。既存の[庁舎仕様](../national/OFFICES-DATA-SPEC.md)・[5C出典](../national/PROPOSAL5C-TRIAL.md)を再利用する。下表はその仕様の実装到達状況であり、Bを現行仕様へ書き換えて追認する表ではない。

|ID|判定|仕様／決定|過去PR・後続変更|現在の経路|検証・回帰テストの限界|
|---|---|---|---|---|---|
|S01|A|×は吹き出しのみ閉じ、選択色・投影・表示位置を維持|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)|pilot: popupClose / renderOfficePopup|×前後の選択/全path/viewBoxが不変。1280/390px、3区域、拡大/パン後も比較。Safari実機未確認。CPU予算はこの状態規則には非該当。[実再タップ](../tests/nationwide-retap.browser.cjs)|
|S02|A|同一市域再タップは選択色のみ解除し表示範囲を維持|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)|pilot: map click → paint → viewport.reset|同一区域再タップで選択だけ解除、投影/範囲不変。西宮/多可/中央区、1280/390px。実機/全区域は未確認。再描画時間の上限なし。[実再タップ](../tests/nationwide-retap.browser.cjs)|
|S03|A|解除後の再タップで選択色と吹き出しが再表示|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)|pilot: map click / renderOfficePopup|解除後の次タップで再選択＋吹き出し。上記6条件の実click。連打/複数指/全区域未確認。[実再タップ](../tests/nationwide-retap.browser.cjs)|
|S04|A|別区域・検索候補選択で閉じ状態を解除|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#142](https://github.com/Kussoon/kussoon.github.io/pull/142) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204)|pilot: dismissedPopupCode / updateSearch|×後の再検索と別区域検索で開き直す。中津川/岐阜と浜松3区、名称/読み/コード。Enter操作はS46でB。非同期競合/応答時間未確認。[実検索](../tests/nationwide-search.browser.cjs)|
|S05|要確認|県・全国へ移動すると選択と吹き出し状態を初期化|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)|pilot: goPref / returnNation / prefBtn|県全体戻りは確認、全国/県切替全経路の状態表は未完。retapの県戻り限定。エラー/クイズ/競合を含む遷移は未確認。[実再タップ](../tests/nationwide-retap.browser.cjs)|
|S06|A|選択は琥珀色の塗りで表現し選択専用太線を追加しない|[#40](https://github.com/Kussoon/kussoon.github.io/pull/40) [#80](https://github.com/Kussoon/kussoon.github.io/pull/80) [#85](https://github.com/Kussoon/kussoon.github.io/pull/85) [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)|municipality-renderer.render / .land.chosen|選択塗り・塗りpath strokeなし、選択外郭を増設しない。実SVG/計算済CSS、複数県/区域。全47県の見た目・知覚的二重線はS39の未確認。[実ページ](../tests/nationwide-2026.browser.cjs)|
|S07|A|通常自治体は公式サイト・Wikipedia・ここへ行くの3リンク枠|[#80](https://github.com/Kussoon/kussoon.github.io/pull/80) [#88](https://github.com/Kussoon/kussoon.github.io/pull/88) [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)|office-directory.render / links|通常3枠と施設別URL/target/経路を確認。西宮/多可、狭幅を含む。外部リンク先の現時点到達は対象外。[吹き出し](../tests/pilot-ui.browser.cjs)|
|S08|A|政令市区は区役所と親市役所を分け、各3リンク枠|[#87](https://github.com/Kussoon/kussoon.github.io/pull/87) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#96](https://github.com/Kussoon/kussoon.github.io/pull/96) [#97](https://github.com/Kussoon/kussoon.github.io/pull/97) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)|office-directory.resolve / render; pilot.popupName / popupScroll|東灘/中央区の区＋親市6リンク、各枠へ到達。320/375/390/844px、Chromium/WebKit。全1912の実画面/実機未確認。[吹き出し](../tests/pilot-ui.browser.cjs)|
|S09|A|公式サイトはURL監査Aかつ安全なURLの場合だけ有効|[#205](https://github.com/Kussoon/kussoon.github.io/pull/205) [#212](https://github.com/Kussoon/kussoon.github.io/pull/212)|office-directory.render / safeUrl|A/安全URLのみ有効、B/C/未判定/不正URLは無効枠。実台帳1912照合＋renderer正負検査。公式性の再判定/外部HTTP再監査は未実施。[庁舎](../tests/office-directory.test.cjs)|
|S10|A|経路は元の庁舎名＋住所。表示名の建物接尾辞だけ省略|[#80](https://github.com/Kussoon/kussoon.github.io/pull/80) [#87](https://github.com/Kussoon/kussoon.github.io/pull/87) [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91)|office-directory.destination / displayOfficeName|表示接尾辞省略と元名/住所による別施設経路を検査。renderer正負＋実DOM経路の独立性。全住所の現況/Google側の表示は未確認。[庁舎](../tests/office-directory.test.cjs)|
|S11|A|47都道府県の庁舎JSONは同一schema・参照・親子規則|[#150](https://github.com/Kussoon/kussoon.github.io/pull/150) [#151](https://github.com/Kussoon/kussoon.github.io/pull/151) [#185](https://github.com/Kussoon/kussoon.github.io/pull/185)|test-office-directory-data.cjs|47県1912地域/施設、親子参照と形式を照合。実データ/DOM参照、今回47県ロード。住所最新性や法的行政区画の独立証明ではない。[全実データ](../tests/national-2026-data.test.cjs)|
|S12|A|狭幅でも吹き出しと右4ボタンを分離し、リンク下端を切らず高さ不足時は内部スクロール|[#83](https://github.com/Kussoon/kussoon.github.io/pull/83) [#84](https://github.com/Kussoon/kussoon.github.io/pull/84) [#90](https://github.com/Kussoon/kussoon.github.io/pull/90) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#242](https://github.com/Kussoon/kussoon.github.io/pull/242) [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) [#244](https://github.com/Kussoon/kussoon.github.io/pull/244)|pilot: .office-popup / .popup-scroll / .popup-content|初期リンク下端/全リンク矩形/右4ボタン非重複。4画面寸法、3/6リンク、Chromium/WebKit。iPhone動的バー/safe-area実機は未確認。[吹き出し](../tests/pilot-ui.browser.cjs)|
|S13|A|二施設の長い情報は吹き出し内部でスクロールし全リンクへ到達できる|[#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) [#244](https://github.com/Kussoon/kussoon.github.io/pull/244)|pilot: popupScroll / safe-area末尾余白|内部スクロール末尾とヒットテスト、地図位置維持。Chromium native touch＋WebKit到達性。iOS慣性/端部の指移動は未確認。[吹き出し](../tests/pilot-ui.browser.cjs)|
|S14|要確認|タッチ1px・マウス5pxでドラッグを区別し単純タップを保持|[#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#240](https://github.com/Kussoon/kussoon.github.io/pull/240)|map-viewport.pointerMove / onClickCapture|1px/5px閾値は部品。実タッチの大きなパンは確認。native 1px/5px境界・手ぶれ→clickの実測なし。旧Aを取り下げ。閾値のソース存在で操作合格にしない。[実タッチ](../tests/nationwide-touch.browser.cjs)|
|S15|要確認|子pathからバブルするlostpointercaptureでドラッグを終了しない|[#241](https://github.com/Kussoon/kussoon.github.io/pull/241)|map-viewport.onLostMapCapture|子path capture喪失の正負分岐は部品で確認。Safariの実際のtarget/event順序は未採取。旧Aを取り下げ。実機の長いドラッグ継続は未確認。[実タッチ](../tests/nationwide-touch.browser.cjs)|
|S16|A|市域フォーカス後の県の投影範囲を上下左右の移動制限に使う|[#245](https://github.com/Kussoon/kussoon.github.io/pull/245)|map-viewport.setContentBounds / pilot.paint|多可フォーカス後に4方向pan、解除後も移動範囲保持。Chromium native touch/実click＋境界超え試験。全47県/散在島/実機の限界までのパン未確認。[実タッチ](../tests/nationwide-touch.browser.cjs)|
|S17|A|ピンチ・ホイール・＋／−・resetはviewBoxを操作|[#136](https://github.com/Kussoon/kussoon.github.io/pull/136)|map-viewport.init / zoom / pan / reset|B式wheel/ダブルクリック/±/pinch/resetがviewBoxを操作。Chromium実入力、resetはWebKitも確認。操作の存在≠段階ラベル(S41)。FPS/実機未確認。[実ページ](../tests/nationwide-2026.browser.cjs)|
|S18|要確認|選択区域を中央表示し離島では代表成分・最低範囲を考慮|[#135](https://github.com/Kussoon/kussoon.github.io/pull/135) [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139)|municipality-renderer.focusBounds / pilot.paint|代表成分/最低範囲は部品、7例の実表示あり。全区域・散在島・飛地の中央表示は未完。スケール/端末/全地形の網羅的品質未確認。[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|S19|A|全体表示は全国/県/選択区域フォーカスの現在の表示単位の初期枠へ戻り、選択・吹き出し状態を変更しない|[#82](https://github.com/Kussoon/kussoon.github.io/pull/82) [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)|pilot: mapReset / zoomReset → viewport.reset|全国/県/区域の初期枠へreset、選択/×状態/投影を維持。3単位・zoom/pan前後、Chromium/WebKit。離島全パターン/実機は未確認。[reset](../tests/pilot-map-ui.browser.cjs)|
|S20|要確認|県別遅延読込・最大3県の保持・古い非同期応答の無視を使いジェスチャーごとにTopoJSONを再解析しない|[#114](https://github.com/Kussoon/kussoon.github.io/pull/114) [#125](https://github.com/Kussoon/kussoon.github.io/pull/125) [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)|pilot: cache / goPref; map-viewport|47県読込は成功。LRU3県/古い応答拒否は構造確認。失敗→再試行/遅い旧応答/4県再訪の通信検査なし。heap/GC/実機FPS未測定。旧160ms debounceの同値継承も未確認。[全実データ](../tests/national-2026-data.test.cjs)|
|S21|B|固定5C：庁舎を含む連続成分、未登録時5B、南北中央の最長水平区間中央|[#79](https://github.com/Kussoon/kussoon.github.io/pull/79) [#94](https://github.com/Kussoon/kussoon.github.io/pull/94) [#95](https://github.com/Kussoon/kussoon.github.io/pull/95) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) [#225](https://github.com/Kussoon/kussoon.github.io/pull/225) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)|established-label-adapter.layout / largestPolygon|現行balanced/最大成分と旧庁舎5Cは異なる。同一2026形状7例で成分/箱を比較。採用理由/全県品質は未決。方式を移植しない。[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|S22|B|全国ラベルは最大13画面px|[#70](https://github.com/Kussoon/kussoon.github.io/pull/70) [#217](https://github.com/Kussoon/kussoon.github.io/pull/217) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)|place-labels.show / font-size|旧7〜13画面px、新14/18 SVG単位で拡大増大。同じ経度縮尺でも新文字が拡大、別表参照。旧版もSVG丸めで約13pxに誤差。全画面可読性の合格は出さない。[今回の観測](evidence/behavior-coverage-20261104.json)|
|S23|B|全国最大倍率768|[#65](https://github.com/Kussoon/kussoon.github.io/pull/65) [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#224](https://github.com/Kussoon/kussoon.github.io/pull/224) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)|map-viewport.init / maxZoom|旧全国768、新128を実wheelで確認。元の地理的初期範囲が異なり倍率だけは比較不可。必要実縮尺を決める前に768へ戻さない。[今回の観測](evidence/behavior-coverage-20261104.json)|
|S24|B|読みOFFでも区を市名＋区名の2段で識別する|[#41](https://github.com/Kussoon/kussoon.github.io/pull/41) [#55](https://github.com/Kussoon/kussoon.github.io/pull/55) [#57](https://github.com/Kussoon/kussoon.github.io/pull/57) [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)|reading-bridge.attach; place-labels.show|読みOFF時に新区名1行、旧は親市/区を識別。ON/OFF行と基準線の実DOM比較。旧2段の採否は保留。郡表示と混同しない。[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|S25|B|郡付き町村は郡名＋町村名、読みONは各名称＋読み|[#56](https://github.com/Kussoon/kussoon.github.io/pull/56) [#57](https://github.com/Kussoon/kussoon.github.io/pull/57) [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226)|pilot: bareRegions / reading-bridge / place-labels|2026モデルに郡属性がなく旧郡/町村行を継承していない。旧行組みの単体検査は一部古い期待値で失敗。全県郡読みの新版の実表示は未確認。[未集約テスト走査](evidence/legacy-test-inventory-20261104.json)|
|S26|B|読みON/OFFで漢字本体の縦位置を動かさない|[#35](https://github.com/Kussoon/kussoon.github.io/pull/35) [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#144](https://github.com/Kussoon/kussoon.github.io/pull/144)|place-labels.show / established-label-adapter.textBox|ON/OFFで旧漢字基準位置を保つ規則と新行位置が相違。区名y=5→8、再配置される既存比較。全区域のanchor/文字箱の安定性は未確認。[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|S27|A|最新の初期読み仮名はOFF、表示ボタンと同期|[#82](https://github.com/Kussoon/kussoon.github.io/pull/82) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#223](https://github.com/Kussoon/kussoon.github.io/pull/223) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)|pilot: readingMode / mapReadingToggle|初期OFFとボタン同期、zoom/reset後も切替可能。実ブラウザ初期/ON、6倍未満の表示経路も確認。全端末/読み切替の負荷上限は未確認。[実ページ](../tests/nationwide-2026.browser.cjs)|
|S28|A|読みはコード・名称が合う確認済み情報のみ。不一致・欠落は漢字へ退避|[#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226)|reading-bridge.verify / attach|コード/名称照合と不一致・欠落の漢字退避。今回全1905生成、1892読み、13漢字の非停止。照合/退避のA。読み網羅はS48のBと別。[今回の観測](evidence/behavior-coverage-20261104.json)|
|S29|要確認|区域中心・凹形・飛地・衝突・全文字箱余白を共通規則で評価|[#31](https://github.com/Kussoon/kussoon.github.io/pull/31) [#32](https://github.com/Kussoon/kussoon.github.io/pull/32) [#33](https://github.com/Kussoon/kussoon.github.io/pull/33) [#34](https://github.com/Kussoon/kussoon.github.io/pull/34) [#36](https://github.com/Kussoon/kussoon.github.io/pull/36) [#38](https://github.com/Kussoon/kussoon.github.io/pull/38) [#58](https://github.com/Kussoon/kussoon.github.io/pull/58) [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)|readable-labels / region-fit / established-label-adapter|凹形/文字箱は部品＋選択7例、県全件配置4例。全区域×zoom×読み×resizeの領域内/衝突品質は未測定。失敗テスト/性能/採用判断をAへ含めない。[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|S30|A|全国から名称・読み・5桁コードで検索し該当県と区域へ進む|[#142](https://github.com/Kussoon/kussoon.github.io/pull/142) [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204)|pilot: ensureNationwideSearchIndex / updateSearch / goPref|全国画面から名称/読み/5桁コードのクリック遷移。浜松新3区・同名県・中津川の実操作。県内検索はその県に限定。EnterはS46でB、全検索語の到達は未確認。[実検索](../tests/nationwide-search.browser.cjs)|
|S31|A|2026検索は現行区域コードへ到達し廃止区域を誤案内しない|[#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) [#170](https://github.com/Kussoon/kussoon.github.io/pull/170) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)|pilot: nationwideSearchIndex; reading-bridge.reorganizedWards|旧7区候補なし、新3区候補/地図/庁舎が対応。全1892候補コード照合と9検索遷移。住所現況/北方6の検索を保証するAではない。[実検索](../tests/nationwide-search.browser.cjs)|
|S32|C|全国版クイズUIは一時非表示、共通ロジックとテストは保存|[#147](https://github.com/Kussoon/kussoon.github.io/pull/147) [#149](https://github.com/Kussoon/kussoon.github.io/pull/149)|pilot: .quiz-panel; municipality-quiz|クイズUI保留は#149の意図的変更。部品ロジックは残存、UI hiddenを実確認。通常地図との未公開クイズ全遷移は未確認。[実ページ](../tests/nationwide-2026.browser.cjs)|
|S33|C|2リンクのみ・経路削除の中間仕様は失効|[#88](https://github.com/Kussoon/kussoon.github.io/pull/88) [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93)|office-directory.render|中間2リンク廃止、#89/#93で3/6枠へ復帰。現行3/6を実表示。外部到達性は別。[庁舎](../tests/office-directory.test.cjs)|
|S34|C|読み仮名初期ONという過去規則はOFFへ変更|[#82](https://github.com/Kussoon/kussoon.github.io/pull/82) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#223](https://github.com/Kussoon/kussoon.github.io/pull/223) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)|pilot: readingMode; density.html|初期ONを#223/#226でOFFへ変更。新版も初期OFFを実確認。ON切替と読み網羅は別仕様。[実ページ](../tests/nationwide-2026.browser.cjs)|
|S35|C|選択専用の強調外郭線を追加する過去方式は採用しない|[#102](https://github.com/Kussoon/kussoon.github.io/pull/102) [#128](https://github.com/Kussoon/kussoon.github.io/pull/128) [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) [#130](https://github.com/Kussoon/kussoon.github.io/pull/130) [#131](https://github.com/Kussoon/kussoon.github.io/pull/131) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)|municipality-renderer.render / .borders|選択専用太枠は#128→#129で明示廃止。塗り＋単一境界の実DOM。全国県境の地理的一致を意味しない。[実ページ](../tests/nationwide-2026.browser.cjs)|
|S36|A|自治体は塗りpath、境界は共有arcの単一path。選択でDOMを累積しない|[#128](https://github.com/Kussoon/kussoon.github.io/pull/128) [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) [#130](https://github.com/Kussoon/kussoon.github.io/pull/130) [#131](https://github.com/Kussoon/kussoon.github.io/pull/131) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)|municipality-renderer.render|塗りpathと単一境界path、選択で累積しない。複数県/選択・解除後のDOMと全path比較。1本で描いても抽出漏れ/県間不一致は残りうる。[実ページ](../tests/nationwide-2026.browser.cjs)|
|S37|要確認|境界線は拡大しても一定画面幅、タッチfocusとマウスhoverを分ける|[#57](https://github.com/Kussoon/kussoon.github.io/pull/57) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)|pilot: .borders / .prefecture:focus-visible|0.9px/non-scaling CSSは実DOMで確認。zoom全段階のラスタ線幅/hover/touch focus比較未完。Safari/Edgeの太線/二重線をAにしない。[実ページ](../tests/nationwide-2026.browser.cjs)|
|S38|A|2026年N03由来47県1905区域を県別配信しコード・重複・区域数を検証|[#107](https://github.com/Kussoon/kussoon.github.io/pull/107) [#108](https://github.com/Kussoon/kussoon.github.io/pull/108) [#114](https://github.com/Kussoon/kussoon.github.io/pull/114) [#120](https://github.com/Kussoon/kussoon.github.io/pull/120) [#127](https://github.com/Kussoon/kussoon.github.io/pull/127) [#132](https://github.com/Kussoon/kussoon.github.io/pull/132) [#134](https://github.com/Kussoon/kussoon.github.io/pull/134) [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)|2026-common/national-2026-pilot/manifest.json / goPref|47県1905コード/数/参照arc/有限座標を実データ検査。今回47県DOM1905ラベル生成も確認。法的現況や全国全線の視覚検査ではない。[全実データ](../tests/national-2026-data.test.cjs)|
|S39|要確認|共有県境の存在・抽出完全性・見た目を異なる保証として扱う|[#140](https://github.com/Kussoon/kussoon.github.io/pull/140) [#141](https://github.com/Kussoon/kussoon.github.io/pull/141) [#187](https://github.com/Kussoon/kussoon.github.io/pull/187) [#230](https://github.com/Kussoon/kussoon.github.io/pull/230) [#233](https://github.com/Kussoon/kussoon.github.io/pull/233) [#234](https://github.com/Kussoon/kussoon.github.io/pull/234) [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)|shared-border pilot / seam audit tools|共有県境試作と実配信の統合範囲は未確定。47県全隣接ペア/全zoomの地理的な継ぎ目未実測。線の存在・抽出完全性・知覚品質を分離。[全実データ](../tests/national-2026-data.test.cjs)|
|S40|A|地図1905と庁舎1912の差は北方6・所属未定7と親政令市20を区別|[#186](https://github.com/Kussoon/kussoon.github.io/pull/186) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)|audit-office-map-codes / office-map-coverage|地図/庁舎の北方6・所属未定7・親市20の集合差を検査。実データの集合等価、正常/異常fixture。集合差のAを読み欠落の承認としない(S48)。[全実データ](../tests/national-2026-data.test.cjs)|

現行経路の略記: `pilot` は [2026統合HTML](../../v2/national/official-2026-nationwide-pilot.html)、`map-viewport` / `municipality-renderer` / `place-labels` / `reading-bridge` / `established-label-adapter` は `v2/shared/` 配下、`office-directory` は `v2/common/js/` 配下。ファイル名だけでなく上記関数・呼出し元を合わせて参照する。固定SHAのリンクは各PR節と[監査入口](v2-national-audit-summary-20261104.md)に記載。



<a id="new-user-behavior-specs"></a>

## 新規に独立させた利用者動作 S41〜S49

同じ要件を番号だけ増やさない。S41は表示許可の段階変化、S42は全国からの到達経路、S43は画面内判定、S48は読みの人口網羅。既存S21/S22/S23/S28の座標/文字/倍率/照合安全性とは別の合否を持つ。

|ID|判定|仕様／決定|過去PR・後続変更|現在の経路|検証・回帰テストの限界|
|---|---|---|---|---|---|
|S41|B|全国図で拡大に応じて固定位置の追加ラベルが現れ、領域の画面上の大きさに応じて重なり条件を緩める|[#213](https://github.com/Kussoon/kussoon.github.io/pull/213) [#219](https://github.com/Kussoon/kussoon.github.io/pull/219) [#220](https://github.com/Kussoon/kussoon.github.io/pull/220) → [#221](https://github.com/Kussoon/kussoon.github.io/pull/221)。#220の一律2倍解放は最終規則ではない|旧D.arrange＋scheduleLabels。新drawOverviewは47県のみ、viewportは文字を更新しない|実Chromiumの全国zoom全段で新市区町村0。#260の県内全件生成/配置再計算なしは継承証拠にならない。単純な画面内件数の単調増加は要求しない|
|S42|B|全国地図をzoom/panして市区町村名へ到達できる。全件は同時表示ではなく対象区域ごとの到達で評価する|[#213](https://github.com/Kussoon/kussoon.github.io/pull/213) [#224](https://github.com/Kussoon/kussoon.github.io/pull/224) [#225](https://github.com/Kussoon/kussoon.github.io/pull/225)。#139の県別ドリルダウン自体は意図的だが、後発段階表示の廃止根拠ではない|旧全1902モデル。新全国は47県輪郭、県クリックでその県の詳細を初めてロード|旧1902件は768倍のanchor中心合法枠によるブラウザ内アルゴリズム走査で表示許可/箱が到達。1902件の実指操作は未確認。新1905生成は47県選択後で、全国zoom到達とは別|
|S43|A|読込済み範囲ではSVG meetの名目viewBox外でも実画面内のラベルを誤って隠さない|[#224](https://github.com/Kussoon/kussoon.github.io/pull/224)|旧visibleView拡張。新は県内全ラベルを生成しSVG実クリップに任せる|390px県24で名目枠外の画面内8名を2/4段階で観測。全国・隣県の名前はS42のB。全端末/全県のAではない|
|S44|B|地図の空白タップで選択色/吹き出しを解除できる（×だけ閉じる操作とは別）|[#67](https://github.com/Kussoon/kussoon.github.io/pull/67) [#81](https://github.com/Kussoon/kussoon.github.io/pull/81)。#139以降で未接続、明示廃止の証拠なし|旧map clickのelse select(null)。新closestがなければreturn|旧15府県と新版西宮選択後、hit-testした実SVG空白をnative click。旧は解除、新は維持。zoom時の全空白位置/タッチ実機未確認|
|S45|B|地図上の自治体をキーボードfocusしEnter/Spaceで選択・解除できる|[#66](https://github.com/Kussoon/kussoon.github.io/pull/66)（親実装を継承）、#139で県だけに限定、明示廃止なし|旧land tabindex=0/role=button＋keydown。新keydownはdata-prefだけ|旧landはnative focus/Enter/Space可、新data-codeはfocus不可/操作不可。県のキーボード遷移や下部selectの代替があっても同じ操作の継承とはしない|
|S46|B|検索入力でEnterから先頭候補を選択できる。Escapeと外側タップによる候補閉鎖も別に評価する|[#66](https://github.com/Kussoon/kussoon.github.io/pull/66) → #142/#204はクリック候補を実装、Enterの移行根拠なし|旧search keydown、旧outside handler。新placeSearchはinputのみ|native Enterで旧西宮選択/新未選択。Escapeは両者で消える（新版search入力のブラウザ標準動作を含む）。外側タップの全条件は未確認。旧全国focus UIは検索非表示のため旧一般densityで比較|
|S47|要確認|Edgeの自動ダーク表示等でも地図/文字の配色を保つ|[#219](https://github.com/Kussoon/kussoon.github.io/pull/219)|旧light color-scheme。新同等宣言/Edge向け証拠は不足|Chromium標準配色の画像でEdge自動ダーク合格とはしない。Edge実機/forced-colors/OSテーマ切替は今回未確認|
|S48|B|旧版で確認済みだった区域の読みをONで表示でき、拡大段階で停止・欠落させない|[#222](https://github.com/Kussoon/kussoon.github.io/pull/222) → [#226](https://github.com/Kussoon/kussoon.github.io/pull/226)（6倍ゲート撤廃と1902件補完）|旧municipality-readings.jsonは北方6を含む。新getReadingSourceはall-source.jsonだけを参照|全47県で1892/1905に読み。所属未定7とは別に、北方01695〜01700の既存6件の読みが新版で欠落。S28の安全な漢字退避がAでも読み網羅はB。元データを変更せず記録|
|S49|C|倍率等の検証メトリクスを通常画面からdebug=1へ移すUI変更|旧#213の表示情報、[#259](https://github.com/Kussoon/kussoon.github.io/pull/259)の明示的な本番UI整理|新zoomLevel/metricsPanelはdebug下、通常は非表示|通常/debugの実ブラウザ検査あり。今回それを無断で戻さない。将来の段階表示で件数を利用者にどう伝えるかは未決定で、表示ロジックの廃止承認とは別|

## PR #246の旧仕様番号から正式番号への対応

正式番号はこの表のS01〜S40へ一本化する。旧30件と新40件は集約粒度が異なり合計70件とはしない。旧S10の読みON4行と旧S22の非同期・キャッシュ規則も下記の対応に含める。旧版は[固定コミット](https://github.com/Kussoon/kussoon.github.io/tree/b42cec489878c0774053b334d326eb0c42406c38/v2/audit)で追跡可能。

|先行番号|正式番号|
|---|---|
|246:S01|S01|
|246:S02|S02|
|246:S03|S03|
|246:S04|S06|
|246:S05|S07|
|246:S06|S08|
|246:S07|S09|
|246:S08|S27|
|246:S09|S28|
|246:S10|S24, S28|
|246:S11|S24, S25|
|246:S12|S21|
|246:S13|S22|
|246:S14|S23|
|246:S15|S16|
|246:S16|S15|
|246:S17|S14, S17|
|246:S18|S17|
|246:S19|S19|
|246:S20|S18|
|246:S21|S20|
|246:S22|S20|
|246:S23|S36|
|246:S24|S37|
|246:S25|S39|
|246:S26|S38, S40|
|246:S27|S11|
|246:S28|S30, S31|
|246:S29|S32|
|246:S30|S12, S13|

## テスト可能な保護範囲（第1段階）

`v2/tests/run-national-contracts.cjs` が既存部品・実2026データ検査を集約し、`v2/tests/nationwide-2026.browser.cjs` が同じHTML・共通エンジン・コミット済み地図をChromiumで操作する。テストのS番号はこの正式表を指す。

境界の詳細地図は共有pathの0.9pxで県外郭と市町村境を一重に描く。全国ナビゲーション輪郭の0.75pxは別の案内表示であり、詳細境界データを書き換えて統一しない。離島・飛地はfocusBoundsと実TopoJSONを保ち、専用の自治体座標を追加しない。固定5C・文字上限・最大倍率の相違（S21〜S26）は継承判断待ちを維持する。

## 周辺ラベル表示対象の是正（pilot後続PR）

`showNames` 初期OFFが選択以外の区域をadapter冒頭で除外していた。県内周辺名の初期表示をONへ変更し、既存balanced/collision/fitは維持する。390pxの浜松中央区は1件→画面内4件（生成は39件）、隣県は遅延読込範囲外。[件数・段別観測・性能・画像](v2-national-regression-test-plan-20261104.md#周辺ラベルの対象範囲と現行方式の比較pilot-ui後続段階)を参照。S21〜S26のB判定は維持し、文字サイズ/倍率/5C採用判断と混同しない。正式仕様番号/判定数は変更しない。

<a id="behavior-reassessment"></a>

## 既存40項目の操作・ズーム・状態・性能の再評価

全行を再読し、関数の存在ではなく以下の観測条件へ評価範囲を限定した。性能欄の未確認はCI合格で補わない。S14/S15の旧Aを取り下げた。

|対象|今回|操作前後・状態|ズーム・画面条件|性能・未確認|根拠|
|---|---|---|---|---|---|
|[S01](#formal-specs)|A|×前後の選択/全path/viewBoxが不変|1280/390px、3区域、拡大/パン後も比較|Safari実機未確認。CPU予算はこの状態規則には非該当|[実再タップ](../tests/nationwide-retap.browser.cjs)|
|[S02](#formal-specs)|A|同一区域再タップで選択だけ解除、投影/範囲不変|西宮/多可/中央区、1280/390px|実機/全区域は未確認。再描画時間の上限なし|[実再タップ](../tests/nationwide-retap.browser.cjs)|
|[S03](#formal-specs)|A|解除後の次タップで再選択＋吹き出し|上記6条件の実click|連打/複数指/全区域未確認|[実再タップ](../tests/nationwide-retap.browser.cjs)|
|[S04](#formal-specs)|A|×後の再検索と別区域検索で開き直す|中津川/岐阜と浜松3区、名称/読み/コード|Enter操作はS46でB。非同期競合/応答時間未確認|[実検索](../tests/nationwide-search.browser.cjs)|
|[S05](#formal-specs)|要確認|県全体戻りは確認、全国/県切替全経路の状態表は未完|retapの県戻り限定|エラー/クイズ/競合を含む遷移は未確認|[実再タップ](../tests/nationwide-retap.browser.cjs)|
|[S06](#formal-specs)|A|選択塗り・塗りpath strokeなし、選択外郭を増設しない|実SVG/計算済CSS、複数県/区域|全47県の見た目・知覚的二重線はS39の未確認|[実ページ](../tests/nationwide-2026.browser.cjs)|
|[S07](#formal-specs)|A|通常3枠と施設別URL/target/経路を確認|西宮/多可、狭幅を含む|外部リンク先の現時点到達は対象外|[吹き出し](../tests/pilot-ui.browser.cjs)|
|[S08](#formal-specs)|A|東灘/中央区の区＋親市6リンク、各枠へ到達|320/375/390/844px、Chromium/WebKit|全1912の実画面/実機未確認|[吹き出し](../tests/pilot-ui.browser.cjs)|
|[S09](#formal-specs)|A|A/安全URLのみ有効、B/C/未判定/不正URLは無効枠|実台帳1912照合＋renderer正負検査|公式性の再判定/外部HTTP再監査は未実施|[庁舎](../tests/office-directory.test.cjs)|
|[S10](#formal-specs)|A|表示接尾辞省略と元名/住所による別施設経路を検査|renderer正負＋実DOM経路の独立性|全住所の現況/Google側の表示は未確認|[庁舎](../tests/office-directory.test.cjs)|
|[S11](#formal-specs)|A|47県1912地域/施設、親子参照と形式を照合|実データ/DOM参照、今回47県ロード|住所最新性や法的行政区画の独立証明ではない|[全実データ](../tests/national-2026-data.test.cjs)|
|[S12](#formal-specs)|A|初期リンク下端/全リンク矩形/右4ボタン非重複|4画面寸法、3/6リンク、Chromium/WebKit|iPhone動的バー/safe-area実機は未確認|[吹き出し](../tests/pilot-ui.browser.cjs)|
|[S13](#formal-specs)|A|内部スクロール末尾とヒットテスト、地図位置維持|Chromium native touch＋WebKit到達性|iOS慣性/端部の指移動は未確認|[吹き出し](../tests/pilot-ui.browser.cjs)|
|[S14](#formal-specs)|要確認|1px/5px閾値は部品。実タッチの大きなパンは確認|native 1px/5px境界・手ぶれ→clickの実測なし|旧Aを取り下げ。閾値のソース存在で操作合格にしない|[実タッチ](../tests/nationwide-touch.browser.cjs)|
|[S15](#formal-specs)|要確認|子path capture喪失の正負分岐は部品で確認|Safariの実際のtarget/event順序は未採取|旧Aを取り下げ。実機の長いドラッグ継続は未確認|[実タッチ](../tests/nationwide-touch.browser.cjs)|
|[S16](#formal-specs)|A|多可フォーカス後に4方向pan、解除後も移動範囲保持|Chromium native touch/実click＋境界超え試験|全47県/散在島/実機の限界までのパン未確認|[実タッチ](../tests/nationwide-touch.browser.cjs)|
|[S17](#formal-specs)|A|B式wheel/ダブルクリック/±/pinch/resetがviewBoxを操作|Chromium実入力、resetはWebKitも確認|操作の存在≠段階ラベル(S41)。FPS/実機未確認|[実ページ](../tests/nationwide-2026.browser.cjs)|
|[S18](#formal-specs)|要確認|代表成分/最低範囲は部品、7例の実表示あり|全区域・散在島・飛地の中央表示は未完|スケール/端末/全地形の網羅的品質未確認|[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|[S19](#formal-specs)|A|全国/県/区域の初期枠へreset、選択/×状態/投影を維持|3単位・zoom/pan前後、Chromium/WebKit|離島全パターン/実機は未確認|[reset](../tests/pilot-map-ui.browser.cjs)|
|[S20](#formal-specs)|要確認|47県読込は成功。LRU3県/古い応答拒否は構造確認|失敗→再試行/遅い旧応答/4県再訪の通信検査なし|heap/GC/実機FPS未測定。旧160ms debounceの同値継承も未確認|[全実データ](../tests/national-2026-data.test.cjs)|
|[S21](#formal-specs)|B|現行balanced/最大成分と旧庁舎5Cは異なる|同一2026形状7例で成分/箱を比較|採用理由/全県品質は未決。方式を移植しない|[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|[S22](#formal-specs)|B|旧7〜13画面px、新14/18 SVG単位で拡大増大|同じ経度縮尺でも新文字が拡大、別表参照|旧版もSVG丸めで約13pxに誤差。全画面可読性の合格は出さない|[今回の観測](evidence/behavior-coverage-20261104.json)|
|[S23](#formal-specs)|B|旧全国768、新128を実wheelで確認|元の地理的初期範囲が異なり倍率だけは比較不可|必要実縮尺を決める前に768へ戻さない|[今回の観測](evidence/behavior-coverage-20261104.json)|
|[S24](#formal-specs)|B|読みOFF時に新区名1行、旧は親市/区を識別|ON/OFF行と基準線の実DOM比較|旧2段の採否は保留。郡表示と混同しない|[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|[S25](#formal-specs)|B|2026モデルに郡属性がなく旧郡/町村行を継承していない|旧行組みの単体検査は一部古い期待値で失敗|全県郡読みの新版の実表示は未確認|[未集約テスト走査](evidence/legacy-test-inventory-20261104.json)|
|[S26](#formal-specs)|B|ON/OFFで旧漢字基準位置を保つ規則と新行位置が相違|区名y=5→8、再配置される既存比較|全区域のanchor/文字箱の安定性は未確認|[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|[S27](#formal-specs)|A|初期OFFとボタン同期、zoom/reset後も切替可能|実ブラウザ初期/ON、6倍未満の表示経路も確認|全端末/読み切替の負荷上限は未確認|[実ページ](../tests/nationwide-2026.browser.cjs)|
|[S28](#formal-specs)|A|コード/名称照合と不一致・欠落の漢字退避|今回全1905生成、1892読み、13漢字の非停止|照合/退避のA。読み網羅はS48のBと別|[今回の観測](evidence/behavior-coverage-20261104.json)|
|[S29](#formal-specs)|要確認|凹形/文字箱は部品＋選択7例、県全件配置4例|全区域×zoom×読み×resizeの領域内/衝突品質は未測定|失敗テスト/性能/採用判断をAへ含めない|[同一形状比較](../tests/compare-2026-labels.browser.cjs)|
|[S30](#formal-specs)|A|全国画面から名称/読み/5桁コードのクリック遷移|浜松新3区・同名県・中津川の実操作|県内検索はその県に限定。EnterはS46でB、全検索語の到達は未確認|[実検索](../tests/nationwide-search.browser.cjs)|
|[S31](#formal-specs)|A|旧7区候補なし、新3区候補/地図/庁舎が対応|全1892候補コード照合と9検索遷移|住所現況/北方6の検索を保証するAではない|[実検索](../tests/nationwide-search.browser.cjs)|
|[S32](#formal-specs)|C|クイズUI保留は#149の意図的変更|部品ロジックは残存、UI hiddenを実確認|通常地図との未公開クイズ全遷移は未確認|[実ページ](../tests/nationwide-2026.browser.cjs)|
|[S33](#formal-specs)|C|中間2リンク廃止、#89/#93で3/6枠へ復帰|現行3/6を実表示|外部到達性は別|[庁舎](../tests/office-directory.test.cjs)|
|[S34](#formal-specs)|C|初期ONを#223/#226でOFFへ変更|新版も初期OFFを実確認|ON切替と読み網羅は別仕様|[実ページ](../tests/nationwide-2026.browser.cjs)|
|[S35](#formal-specs)|C|選択専用太枠は#128→#129で明示廃止|塗り＋単一境界の実DOM|全国県境の地理的一致を意味しない|[実ページ](../tests/nationwide-2026.browser.cjs)|
|[S36](#formal-specs)|A|塗りpathと単一境界path、選択で累積しない|複数県/選択・解除後のDOMと全path比較|1本で描いても抽出漏れ/県間不一致は残りうる|[実ページ](../tests/nationwide-2026.browser.cjs)|
|[S37](#formal-specs)|要確認|0.9px/non-scaling CSSは実DOMで確認|zoom全段階のラスタ線幅/hover/touch focus比較未完|Safari/Edgeの太線/二重線をAにしない|[実ページ](../tests/nationwide-2026.browser.cjs)|
|[S38](#formal-specs)|A|47県1905コード/数/参照arc/有限座標を実データ検査|今回47県DOM1905ラベル生成も確認|法的現況や全国全線の視覚検査ではない|[全実データ](../tests/national-2026-data.test.cjs)|
|[S39](#formal-specs)|要確認|共有県境試作と実配信の統合範囲は未確定|47県全隣接ペア/全zoomの地理的な継ぎ目未実測|線の存在・抽出完全性・知覚品質を分離|[全実データ](../tests/national-2026-data.test.cjs)|
|[S40](#formal-specs)|A|地図/庁舎の北方6・所属未定7・親市20の集合差を検査|実データの集合等価、正常/異常fixture|集合差のAを読み欠落の承認としない(S48)|[全実データ](../tests/national-2026-data.test.cjs)|
