# 西宮市SVG V24：WebKitでの文字実寸測定の再検証

2026-11-17。比較ページはV21を使用し、正式Leaflet C版・V21・V22表示コード・共通エンジンは変更しない。

PR #568（Run 44030625554）はPASS。ただし計測上の重大発見：WebKitではSVGの町名と読み仮名の`tspan.getBBox()`が同じ親`text`全体の範囲を返す場合がある（西宮浜の双方の矩形が44.6875×17.171875で完全一致）。読み行のyを8px変更すると町名と読みの測定中心が同時に約4px変化するため、これまでのWebKitの「読み行−12〜13px」という数値は実文字位置として信頼できない。

V24では、第21版監査のWebKit側SVG`tspan`計測を`Range.selectNodeContents(element).getBoundingClientRect()`優先に切り替えて同一32表示状態を再計測。町名と読みの相対Y差中央値も出力する。DOM Rangeが有効矩形を返さなければ従来のbboxフォールバックとなるので、`PASS`だけで改善と断定しない。ChromiumとWebKitの町名・読みが異なる矩形として分離計測できるかを先に評価する。

合格ゲート：計測実行の成功（CI）と、読み行の独立測定が成立すること（監査結果）を区別。新測定が成立してから初めて実際の表示差を評価し、次の比較試作が必要かを判定する。全321町名・クイズ・実機受入は未判定のまま保持する。

## 検査環境の不備と修正

初回GitHub Actions [run 44032982318](https://github.com/Kussoon/kussoon.github.io/actions/runs/44032982318) はFAIL。理由は診断スクリプトが存在しない `v2/nishinomiya-town-svg-master-v24-20261117-pilot.html` を参照したためで、HTTP 404→60秒待機タイムアウト。表示品質の判定には使えない。参照を実在するV21比較版 `v2/nishinomiya-town-svg-master-v21-20261117-pilot.html` に修正した（commit 6612224）。V24は監査版番号であり、表示版番号ではない。
