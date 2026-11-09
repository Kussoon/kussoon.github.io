# 岡山県V2 地域学習・クイズ1/2

2026年11月9日。全国V2地域区分方針（`v2/national/PREFECTURE_STUDY_REGION_POLICY.md`）に沿って、歴史地理と県公式の県民局管轄が一致する**備前・備中・美作**の3地域を採用。

根拠：[岡山県「各県民局の管轄地域」](https://www.pref.okayama.jp/uploaded/life/771490_7152944_misc.pdf)、[備前県民局](https://www.pref.okayama.jp/site/11/)、[備中県民局](https://www.pref.okayama.jp/site/12/index-2.html)、[美作県民局](https://www.pref.okayama.jp/site/13/index.html)。

県公式は**27市町村**（岡山市を1市と数える）。全国2026年版のV2地図では、政令指定都市・岡山市を北区・中区・東区・南区の4区として出題するため、**30出題区域**。

- 備前（びぜん）：10区域（岡山市4区、玉野市、備前市、瀬戸内市、赤磐市、和気町、吉備中央町）
- 備中（びっちゅう）：10区域（倉敷市、笠岡市、井原市、総社市、高梁市、新見市、浅口市、早島町、里庄町、矢掛町）
- 美作（みまさか）：10区域（津山市、真庭市、美作市、新庄村、鏡野町、勝央町、奈義町、西粟倉村、久米南町、美咲町）

郡名は[J-LIS 岡山県内市町村](https://www.j-lis.go.jp/spd/code-address/chuugoku/cms_15414184.html)の住所・郡名を根拠とする。12町村の郡名・読みを収録。

地域選択一覧と、クイズ1（地名→場所）、クイズ2（点滅→4択）は既存の `quiz-app.js`、`regional-quiz.js`、`quiz.css` を再利用する。全国地図・県境・自治体コード・共通採点・ラベルエンジンは変更しない。

## 検証

`node v2/municipalities/okayama/quiz.contract.test.cjs`

`node v2/tests/run-national-contracts.cjs`

検証版のため `noindex` 維持。公開後iPhone Safari実機で特に岡山市4区の選択・ふりがなと、3地域の全体表示を確認する。
