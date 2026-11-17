# 西宮市 SVG V31：再配置モード切替の呼び出し元監査

2026-11-17。PR #575 V30のC対SVG文字位置監査 artifact ID 14309497716を取得して確認。地域切替・市全体復帰の差はV28と同値。Chromium復帰7.276px、WebKit390復帰7.813px、WebKit320復帰7.716px。読みONの改善（390px町名1.652px、読み0.766px）は維持。V30は**表示改善なし・不採用**。全町名クイズ等のジョブ全体の結論は別に確認する。

次の原因調査では表示コードには手を加えず、PlaywrightのHTML responseに一時的にトレース関数を注入する。V28/V30それぞれで初期→よみON→125%→よみOFF→100%→地域安井→地域香櫨園→市全体復帰の順に操作し、`cLabelReflow()`呼び出しスタック、`onZoom(event)`のsourceEvent.type、`programmaticFitDepth`、ラベルモード、再配置キャッシュ件数を記録する。

原因イベントの直接測定が完了するまで、「プログラム上のzoom.transformだからsourceEventが誤判定される」という推測は確定仕様に含めない。地図の実装・正式C版・共通エンジン・各比較HTMLは一切変更せず、監査専用Draftとする。

## 実測結果（2026-11-17）

[GitHub Actions run 44042647660](https://github.com/Kussoon/kussoon.github.io/actions/runs/44042647660) はChromium1280/WebKit390/320すべてPASS。V28/V30の `cLabelReflow()` スタックとズームイベントsourceEventを記録した。

**根本原因が判明**：3環境とも地域選択の `button.onclick`（両試作HTMLの195行目）から `cLabelReflow()` が**直接**呼び出されていた。初回の「安井」選択時、mode=initialからcenteredへ切り替わる。続く香櫨園・市全体選択でも同じ直接呼出しを繰り返す。これに対し全地域のプログラム上の `onZoom` では `event.sourceEvent.type=null`（V30のガードdepth=1）であり、onZoom内の再配置呼び出しが原因であるという従来の仮説は**誤り**だった。

また「区域全体／市の全体」ボタンも別途 `cLabelReflow()` を直接呼ぶ。修正方針はユーザー操作の手動ズームを維持したまま、**地域選択ボタンと全体表示ボタンの無条件cLabelReflow呼出しだけを除く**こと。独立比較試作PR #577（V32）でC版との差を検証する。固定ピクセル補正は採用しない。
