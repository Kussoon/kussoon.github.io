# 島根県V2 地域学習・クイズ1／2

県公式の[保健医療計画（7圏域）](https://www.pref.shimane.lg.jp/medical/kenko/iryo/shimaneno_iryo/hokenniryoukeikaku/ishikakuho.html)に基づき、松江2・雲南3・出雲1・大田4・浜田2・益田3・隠岐4の7地域を採用。現在の19市町村へ対応させています。

2026年全国共通地図の県コード32、19区域を全件照合。8市10町1村、5郡・11町村の郡名と読み仮名を記載。郡名については[島根県の市町村一覧](https://www.pref.shimane.lg.jp/infra/road/keikaku/doro_bosai/kinkyudoro.data/r7keikakusho.pdf)を根拠とします。

## 注意

- 出雲圏域は**出雲市1区域**。クイズ2の4択は、正答1件＋他圏域の近隣市町村3件を共通エンジンから抽出します。
- 隠岐圏域は**海士町・西ノ島町・知夫村・隠岐の島町の4区域**。地図全体ボタンと縮小表示の実機確認が重要です。
- 全国共通の地図・クイズ・採点エンジン、県境・ラベル配置は変更していません。
- `index.html`、`quiz.html?mode=1`、`quiz.html?mode=2` はnoindexの検証版です。

## テスト

`node v2/municipalities/shimane/quiz.contract.test.cjs`

`node v2/tests/run-national-contracts.cjs`
