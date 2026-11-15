# Kussoon V2｜SVG町名マップ共通化・段階2（描画範囲の計算）

作成：2026-11-15 20:26:54 JST

## 変更の目的
西宮市C-BASELINE 1.0（PR #470）を保護したまま、全国の町名マップへ展開するためのSVG地図操作ロジックを一部共通化する。

## 変更範囲
- 新規 `v2/common/js/town-svg-viewport.js`
- 新規 `v2/nishinomiya-town-svg-viewport-pilot.html`
- CIへの第2段階ページのブラウザー検査追加

## 対象処理
`KussoonTownSvgViewport.fitBounds(bounds,width,height,padding,minScale,maxScale)` は、投影済み地図範囲に対して倍率と移動量を返す。DOMやD3に依存しない。

- コミュニティの「区域全体」へ表示：従来と同じ余白44、倍率範囲0.6〜40。
- `?town=` による町名直リンク：従来と同じ余白100、倍率範囲0.6〜40。
- 新たなラベル位置計算、町域投影、採点処理は入れない。
- 選択、ドラッグ、ピンチ、ホイール、ボタンは従来のD3操作に任せる。

## 不変の基準
- `v2/nishinomiya-town-study-c.html` 正式Leaflet C版は変更しない。
- `v2/nishinomiya-town-svg-c-render-pilot.html` 既存SVG比較版と `v2/nishinomiya-town-svg-common-ui-pilot.html` 第1段階も変更しない。
- 321町名、26コミュニティ、岡田山・上甲東園、町名ラベル、読み仮名、クイズ1・2、中断時の黄色点滅を保持する。

## 検証・採用ゲート
- PC ChromiumおよびWebKit 390px/320pxで第2段階と第1段階に同じスモークテストを実施する。
- 地域選択・町名直リンクの拡大倍率と見た目を新旧で比較する。
- 自動検査だけでは実機一致とみなさず、iPhone Safariで確認する。
- 明示的承認があるまで第2段階は未採用比較試作とし、他市へ一括適用しない。

次の段階では、性能と描画一致を計測してから、データ読込や操作イベントを共通化するか判断する。
