# 西宮市町名SVG V30｜地域選択の自動ズームと手動ズームの分離比較

2026-11-17。PR #574 V29 状態監査run 44041563119はPASS。V28では読み仮名OFF直後にmode=initial/reflowCache=0に戻るが、最初の地域「安井」を選ぶとmode=centered/reflowCache=12に変わり、その後の地域変更・全市復帰でもcenteredが継続してV25と位置差が同値。onZoom()の `if(event.sourceEvent){...cLabelReflow()}` が地域選択クリックに伴うプログラム上のfitをユーザーの手動ズームと誤認している可能性を検証する。

## V30最小変更

V28の独立コピーに `programmaticFitDepth` を導入。地域fit/市全体resetが直接実行する `svg.call(zoom.transform,...)` の間だけdepthを加算・減算し、`onZoom`における`cLabelReflow`呼出しを抑制する。直接ズーム・ドラッグ・ホイール操作等の既存処理は保持し、実データ、共通エンジン、正式C版、V25/V28ページは不変更。

## 合否

Cとの位置比較：初期・読みON・125%改善を維持し、26地域・全域復帰で位置差中央値がV25より縮小するか測定。クイズ321×2、15状態の回帰検査。上甲東園の件数差と直リンクの問題は別判定。CI成功は表示一致を意味しない。
