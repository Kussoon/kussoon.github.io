# 鳥取県 V2 地域学習・クイズ1・2

- 作成日：2026年11月9日
- 地域区分：[鳥取県公式「県内市町村の実施状況」](https://www.pref.tottori.lg.jp/34749.htm)（東部・中部・西部）および[県公式観光ガイドマップ](https://www.tottori-guide.jp/pamphlet/)（東部5・中部5・西部9の市町村構成）
- 郡名：[鳥取県公式「市町村の給与・定員等」](https://www.pref.tottori.lg.jp/153648.htm)
- 全国2026年版データ：県コード31、19市町村（4市14町1村）。地域への所属は全19コード一致・重複なし。
- 東部（とうぶ）5：鳥取市、岩美町、若桜町、智頭町、八頭町
- 中部（ちゅうぶ）5：倉吉市、三朝町、湯梨浜町、琴浦町、北栄町
- 西部（せいぶ）9：米子市、境港市、日吉津村、大山町、南部町、伯耆町、日南町、日野町、江府町
- 15町村の郡名（岩美郡・八頭郡・東伯郡・西伯郡・日野郡）と郡の読みを登録。

## ページ

- [地域選択・市町村一覧](index.html)
- [クイズ1：市町村名→地図](quiz.html?mode=1)
- [クイズ2：点滅区域→4択](quiz.html?mode=2)

共通の `quiz-app.js`、`regional-quiz.js`、`quiz.css` を変更せずに再利用。全国の境界、ラベルエンジン、既存府県データ、採点は変更しない。

## テスト

`node v2/municipalities/tottori/quiz.contract.test.cjs`

`node v2/tests/run-national-contracts.cjs`

公開後も noindex の検証版とし、iPhone Safariの地図操作は別途実機確認する。
