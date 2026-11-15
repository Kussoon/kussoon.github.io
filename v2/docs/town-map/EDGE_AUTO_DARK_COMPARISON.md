# Kussoon V2｜Edge自動ダーク化への表示対策（比較試作）

作成：2026-11-15 21:09:00 JST

## 発端
2026-11-15に利用者が提供したMicrosoft Edgeダーク表示の録画では、町名マップのページ全体が暗く変換され、ラベルの輪郭が淡く見える。Safariでは正常との実機報告。Edgeのブラウザ設定そのものは録画から確定できない。

## 対策の仮説
Edge/Chromiumの「Webコンテンツの自動ダーク化」動作が色を強制変換している可能性に対応する。Google Chrome公式のAuto Dark Theme技術資料では、ページに `<meta name="color-scheme" content="only light">` と `:root { color-scheme: only light; }` を設定することで自動暗色化をオプトアウトできると説明されている。

一次資料：https://developer.chrome.com/blog/auto-dark-theme

## 比較URL
- 変更前：`/v2/nishinomiya-town-svg-core-pilot.html`
- 対策案：`/v2/nishinomiya-town-svg-edge-dark-guard-pilot.html`

今回の対策案は第3段階の独立コピーであり、明るい配色の宣言のみを追加している。新しいダークテーマをデザインしたものではない。

## 保護対象
西宮市Leaflet C-BASELINE 1.0、元のSVG比較版、共通化の第1〜3段階、地図の塗色、境界線、ラベル位置・サイズ、クイズ・途中終了点滅、ズーム操作、町名直リンクを変更しない。

## 検査
- Chromium PCとWebKitモバイルの既存スモーク検査
- Chromium強制ダーク化フラグで、新旧それぞれの画面を記録
- `color-scheme: only light` が改訂版だけに適用されていること
- Edge実機で録画と同じ設定にした場合の画面を最終比較

## 判断
Edge実機で改善が確認できるまで他の地図やKussoon全ページには適用しない。ブラウザ拡張機能による強制反転・ページ色変更はブラウザがサイトの宣言を無視する場合もあるため、今回の措置であらゆる暗色化を止められると断定しない。
