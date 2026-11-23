# 西宮市SVG V29：ラベル計算の状態遷移監査

2026-11-17。第28比較版（PR #573 / run 44040217056）は全機能CI合格だったが、地域差・全域復帰差がV25と同一で表示改善なし。

V29はV25/V28 HTMLにブラウザー内で一時的な読み取り関数を挿入する。表示コード・正式C版・共有エンジンは不変更。PC Chromium1280/WebKit390/320の操作列「初期→読みON→125%→読みOFF→100%→安井→香櫨園→上ヶ原→全市復帰」で、cLabelMode・cRebaseline・読みON・fontPixels・ズーム倍率・cBaselineLabelShifts / cLabelReflowMetricsの記録件数・個別ラベル（西宮浜・安井町・川添町・上甲東園）の文字矩形/transform/キャッシュ値を記録する。

目的は「モード変更が効かない」理由を推測でなく状態と座標の因果で識別すること。次の修正案には、その操作順での根拠・C版との差の改善、クイズ等への回帰検証を要求する。CI PASSは監査成功であり表示合格ではない。

## 検査結果（2026-11-17）

[GitHub Actions run 44041563119](https://github.com/Kussoon/kussoon.github.io/actions/runs/44041563119) は **PASS**。Chromium1280/WebKit390/320の3環境で、V25/V28の全操作状態と保存キャッシュを記録できた。

- 初期：両版 `mode=initial`、`baselineCache=324`、`reflowCache=0`。
- 読みON：両版 `mode=centered`、`reflowCache=324`。読みONの改善版の動作と整合。
- 読みOFF：V25は `mode=centered` のまま。V28では変更が正しく働いて `mode=initial`、`reflowCache=0`。
- **最初の地域「安井」選択直後**：V28も `mode=centered` に再移行、`reflowCache=12`。次の地域「香櫨園」で24、上ヶ原で42、市全域に戻ると324。結果のラベル文字位置もV25とV28でほぼ同値。
- 保存された初期 `cBaselineLabelShifts` は324件を維持したまま、読みOFF→地域fit時の再配置モードだけが再度有効化されていた。

推定原因は地域ボタンのクリックに伴う `zoom.transform` 中に、`onZoom(event)` が `event.sourceEvent` を真とみなし `cLabelReflow()` を呼び出すこと。**ただし原因イベントの直接トレースは未実施**なので、断定せず比較試作PR #575（V30）でプログラム上のfitだけを区別する。固定座標補正・共通エンジン修正は行わない。
