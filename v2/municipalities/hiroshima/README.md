# 広島県V2 地域学習・クイズ1/2

2026年11月9日。全国V2地域区分方針（`v2/national/PREFECTURE_STUDY_REGION_POLICY.md`）に従い、広島県の公式資料にある8地域を採用。

出典：[広島県「令和元年度 広島県産業廃棄物処理実態調査」表1-2-3（8地域、令和元年6月現在）](https://www.pref.hiroshima.lg.jp/uploaded/attachment/633233.pdf)。これは産業廃棄物調査で採用された8地域であり、現在の二次保健医療圏7地域とは異なる。県の[二次保健医療圏](https://www.pref.hiroshima.lg.jp/soshiki/54/1225358684868.html)では「芸北」を「広島」に統合する。V2は「芸北」の地理学習上の独立性と、各地域2区域以上という条件から8地域を選択した。

県公式は23市町。全国V2では広島市8区を別出題するため30区域。

- 広島（ひろしま）：12区域
- 広島西（ひろしまにし）：2区域
- 呉（くれ）：2区域
- 芸北（げいほく）：3区域
- 広島中央（ひろしまちゅうおう）：3区域
- 尾三（びさん）：3区域
- 福山・府中（ふくやま・ふちゅう）：3区域
- 備北（びほく）：2区域

郡名と読みは[J-LIS 広島県内市町](https://www.j-lis.go.jp/spd/code-address/chuugoku/cms_15514184.html)で確認。9町・5郡を登録。

共通のクイズJS/CSS、全国地図・ラベル・採点・ズームエンジンは変更せず、既存V2の3ページと同構造で追加。検証版のため noindex を保持。

## 検証

`node v2/municipalities/hiroshima/quiz.contract.test.cjs`

`node v2/tests/run-national-contracts.cjs`

iPhone Safariでの公開後実機確認は別途必要。
