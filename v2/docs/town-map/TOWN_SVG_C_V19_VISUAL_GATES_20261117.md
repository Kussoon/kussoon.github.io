# 西宮市町名マップ｜C版対SVG V15〜V19表示照合・受入ゲート

記録日：2026-11-17（JST）  
正式基準：Leaflet C版 `v2/nishinomiya-town-study-c.html`（未変更）  
作業版：SVG V15（既存比較版）、V16（PR #552）、V17（PR #554）、V18（Draft PR #555）、V19（Draft PR #558）。

## 第1段階：版数と案内文の誤記修正

PR [#548](https://github.com/Kussoon/kussoon.github.io/pull/548) main統合・専用検査合格。V15ページのtitle、h1、説明を第15版へ統一し、noindexとC版戻りリンクを保持。描画JS・正式C版は未変更。

## 第2段階：正式C版と最新SVGの直接比較

PR [#549](https://github.com/Kussoon/kussoon.github.io/pull/549)、Actions [#44011996026](https://github.com/Kussoon/kussoon.github.io/actions/runs/44011996026) にて、同一Viewportで実DOMの324ラベル矩形を測定。

| 画面 | V15初期：C版からの位置差中央値 | V15最大差 | V16初期：位置差中央値 | V16最大差 |
|---|---:|---:|---:|---:|
| Chromium 1280px | 16.879px | 40.993px | 0.496px | 1.381px |
| WebKit 390px | 20.771px | 51.329px | 0.435px | 1.192px |
| WebKit 320px | 15.562px | 59.500px | 0.825px | 1.459px |

V16のC版初期表示との照合：Actions [#44013514698](https://github.com/Kussoon/kussoon.github.io/actions/runs/44013514698)。321町名、324ラベル、地図表示領域寸法は一致。初期表示以外の「完全一致」を意味しない。

## 第3段階：原因の切り分けと比較試作

- PR [#550](https://github.com/Kussoon/kussoon.github.io/pull/550)：全体の平行移動・縮尺差と個別残差を分離。
- PR [#551](https://github.com/Kussoon/kussoon.github.io/pull/551)：Leafletの0.1刻み初期ズーム、D3の連続フィットの差を同一経緯度の投影から確認。
- PR #552 / V16：Leafletの初期ズーム0.1刻みとTooltipの描画矩形基準を比較再現し、初期324ラベルで最大1.46px以内（検証3幅）。
- PR #554 / V17：読みON・文字変更時の位置変動を分離。C版からの読みON位置差中央値はPC 14.658px／390px 14.627px／320px 14.866px。
- Draft PR [#555](https://github.com/Kussoon/kussoon.github.io/pull/555) / V18：読み・文字変更後の基準位置を見直し、読みON位置差中央値がPC 6.668px／390px 5.666px／320px 5.951pxに改善。ただし最大差は25〜27px程度。
- PR [#557](https://github.com/Kussoon/kussoon.github.io/pull/557)、Actions [#44016739991](https://github.com/Kussoon/kussoon.github.io/actions/runs/44016739991)：地域選択時はSVGの地図縮尺がC版より約1〜7%大きいケースを確認。市全体復帰後は地理投影の同一経緯度での画面位置はほぼ一致し、残るラベル差は別原因と判断。
- Draft PR [#558](https://github.com/Kussoon/kussoon.github.io/pull/558) / V19：地域別の地理的bounds・22px余白・0.1刻みズームを比較実装。特殊地域のGeometry形式差による初回JSエラーを修正した後、Actions [#44017365721](https://github.com/Kussoon/kussoon.github.io/actions/runs/44017365721) のブラウザー／クイズ検査はPASS。

地域「山口」でのC版に対する表示中の対応ラベル位置差：

| 画面 | V18中央値 / 最大差 | V19中央値 / 最大差 |
|---|---|---|
| Chromium 1280px | 24.244 / 44.969px | 17.352 / 32.342px |
| WebKit 390px | 23.253 / 44.133px | 20.557 / 38.889px |
| WebKit 320px | 23.615 / 43.598px | 20.349 / 36.840px |

注意：第18／19版のC対SVG 26地域比較では、C版の非対象ラベル要素がDOMに多数残り、SVGは対象地域の要素へ絞るため、町名集合・要素数が全地域で必ずしも一致しない。上記位置差は両側で同一町名を持つラベルの対応についての計測であり、見た目の合格／不合格を自動決定したものではない。

## 第4段階：最終自動検査と利用者実機受入

**まだ最終受入に進まない。**

- V19のクイズ1／2はChromium・WebKitの各321町名で合格、15段階の操作状態遷移はPC／WebKit 390／320で合格。
- 一方、V19読みONの位置差中央値はPC 6.668px、390px 5.666px、320px 5.951px。地域「山口」でも約17〜21px、市全体に戻した後は約14〜15pxの差がある。
- 初期表示の座標一致・クイズ正常性だけでは、C版の表示・読み・操作の総合的な同等性とは判断できない。
- 未了の作業：①C版で地域外のTooltipがDOMに残る理由と視認性の実態を確認、②地域別の地図縮尺・中心の一致とラベル固有位置の差を個別に評価、③読みONや文字125%時のTooltip配置規則をさらに照合、④町名直リンク、全域復帰時の表示差解消、⑤比較画像の目視確認とブラウザー総合回帰、⑥利用者のiPhone Safari・PCでの実機確認。

**保護措置**：Leaflet C版は正式基準として維持。V15〜V19の独立比較ページと、成功済みの既存検査を保存。V18・V19は実機受入前のDraft PRであり、C版の置換や他市への適用には使わない。地域表示の数値検査が合格しても画像の目視評価を省略しない。
