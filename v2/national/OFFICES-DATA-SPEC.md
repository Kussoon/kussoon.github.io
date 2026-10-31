# V2 全国共通：自治体庁舎データ仕様 v1.1（Codex実装前）

策定日：2026-11-01。**この文書は設計仕様であり、公開アプリの改修・データ全件登録は未実施。**

## 目的と基本原則

- 日本全国の市・町・村・政令指定都市・行政区（区役所）を、5桁の標準地域コードをキーに表示する。
- **区を選択した場合、区役所とその政令指定都市の市役所の両方を表示**。先に区役所、次に市役所。各施設に独立した郵便番号・住所・公式案内ページ・「ここへ行く」を表示。
- 一自治体に複数施設が関連しても、庁舎そのものの住所は一度だけ保存する（正規化）。区9件へ神戸市役所の住所を9回複製しない。
- 「行政区」と「北神区役所などの区役所・支所」は同義ではない。行政区域コードがある区を基本単位とし、支所を追加する場合は別ルール。
- 施設の郵便番号は所在地の一般郵便番号と異なる場合があるため、必ず**その庁舎に対する**郵便番号を確認。情報が不明な項目を推測で補完しない。
- 2021年版の地図形状と現在の庁舎所在・公式URLの更新日は別に管理し、混同しない。
- 現行V2の新案5・地図操作・読み仮名・選択時のハイライトは変更しない。

## データ構造（案）

都道府県別ファイル `v2/data/offices/28.json` 等を使う。実装時は現行の `v2/data/national/municipality-offices-pilot.json` から段階移行する。表示対象地域に必要なファイルだけロードする。

```json
{
  "schemaVersion": 2,
  "prefecture": "28",
  "asOf": "2026-11-01",
  "regions": {
    "28100": {
      "name": "神戸市",
      "kind": "designatedCity",
      "officeIds": ["28100-city"]
    },
    "28110": {
      "name": "神戸市中央区",
      "kind": "ward",
      "parentCode": "28100",
      "officeIds": ["28110-ward", "28100-city"]
    },
    "28204": {
      "name": "西宮市",
      "kind": "city",
      "officeIds": ["28204-city"]
    }
  },
  "offices": {
    "28100-city": {
      "name": "神戸市役所（1号館）",
      "kind": "cityHall",
      "postalCode": "650-8570",
      "address": "兵庫県神戸市中央区加納町6丁目5-1",
      "officialPage": "https://www.city.kobe.lg.jp/a28956/shise/about/building/index.html",
      "sourceUrl": "https://www.city.kobe.lg.jp/a28956/shise/about/building/index.html",
      "sourcePostalUrl": "https://catalog.city.kobe.lg.jp/dataset/city-hall",
      "verifiedAt": "2026-11-01",
      "status": "verified"
    },
    "28110-ward": {
      "name": "神戸市中央区役所",
      "kind": "wardOffice",
      "postalCode": "651-8570",
      "address": "兵庫県神戸市中央区東町115番地",
      "officialPage": "https://www.city.kobe.lg.jp/d62766/kuyakusho/chuoku/madoguchi/access.html",
      "sourceUrl": "https://www.city.kobe.lg.jp/d62766/kuyakusho/chuoku/madoguchi/access.html",
      "verifiedAt": "2026-11-01",
      "status": "verified"
    }
  }
}
```

例にある住所は公式所在地案内、郵便番号は自治体の公式ページ・公式オープンデータ案内に基づく。神戸市役所と中央区役所は近接しているが**異なる施設・異なる郵便番号**として保存する。

### 施設・地域それぞれの追加項目

- `regions[code].official`: 市区町村の公式トップURL。検証済みのみ。
- `regions[code].wikipedia`: 自治体・区の対応記事URL。曖昧さ回避。施設固有ではない。
- `offices[id].lat/lng`: 公式・信頼できるデータで検証済みの場合だけ使用可。未検証時は住所をGoogle Maps経路案内に渡す。
- `offices[id].sourceUrl` と `verifiedAt`: 現地確認ではなく**公式ウェブ上での確認**日。誤認防止。
- `status`: `verified` / `needsReview` / `missing` 等。欠損住所や未確認URLはリンク化しない。
- `parentCode`: 政令市区から市役所を参照する際の親コード。
- 事務所・支所は「別建物」として扱い、デフォルトでは自治体本庁／区役所を優先する。

