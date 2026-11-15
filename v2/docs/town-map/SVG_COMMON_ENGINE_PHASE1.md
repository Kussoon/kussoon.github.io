# Kussoon V2｜SVG町名マップ共通化・段階1（比較試作）

制定：2026-11-15

## 保護対象
- 正式な西宮市Leaflet C版：`v2/nishinomiya-town-study-c.html`（PR #470、C-BASELINE 1.0）
- ユーザーが画面確認したSVG比較版：`v2/nishinomiya-town-svg-c-render-pilot.html`
- これらの2ページはこの段階では**どちらも変更しない**。

## 別ページでの共通化
`v2/nishinomiya-town-svg-common-ui-pilot.html` は独立した比較試作ページ。
共通の `/v2/common/js/town-svg-common-ui.js` に以下の純粋／汎用UI処理を移した。

1. `sortRegionsByReading(regionNames, readings)`：地域名の読み仮名による五十音順（TOWN-COMMUNITY-ORDER-01）。入力配列は変更しない。同読みは名称で順番を確定。未確認の読みを受け付けない。
2. `makeQuizChoice(document,name,reading,onSelect)`：町名と読み仮名を括弧なしで別々のspanへ表示し、ボタン押下を呼び出し元へ通知する。テキストは `textContent` を使い、HTML挿入しない。

両方とも自治体名、町名データ、地図ライブラリ、地域の特殊例外を内部に持たない。

## 今回は共通化しないもの
地図投影、ラベル基準点、町域描画、倍率、点滅の状態、クイズ採点、上甲東園の分割形状、岡田山の特殊所属など。
これらを一度に変更すると表示差分を検証できなくなるため、従来処理をそのまま保持する。

## 回帰検査
既存の `scripts/smoke-nishinomiya-svg-c-pilot.cjs` を元SVG比較版と新共通UI比較版の**両方**に対して実行。
- PC Chromium 1280px
- WebKit 390px / 320px
- 26地域の五十音順、4/5列、1問クイズ1・2、誤答と全問正解、文字の行構成、全画面、岡田山注記

新旧スクリーンショットは別成果物に保存。自動検査が通っても実機での見え方が同じことの証明にはならない。

## 後続
共通UI部品の新旧比較を確認後、データ読込・地図操作・クイズの処理を小さな単位で段階的に分離する。
西宮市C版の品質を落とすなら共通化を撤回する。正式版への昇格はユーザーの明示的な承認が必要。
