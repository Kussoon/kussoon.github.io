# 和歌山県V2 地域学習・クイズ1/2

- 対象：2026年全国市区町村データ、和歌山県の30市町村（9市21町村）
- 地域区分：県の[行政組織規則 第31条](https://www.pref.wakayama.lg.jp/prefg/010100/reiki/reiki_honbun/k501RG00000090.html)に定める7振興局の所管区域
  - 海草3、那賀2、伊都4、有田4、日高7、西牟婁4、東牟婁6
- 郡名とふりがな：[J-LIS和歌山県内市町村](https://www.j-lis.go.jp/spd/code-address/kinki/cms_15114183.html)
- [地域選択・市町村一覧](index.html)、[クイズ1](quiz.html?mode=1)、[クイズ2](quiz.html?mode=2)

## 全国データに含まれる特別な1区域

和歌山県コード30の全国索引とTopoJSONは31レコードです。ただし `30000` は `所属未定地` であり、市町村ではありません。出題には使わず、`regions.json` の `excludedAreaCodes:["30000"]` に明示しています。共通クイズアプリはこのオプションがある場合だけ当該コードを除くため、既存の奈良・滋賀・兵庫・大阪・京都は従来どおりの経路です。元データは改変しません。

## テスト

`node v2/municipalities/wakayama/quiz.contract.test.cjs`

`node v2/municipalities/shared/regional-quiz.test.cjs`

全国索引1,905、和歌山県31（市町村30＋所属未定地1）、全30市町村コード、地域所属、21町村の郡名、全ふりがな、クイズ共通エンジン契約を確認します。iPhone実機確認前の検証版（noindex）。
