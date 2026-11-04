# V2全国統合版・確定仕様と実装照合（2026-11-04）

基準main: `c69c970c982724b20d9a327e1fd1c223f356aebd`。有効規則の正本は[既存MAINTENANCE_RULES](../national/MAINTENANCE_RULES.md)を更新して再利用する。ここには40仕様の適用状況を記録する。A17／B8／C4／要確認11。Cは過去の失効・保留仕様であり、現在有効な要件・継承確認は36件。詳細な定義・集計方法は[PR照合台帳](v2-national-pr-ledger-20261104.md)参照。

## 機能別の有効仕様と現行照合

仕様の正本は既存の[MAINTENANCE_RULES.md](../national/MAINTENANCE_RULES.md)。既存の[庁舎仕様](../national/OFFICES-DATA-SPEC.md)・[5C出典](../national/PROPOSAL5C-TRIAL.md)を再利用する。下表はその仕様の実装到達状況であり、Bを現行仕様へ書き換えて追認する表ではない。

|ID|判定|仕様／決定|過去PR・後続変更|現在の経路|検証・回帰テストの限界|
|---|---|---|---|---|---|
|S01|A|×は吹き出しのみ閉じ、選択色・投影・表示位置を維持|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)|pilot: popupClose / renderOfficePopup|Node VMの実ページ処理で西宮・多可・中央区コードを確認。geometry・viewportはスタブ。実画面未確認|
|S02|B|同一市域再タップは選択色のみ解除し表示範囲を維持|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)|pilot: map click → paint → viewport.reset|実ページNode VMで再タップ時reset呼出し・contentBounds消失を確認。R01|
|S03|A|解除後の再タップで選択色と吹き出しが再表示|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)|pilot: map click / renderOfficePopup|同じVMで3コードの選択・×・解除・再選択を確認。実タッチは未確認|
|S04|要確認|別区域・検索候補選択で閉じ状態を解除|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#142](https://github.com/Kussoon/kussoon.github.io/pull/142) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204)|pilot: dismissedPopupCode / updateSearch|代入経路は存在。実検索操作を通した状態遷移のテスト不足|
|S05|要確認|県・全国へ移動すると選択と吹き出し状態を初期化|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)|pilot: goPref / returnNation / prefBtn|専用戻る操作と再タップを区別するE2Eが必要|
|S06|A|選択は琥珀色の塗りで表現し選択専用太線を追加しない|[#40](https://github.com/Kussoon/kussoon.github.io/pull/40) [#80](https://github.com/Kussoon/kussoon.github.io/pull/80) [#85](https://github.com/Kussoon/kussoon.github.io/pull/85) [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)|municipality-renderer.render / .land.chosen|単一描画テスト合格。色・輪郭の実画面品質は未確認|
|S07|A|通常自治体は公式サイト・Wikipedia・ここへ行くの3リンク枠|[#80](https://github.com/Kussoon/kussoon.github.io/pull/80) [#88](https://github.com/Kussoon/kussoon.github.io/pull/88) [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)|office-directory.render / links|現行rendererと実台帳で西宮市・多可町各3リンクをDOMスタブで確認|
|S08|A|政令市区は区役所と親市役所を分け、各3リンク枠|[#87](https://github.com/Kussoon/kussoon.github.io/pull/87) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#96](https://github.com/Kussoon/kussoon.github.io/pull/96) [#97](https://github.com/Kussoon/kussoon.github.io/pull/97) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)|office-directory.resolve / render|神戸市中央区の実台帳で6リンク。各施設経路生成は確認、画面配置未確認|
|S09|A|公式サイトはURL監査Aかつ安全なURLの場合だけ有効|[#205](https://github.com/Kussoon/kussoon.github.io/pull/205) [#212](https://github.com/Kussoon/kussoon.github.io/pull/212)|office-directory.render / safeUrl|A/B/C/未判定のDOMスタブ検査。台帳と全1912件のURL・分類一致|
|S10|A|経路は元の庁舎名＋住所。表示名の建物接尾辞だけ省略|[#80](https://github.com/Kussoon/kussoon.github.io/pull/80) [#87](https://github.com/Kussoon/kussoon.github.io/pull/87) [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91)|office-directory.destination / displayOfficeName|既存office-directoryテストの関連項目合格。表示用省略で元データを変えない|
|S11|A|47都道府県の庁舎JSONは同一schema・参照・親子規則|[#150](https://github.com/Kussoon/kussoon.github.io/pull/150) [#151](https://github.com/Kussoon/kussoon.github.io/pull/151) [#185](https://github.com/Kussoon/kussoon.github.io/pull/185)|test-office-directory-data.cjs|47県1912地域1912施設、形式・参照テスト合格。住所の現況保証とは別|
|S12|要確認|狭幅の吹き出しは左側に収め右4ボタンと非重複、高さをボタン群へ合わせる|[#83](https://github.com/Kussoon/kussoon.github.io/pull/83) [#84](https://github.com/Kussoon/kussoon.github.io/pull/84) [#90](https://github.com/Kussoon/kussoon.github.io/pull/90) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#242](https://github.com/Kussoon/kussoon.github.io/pull/242) [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) [#244](https://github.com/Kussoon/kussoon.github.io/pull/244)|pilot: .office-popup / syncToolbarHeight|既存静的検査合格。矩形・到達性・画面回転の実ブラウザ未確認|
|S13|要確認|二施設の長い情報は吹き出し内部でスクロールしリンクに到達できる|[#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) [#244](https://github.com/Kussoon/kussoon.github.io/pull/244)|pilot: overflow:auto / popup-actions|CSSの存在のみ。内部スクロール・地図ドラッグとの競合は未確認|
|S14|A|タッチ1px・マウス5pxでドラッグを区別し単純タップを保持|[#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#240](https://github.com/Kussoon/kussoon.github.io/pull/240)|map-viewport.pointerMove / onClickCapture|test-map-viewport-touch-pan合格。ネイティブiOSイベントでは未確認|
|S15|A|子pathからバブルするlostpointercaptureでドラッグを終了しない|[#241](https://github.com/Kussoon/kussoon.github.io/pull/241)|map-viewport.onLostMapCapture|子path継続・SVG自身終了の正負テスト合格|
|S16|A|市域フォーカス後の県の投影範囲を上下左右の移動制限に使う|[#245](https://github.com/Kussoon/kussoon.github.io/pull/245)|map-viewport.setContentBounds / pilot.paint|合成PointerEventとソース接続を確認。多可町実データ・実機のパンは未確認|
|S17|A|ピンチ・ホイール・＋／−・resetはviewBoxを操作|[#136](https://github.com/Kussoon/kussoon.github.io/pull/136)|map-viewport.init / zoom / pan / reset|既存viewport部品テスト合格。実画面の操作感は未確認|
|S18|要確認|選択区域を中央表示し離島では代表成分・最低範囲を考慮|[#135](https://github.com/Kussoon/kussoon.github.io/pull/135) [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139)|municipality-renderer.focusBounds / pilot.paint|部品の小島・散在島テスト合格。全47県と選択中の実投影は未検証|
|S19|要確認|右下4ボタンと上部操作を連動し全体表示へ戻せる|[#82](https://github.com/Kussoon/kussoon.github.io/pull/82) [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)|pilot: mapReset / zoomReset / syncMapReadingToggle|静的接続検査合格。全体表示が市域投影の初期枠に戻る点を県全体へ戻ると混同しない|
|S20|要確認|県別遅延読込・最大3県の保持・古い非同期応答の無視を使いジェスチャーごとにTopoJSONを再解析しない|[#114](https://github.com/Kussoon/kussoon.github.io/pull/114) [#125](https://github.com/Kussoon/kussoon.github.io/pull/125) [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)|pilot: cache / goPref; map-viewport|構造は確認。通信回数・メモリ・フレーム時間の測定なし|
|S21|B|固定5C：庁舎を含む連続成分、未登録時5B、南北中央の最長水平区間中央|[#79](https://github.com/Kussoon/kussoon.github.io/pull/79) [#94](https://github.com/Kussoon/kussoon.github.io/pull/94) [#95](https://github.com/Kussoon/kussoon.github.io/pull/95) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) [#225](https://github.com/Kussoon/kussoon.github.io/pull/225) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)|established-label-adapter.layout / largestPolygon|2026経路はbalanced＋衝突・適合度処理。5C呼出し・庁舎参照点読込なし。R02。#146の別方式採用と#225以降の適用範囲判断を要す|
|S22|B|全国ラベルは最大13画面px|[#70](https://github.com/Kussoon/kussoon.github.io/pull/70) [#217](https://github.com/Kussoon/kussoon.github.io/pull/217) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)|place-labels.show / font-size|2026はSVG単位14/選択18でviewBoxとともに拡大。旧densityのみ13px保護。R03、2026へ同値を適用する承認は要確認|
|S23|B|全国最大倍率768|[#65](https://github.com/Kussoon/kussoon.github.io/pull/65) [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#224](https://github.com/Kussoon/kussoon.github.io/pull/224) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)|map-viewport.init / maxZoom|2026呼出しはmaxZoom未指定で既定128。旧densityは768。R03、ページ別仕様差として記録|
|S24|B|読みOFFでも区を市名＋区名の2段で識別する|[#41](https://github.com/Kussoon/kussoon.github.io/pull/41) [#55](https://github.com/Kussoon/kussoon.github.io/pull/55) [#57](https://github.com/Kussoon/kussoon.github.io/pull/57) [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)|reading-bridge.attach; place-labels.show|partsがhasReading条件のためOFFで区名1行。正式名は検索・メニューに残る。R04|
|S25|B|郡付き町村は郡名＋町村名、読みONは各名称＋読み|[#56](https://github.com/Kussoon/kussoon.github.io/pull/56) [#57](https://github.com/Kussoon/kussoon.github.io/pull/57) [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226)|pilot: bareRegions / reading-bridge / place-labels|N03_003をモデルへ保持せず郡読みデータも不参照。全国版への継承不足の疑い。R04|
|S26|B|読みON/OFFで漢字本体の縦位置を動かさない|[#35](https://github.com/Kussoon/kussoon.github.io/pull/35) [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#144](https://github.com/Kussoon/kussoon.github.io/pull/144)|place-labels.show / established-label-adapter.textBox|区はOFF時y=5、ON時区y=8・市y=-21。layoutもreadingsを使い再計算。描画値の差を確認、画面比較待ち。R04|
|S27|A|最新の初期読み仮名はOFF、表示ボタンと同期|[#82](https://github.com/Kussoon/kussoon.github.io/pull/82) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#223](https://github.com/Kussoon/kussoon.github.io/pull/223) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)|pilot: readingMode / mapReadingToggle|HTML・接続の既存静的テスト合格。#82/#100のONを復活させない|
|S28|A|読みはコード・名称が合う確認済み情報のみ。不一致・欠落は漢字へ退避|[#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226)|reading-bridge.verify / attach|既存reading-bridgeテスト合格。全2026形状に対する再走査は未実施|
|S29|要確認|区域中心・凹形・飛地・衝突・全文字箱余白を共通規則で評価|[#31](https://github.com/Kussoon/kussoon.github.io/pull/31) [#32](https://github.com/Kussoon/kussoon.github.io/pull/32) [#33](https://github.com/Kussoon/kussoon.github.io/pull/33) [#34](https://github.com/Kussoon/kussoon.github.io/pull/34) [#36](https://github.com/Kussoon/kussoon.github.io/pull/36) [#38](https://github.com/Kussoon/kussoon.github.io/pull/38) [#58](https://github.com/Kussoon/kussoon.github.io/pull/58) [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)|readable-labels / region-fit / established-label-adapter|#146は旧部品を再利用するが旧5Cと同一ではない。札幌・熱海実2026テストはgeometry未取得で未実行|
|S30|要確認|全国から名称・読み・5桁コードで検索し該当県と区域へ進む|[#142](https://github.com/Kussoon/kussoon.github.io/pull/142) [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204)|pilot: ensureNationwideSearchIndex / updateSearch / goPref|通常都市の候補処理は確認。実通信・表示・同名候補のブラウザE2E不足|
|S31|B|2026検索は現行区域コードへ到達し廃止区域を誤案内しない|[#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) [#170](https://github.com/Kussoon/kussoon.github.io/pull/170) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)|pilot: nationwideSearchIndex; reading-bridge.reorganizedWards|実ページNode VM＋現行読み正本で浜松市中央区候補なし、旧22131候補あり。県内補正を全国indexへ未適用。R05|
|S32|C|全国版クイズUIは一時非表示、共通ロジックとテストは保存|[#147](https://github.com/Kussoon/kussoon.github.io/pull/147) [#149](https://github.com/Kussoon/kussoon.github.io/pull/149)|pilot: .quiz-panel; municipality-quiz|#149による明示的保留。部品クイズテスト合格。UIの復活を回帰修正として行わない|
|S33|C|2リンクのみ・経路削除の中間仕様は失効|[#88](https://github.com/Kussoon/kussoon.github.io/pull/88) [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93)|office-directory.render|#89が3番目の経路を復帰し#93が区の6リンク化。#88を再適用しない|
|S34|C|読み仮名初期ONという過去規則はOFFへ変更|[#82](https://github.com/Kussoon/kussoon.github.io/pull/82) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#223](https://github.com/Kussoon/kussoon.github.io/pull/223) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)|pilot: readingMode; density.html|後続PRで明示的変更。ON/OFF切替機能自体は保持する|
|S35|C|選択専用の強調外郭線を追加する過去方式は採用しない|[#102](https://github.com/Kussoon/kussoon.github.io/pull/102) [#128](https://github.com/Kussoon/kussoon.github.io/pull/128) [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) [#130](https://github.com/Kussoon/kussoon.github.io/pull/130) [#131](https://github.com/Kussoon/kussoon.github.io/pull/131) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)|municipality-renderer.render / .borders|#128→#129で太線を廃止。旧#102の2.6px選択枠を2026版へ復元しない|
|S36|A|自治体は塗りpath、境界は共有arcの単一path。選択でDOMを累積しない|[#128](https://github.com/Kussoon/kussoon.github.io/pull/128) [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) [#130](https://github.com/Kussoon/kussoon.github.io/pull/130) [#131](https://github.com/Kussoon/kussoon.github.io/pull/131) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)|municipality-renderer.render|既存renderer・single-strokeテスト合格。実際の全線の地理一致とは別|
|S37|要確認|境界線は拡大しても一定画面幅、タッチfocusとマウスhoverを分ける|[#57](https://github.com/Kussoon/kussoon.github.io/pull/57) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)|pilot: .borders / .prefecture:focus-visible|CSS静的検査合格。太線・二重線の実ブラウザ視覚確認なし|
|S38|A|2026年N03由来47県1905区域を県別配信しコード・重複・区域数を検証|[#107](https://github.com/Kussoon/kussoon.github.io/pull/107) [#108](https://github.com/Kussoon/kussoon.github.io/pull/108) [#114](https://github.com/Kussoon/kussoon.github.io/pull/114) [#120](https://github.com/Kussoon/kussoon.github.io/pull/120) [#127](https://github.com/Kussoon/kussoon.github.io/pull/127) [#132](https://github.com/Kussoon/kussoon.github.io/pull/132) [#134](https://github.com/Kussoon/kussoon.github.io/pull/134) [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)|2026-common/national-2026-pilot/manifest.json / goPref|第1段階: 全47県の実TopoJSONで1905コード・区域数・参照arc・有限座標を検査。再生成・法的行政界の独立確認は対象外|
|S39|要確認|共有県境の存在・抽出完全性・見た目を異なる保証として扱う|[#140](https://github.com/Kussoon/kussoon.github.io/pull/140) [#141](https://github.com/Kussoon/kussoon.github.io/pull/141) [#187](https://github.com/Kussoon/kussoon.github.io/pull/187) [#230](https://github.com/Kussoon/kussoon.github.io/pull/230) [#233](https://github.com/Kussoon/kussoon.github.io/pull/233) [#234](https://github.com/Kussoon/kussoon.github.io/pull/234) [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)|shared-border pilot / seam audit tools|#187の22組と#233以降の60組29440辺は対象と方式が異なる。本体へ全て統合済みとは判定しない|
|S40|A|地図1905と庁舎1912の差は北方6・所属未定7と親政令市20を区別|[#186](https://github.com/Kussoon/kussoon.github.io/pull/186) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)|audit-office-map-codes / office-map-coverage|第1段階: 全47地図と庁舎を再照合。北方6・所属未定7・親政令市20の例外を厳密検査|

現行経路の略記: `pilot` は [2026統合HTML](../../v2/national/official-2026-nationwide-pilot.html)、`map-viewport` / `municipality-renderer` / `place-labels` / `reading-bridge` / `established-label-adapter` は `v2/shared/` 配下、`office-directory` は `v2/common/js/` 配下。ファイル名だけでなく上記関数・呼出し元を合わせて参照する。固定SHAのリンクは各PR節と[監査入口](v2-national-audit-summary-20261104.md)に記載。


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
