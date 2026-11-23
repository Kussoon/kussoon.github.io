# 西宮市町名SVG V30｜地域選択の自動ズームと手動ズームの分離比較

2026-11-17。PR #574 V29 状態監査run 44041563119はPASS。V28では読み仮名OFF直後にmode=initial/reflowCache=0に戻るが、最初の地域「安井」を選ぶとmode=centered/reflowCache=12に変わり、その後の地域変更・全市復帰でもcenteredが継続してV25と位置差が同値。onZoom()の `if(event.sourceEvent){...cLabelReflow()}` が地域選択クリックに伴うプログラム上のfitをユーザーの手動ズームと誤認している可能性を検証する。

## V30最小変更

V28の独立コピーに `programmaticFitDepth` を導入。地域fit/市全体resetが直接実行する `svg.call(zoom.transform,...)` の間だけdepthを加算・減算し、`onZoom`における`cLabelReflow`呼出しを抑制する。直接ズーム・ドラッグ・ホイール操作等の既存処理は保持し、実データ、共通エンジン、正式C版、V25/V28ページは不変更。

## 合否

Cとの位置比較：初期・読みON・125%改善を維持し、26地域・全域復帰で位置差中央値がV25より縮小するか測定。クイズ321×2、15状態の回帰検査。上甲東園の件数差と直リンクの問題は別判定。CI成功は表示一致を意味しない。

## 最終CI結果・表示判定（2026-11-17追記）

GitHub Actions [run 44041924844](https://github.com/Kussoon/kussoon.github.io/actions/runs/44041924844) **全工程成功**：C版との32状態文字位置比較、Chromium/WebKitでの全321町名クイズ1/2、PC/WebKit390/320での15操作状態テストに合格。

位置計測artifact：`nishinomiya-v30-glyph-geometry`（artifact ID 14309497716）。比較値：
- PC1280：初期町名中央値0.861px、読みON町名0.650px、読み0.666px、全域復帰7.276px。地域安井8.369px。
- WebKit390：初期0.716px、読みON町名1.652px、読み0.766px、全域復帰7.813px。香櫨園8.560px。
- WebKit320：初期1.323px、読みON町名0.946px、読み0.567px、全域復帰7.716px。香櫨園7.611px。
- 上ヶ原：C版とSVG版の表示ラベル件数が19対18。上甲東園の外れ値最大はPC44.122px、WebKit390 18.988px、WebKit320 15.556px。

これらは**V28の主要指標と完全同値**。プログラム上のfitを手動zoomから除外するだけでは表示ずれを解決できなかった。**表示改善策としてV30は不採用、Draft保持**。ただしクイズ等の機能回帰は合格。次は再配置の呼び出し元イベントを直接計測するPR #576（V31）へ。