## 吹き出し表示規則

1. 市・町・村の選択：原則1施設（その役所・役場）の情報。既存B案のコンパクトな表示を維持。
2. **区の選択：区役所・市役所の2施設**を、見出しで分けて順に表示。それぞれ別の「ここへ行く」ボタンを付け、別々の経路先にする。自治体公式トップとWikipediaは区情報の欄に置くか共通行にまとめ、施設ごとに無理に重複しない。
3. 現在の画面幅が狭いため、区の2施設表示では**吹き出し内部をスクロール**可能とし、右下4ボタンを覆わない。×は吹き出しだけを閉じ、選択色を残す。同じ区域を再タップしたら選択解除し、さらにタップすると吹き出しを再表示。
4. **未収録の区や自治体**は確認待ちとし、住所・郵便番号・経路URLを推測で表示しない。市役所だけ確認済みなら区役所欄は未確認と明示し、確認済み市役所だけ使えるようにする。
5. 旧JSONの既存4件は欠落・退行させず、移行後も同じ内容を表示する。既存の3リンクは機能維持し、2施設の際に表示が不明瞭にならないよう区別する。

## 情報源・品質管理

1. 5桁コード：政府統計(e-Stat)の標準地域コード、国土交通省行政区域コードとの一致を照合。先頭0保持のためJSONキーは文字列。
2. 庁舎名・所在地・郵便番号・公式案内ページ：**各自治体公式サイトを最優先**。公式資料の発行日・更新日を確認し、移転前の旧住所を採用しない。
3. 自治体公式サイト：e-Gov等の公的リンク集を参考にするが、最終URLは公式サイト自身で確認。
4. Wikipedia URL：記事の実在と自治体名との対応を確認。存在を推測しない。
5. 経路案内：Google Maps Directions URLへ「庁舎名＋住所」をURLエンコード。住所不明ならリンク無効。
6. 同じ市役所を複数区で参照しても、JSON内の施設情報は一箇所のみ。重複検出テストを作成。
7. `regions` の区コードが有効、`parentCode` が実在、`officeIds` がすべて `offices` に存在することを自動テストする。
8. 既存行政区域JSONのキー名・形状を壊さない。現行プレビューの総区域数・新案5のラベル位置変更なし。
9. 調査中／要再確認は一覧化し、成功件数に含めない。公式資料間で矛盾がある場合は新しい公式の一次情報を優先し、理由を記録。

## 兵庫県パイロットと受入条件

- **41市町（神戸市含む）＋神戸市9区＝50地域**が対象。市役所・町役場は41施設、区役所9施設。特殊な支所は最初のパイロットに含めない。
- `28100` 神戸市を選んだ場合は市役所のみ、`28110` 神戸市中央区の場合は中央区役所と神戸市役所の両方、`28204` 西宮市は西宮市役所のみ。
- まず神戸市・中央区・既存の西宮市・宝塚市・三木市・神河町で表示、選択色、郵便番号、2種類の「ここへ行く」をテスト。
- その後、全50地域の住所・郵便番号・公式案内URL・出典・確認日を追加する。Wikipediaリンクは確認済みのみ。
- Codexは変更をPRで提出し、マージ前に差分・データ整合性・テスト結果を報告する。**既存の `main` に無断マージせず、公開V2以外のページを編集しない。**

## 参照（2026-11-01確認）

- 神戸市役所本庁舎：https://www.city.kobe.lg.jp/a28956/shise/about/building/index.html
- 神戸市公式オープンデータ（市役所・区役所）：https://catalog.city.kobe.lg.jp/dataset/city-hall
- 神戸市中央区役所：https://www.city.kobe.lg.jp/d62766/kuyakusho/chuoku/madoguchi/access.html
- 神戸市区役所一覧：https://www.city.kobe.lg.jp/a84453/shise/institution/kuyakusho.html
- 5桁標準地域コード：https://data.e-stat.go.jp/lodw/provdata/lodRegion
- 行政区域コード一覧：https://nlftp.mlit.go.jp/ksj/gml/codelist/AdminAreaCd.html
