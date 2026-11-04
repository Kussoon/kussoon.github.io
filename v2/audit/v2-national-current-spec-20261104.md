# V2全国統合版 確定仕様・確認状態

## 2026年全国統合版への適用監査（2026-11-04）

本書の確定仕様と実装済み範囲は同一ではありません。2021年densityのテスト成功を2026年ページの合格に読み替えないでください。
後続PRで明示された廃止は尊重します。#82の読み初期ONは#223/#239のOFFへ、#88の2リンクは#89/#93の3/6リンクへ更新されています。#242→#243→#244はモバイル配置の履歴であり、古いCSSを戻しません。

以下は現在有効な契約と、その対象ページでの確認状態です。正常反映には部品テストのみの項目も含み、根拠欄の検証段階を超える保証はしません。PR単位の履歴と仕様単位の集計を混ぜないでください。

監査日：2026-11-04 JST

固定main：[`c69c970c982724b20d9a327e1fd1c223f356aebd`](https://github.com/Kussoon/kussoon.github.io/commit/c69c970c982724b20d9a327e1fd1c223f356aebd)
対象：`v2/national/official-2026-nationwide-pilot.html`

|ID|有効な仕様|判定|根拠・確認範囲|
|---|---|---|---|
|S01|吹き出しの×は色・位置を維持|正常反映|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)：公開Chromeで西宮市・多可町を確認|
|S02|同一区域の再タップは色のみ解除・投影と位置維持|未反映・回帰疑い|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)：西宮市で再現。paint()が県boxへ再投影しviewport.reset()する|
|S03|解除後の選択で色と吹き出しを再表示|正常反映|[#81](https://github.com/Kussoon/kussoon.github.io/pull/81) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)：再選択をメニューで確認。地図上での全8手順連続実施は残る|
|S04|選択色は琥珀色|正常反映|[#85](https://github.com/Kussoon/kussoon.github.io/pull/85) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)：公開Chromeで選択path1件と琥珀色確認|
|S05|通常自治体は住所・郵便番号・3リンク|正常反映|[#80](https://github.com/Kussoon/kussoon.github.io/pull/80) [#84](https://github.com/Kussoon/kussoon.github.io/pull/84) [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) [#91](https://github.com/Kussoon/kussoon.github.io/pull/91)：西宮市・多可町の表示とhrefを確認。外部遷移先の再監査は対象外|
|S06|政令市区は区役所と市役所の計6リンク|正常反映|[#87](https://github.com/Kussoon/kussoon.github.io/pull/87) [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)：神戸市中央区の2住所・6href確認|
|S07|公式リンクは監査Aのみ有効|正常反映|[#212](https://github.com/Kussoon/kussoon.github.io/pull/212)：共通office-directoryの単体検査。全リンク実到達の証明ではない|
|S08|よみがな初期OFF・切替連動|正常反映|[#223](https://github.com/Kussoon/kussoon.github.io/pull/223) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)：公開Chrome初期OFFと現行toolbarテスト合格。全県ON実機は未確認|
|S09|名前・コード一致時のみ読みを付ける|正常反映|[#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#145](https://github.com/Kussoon/kussoon.github.io/pull/145)：reading-bridgeテスト合格。推測読みを補わない|
|S10|市名・市の読み・区名・区の読みの4行|正常反映|[#144](https://github.com/Kussoon/kussoon.github.io/pull/144) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)：place-labels/reading-bridge部品テスト合格。全県視覚確認は残る|
|S11|漢字のみでも市＋区、郡＋町村を明示|未反映・回帰疑い|[#60](https://github.com/Kussoon/kussoon.github.io/pull/60) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) [#226](https://github.com/Kussoon/kussoon.github.io/pull/226)：place-labels.showは読みOFF時region.name一行。readingPartsの分解表示を使わない|
|S12|固定5C・庁舎含有区域・5Bフォールバック・手動座標不使用|未反映・回帰疑い|[#79](https://github.com/Kussoon/kussoon.github.io/pull/79) [#94](https://github.com/Kussoon/kussoon.github.io/pull/94) [#95](https://github.com/Kussoon/kussoon.github.io/pull/95) [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) [#225](https://github.com/Kussoon/kussoon.github.io/pull/225) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)：2026adapterはlargestPolygon＋balanced/衝突補正。庁舎参照点を参照せず固定5Cとは異なる|
|S13|ラベルは最大13画面px|未反映・回帰疑い|[#217](https://github.com/Kussoon/kussoon.github.io/pull/217) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)：2026place-labelsは14/選択18 SVG単位、viewportズームで拡大する|
|S14|全国地図最大倍率768|未反映・回帰疑い|[#224](https://github.com/Kussoon/kussoon.github.io/pull/224) [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)：2026initでmaxZoomを指定せずviewport既定128。適用対象差を解消する必要|
|S15|選択後・×後も上下左右ドラッグ|正常反映|[#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#240](https://github.com/Kussoon/kussoon.github.io/pull/240) [#241](https://github.com/Kussoon/kussoon.github.io/pull/241) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)：公開Chrome多可町で上下左右viewBox変化確認。iPhone保証はしない|
|S16|iOS子path capture解除でドラッグを中断しない|要確認|[#241](https://github.com/Kussoon/kussoon.github.io/pull/241) [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)：合成イベントテスト合格。今回iPhone実機は未確認|
|S17|ピンチ拡大・タップとドラッグの分離|正常反映|[#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#240](https://github.com/Kussoon/kussoon.github.io/pull/240) [#241](https://github.com/Kussoon/kussoon.github.io/pull/241)：viewport部品テスト合格。ネイティブタッチ実機未確認|
|S18|クリックで有効化するPCホイール・ダブルクリック|正常反映|[#136](https://github.com/Kussoon/kussoon.github.io/pull/136)：viewport部品テスト合格。公開実操作は未確認|
|S19|＋・−・全体表示と選択維持|正常反映|[#70](https://github.com/Kussoon/kussoon.github.io/pull/70) [#82](https://github.com/Kussoon/kussoon.github.io/pull/82) [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)：公開Chromeで1→1.8→1倍、リセット後も選択1件|
|S20|選択時に自治体・離島を中央表示|正常反映|[#135](https://github.com/Kussoon/kussoon.github.io/pull/135) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204)：西宮市/多可町で確認。focusBounds部品テスト合格。遠隔島全件未確認|
|S21|全国輪郭から必要県のみ取得|正常反映|[#125](https://github.com/Kussoon/kussoon.github.io/pull/125) [#139](https://github.com/Kussoon/kussoon.github.io/pull/139)：公開画面で兵庫県3.38MB、初期全国輪郭を確認。全県ネットワーク取得ログは未収録|
|S22|県データの保持は最大3県・古い非同期応答無視|要確認|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139)：cache.size>3/requestIdあり。実ブラウザ競合・4県往復テスト不足|
|S23|区域は塗りのみ、境界pathは一つ、選択輪郭なし|正常反映|[#128](https://github.com/Kussoon/kussoon.github.io/pull/128) [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) [#131](https://github.com/Kussoon/kussoon.github.io/pull/131) [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)：renderer/2026-single-strokeテスト合格。全国県間の地理一致とは別|
|S24|ズーム時に線幅を固定・タッチfocus太線防止|正常反映|[#238](https://github.com/Kussoon/kussoon.github.io/pull/238) [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)：現行CSS・overview-focus-toolbarテスト合格。iPhone視覚未確認|
|S25|全国共通県境の完全性|要確認|[#107](https://github.com/Kussoon/kussoon.github.io/pull/107) [#120](https://github.com/Kussoon/kussoon.github.io/pull/120) [#187](https://github.com/Kussoon/kussoon.github.io/pull/187) [#230](https://github.com/Kussoon/kussoon.github.io/pull/230) [#233](https://github.com/Kussoon/kussoon.github.io/pull/233) [#234](https://github.com/Kussoon/kussoon.github.io/pull/234) [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) [#237](https://github.com/Kussoon/kussoon.github.io/pull/237)：60組29440辺の一致検査と全境界の完全性は別。比較試作を本番完了扱いしない|
|S26|2026年1905区域と庁舎のコード整合|要確認|[#170](https://github.com/Kussoon/kussoon.github.io/pull/170) [#186](https://github.com/Kussoon/kussoon.github.io/pull/186) [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)：manifest1905、庁舎1912。今回全TopoJSON再実読は未完了。2021の旧浜松問題を本ページへ転記しない|
|S27|47県1912区域の庁舎スキーマと親市参照|正常反映|[#86](https://github.com/Kussoon/kussoon.github.io/pull/86) [#87](https://github.com/Kussoon/kussoon.github.io/pull/87) [#150](https://github.com/Kussoon/kussoon.github.io/pull/150) [#186](https://github.com/Kussoon/kussoon.github.io/pull/186)：47ファイルの既存データ検証合格。住所最新性は保証しない|
|S28|全国検索は名前・読み・5桁コードに対応|要確認|[#142](https://github.com/Kussoon/kussoon.github.io/pull/142) [#204](https://github.com/Kussoon/kussoon.github.io/pull/204)：コード経路あり。今回公開検索操作は未完了。densityの非表示問題と区別|
|S29|全国クイズUIは保留、共通コード維持|意図的変更・廃止|[#147](https://github.com/Kussoon/kussoon.github.io/pull/147) [#149](https://github.com/Kussoon/kussoon.github.io/pull/149)：149が明示的非表示。quiz部品テスト合格。勝手に再公開しない|
|S30|吹き出しは画面内・内部スクロール・3列リンク|要確認|[#91](https://github.com/Kussoon/kussoon.github.io/pull/91) [#242](https://github.com/Kussoon/kussoon.github.io/pull/242) [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) [#244](https://github.com/Kussoon/kussoon.github.io/pull/244)：mobile-popup静的テスト合格。iPhone実寸・下端切れ・長い6リンクの視覚検証は未完了。ボタン高さの厳密一致は最新ユーザー希望として再確認|

関連成果物：[PR照合台帳](./v2-national-pr-ledger-20261104.md)、[回帰疑い](./v2-national-regressions-20261104.md)、[テスト計画](./v2-national-regression-test-plan-20261104.md)。

運用：変更PRには対象仕様ID・対象入口・後続変更根拠・検査結果・未確認範囲を記録し、この表を更新すること。実機承認はユーザーの発言/画像等の所在を記録し、PR本文の「確認予定」を承認と扱わない。新しい例外や仕様変更には日付と後継IDを付け、旧履歴は削除しない。
