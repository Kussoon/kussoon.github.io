# V2 現行システム棚卸し・維持すべき機能 v0.1

調査日：2026-10-30  
調査対象：Kussoon の `nishinomiya`、`takarazuka`、`amagasaki`、`itami`、`ashiya`、`hyogo` のmainブランチと、サイト本体 `kussoon.github.io`、補足として `games`。  
方法：GitHubツリー、代表HTMLの実装、出典台帳、README、共通仕様案を読み取り確認。**全画面の動作・全町名の正確性を確認した監査ではない。**

## 1. 6リポジトリの現況

| リポジトリ | HTML数（2026-10-30のGitHubツリー） | 現行の主なページ群 | 地理・属性データ | ラベル配置の現状 |
| --- | ---: | --- | --- | --- |
| [nishinomiya](https://github.com/Kussoon/nishinomiya) | 101 | 全域図3、町名検索、コミュニティ選択・26地区地図クイズ、地区別学習・両方向クイズ78、全域クイズ、マニアック、別テーマの地図 | `data/nishinomiya-towns.topojson`、`community-town-map.json`、`maniac-readings.json`、交通・駅・水域GeoJSON | Leaflet Tooltip、町名別 `LABEL_OFFSETS`、`MULTI_LABELS`、`EXTRA_LABELS`（`all-area-labeled.html`） |
| [takarazuka](https://github.com/Kussoon/takarazuka) | 19 | 全域地図、交通図、町名検索、20協議会の場所当て・選択画面、全域クイズ、マニアック、公開済みの協議会別ページ | `data/takarazuka-towns.topojson`、`takarazuka-town-info.json`、交通GeoJSON | 町名入り全域SVGの `<text x y>` 固定座標。検索SVGもHTML内に形状を保持 |
| [amagasaki](https://github.com/Kussoon/amagasaki) | 4 | 町名入り全域図、町名検索、パン屋マップへの入口 | 地図パスと検索属性が主にHTML内 | 町名入り全域SVGに固定テキスト座標。町名検索は町の複数形状の統合、境界線の描画対策を実装 |
| [itami](https://github.com/Kussoon/itami) | 3 | 町名入り全域図、町名検索 | HTML内SVG形状と属性 | `<text x y>` 固定座標。東桑津・小阪田は独立した町域面のない補足表示 |
| [ashiya](https://github.com/Kussoon/ashiya) | 4 | 町名入り全域図、町名検索、パン屋マップへの入口 | HTML内SVG形状と属性 | 59町名の固定座標ラベル。南浜町は離れた2区域 |
| [hyogo](https://github.com/Kussoon/hyogo) | 10 | 全域・10地域学習、名前→場所／場所→名前クイズ、名産品の学習・2種類のクイズ・出典 | `hyogo-city.topojson`、`meisan/meisan-data.js` | D3の `path.centroid()` に `LABEL_OFFSET` を加算。`MAP_LABEL_BY_CODE` で改行・表示名補正、神戸市名を追加配置 |

上記6リポジトリのHTMLは計141件。この件数は**リポジトリ上の現在のファイル数**であり、全HTMLが地理学習エンジンの置換対象という意味ではない。サイト全体の248 HTMLとも異なる集計。西宮の過去のSOURCE_LEDGERでは95件と記録されているが、現ツリーでは101件（関連テーマ追加を含む）。

## 2. 代表的なファイルと機能（移行時に保持）

### 西宮市

- `index.html`：市の入口。学習・検索のほかパン屋、スイーツ、神社・寺院、橋・川、交差点看板などの入口。
- `all-area.html`、`all-area-labeled.html`、`all-area-transport.html`：町域図、ラベル、交通情報。
- `town-search.html`：漢字・読み・郵便番号、検索結果の町選択、ルート導線。Leaflet＋TopoJSONで、丁目を町へ統合する処理がある。
- `community-map-quiz.html`、`community-select.html`：26コミュニティの地図・場所学習。
- `communities/01ashihara/` ～ `26yogai/`：各地区にindex、location-quiz、name-quizの3ページ。
- `full-location-quiz.html`、`full-name-quiz.html`、`maniac/`：全域クイズ、丁目など詳細学習。
- `communities/09koto/learning-common.js`、`learning-common.css`：UI・クイズ共通化の先行実装。
- `common-learning-spec-draft.md` と `common-design-preview.html`：2026-10-02の共通仕様案v0.2と画面見本。仕様は未確定。
- `SOURCE_LEDGER.md`：CODH、交通・水域・OSM、利用条件と加工記録。
- 店舗・交差点・河川等の独立企画は**当面V2共通エンジンの改修対象外**とする。

### 宝塚市

- `index.html`、`all-area*.html`、`town-search.html`、`community-map-quiz.html`、`community-select.html`。
- `full-location-quiz.html`、`full-name-quiz.html`、`maniac/`。
- `communities/01nigawa/` に学習・2クイズ、`02takatsukasa/index.html` に学習ページ。他の協議会は `.keep` のみの箇所があり、**20協議会すべてに学習・クイズが完成したわけではない**。
- `data/takarazuka-town-info.json` と `takarazuka-towns.topojson`。町名表記の独自補正を台帳から引き継ぐ。
- 交通入りページにはLeafletを使うものもあるが、町名検索は埋め込みSVG。全ページを同一方式だと仮定しない。

### 尼崎市

- `index.html`、`all-area-labeled.html`、`town-search.html`、`amagasaki-bread-map.html`。
- 町名検索HTML内に `data-name` 属性つきSVG地図と読み仮名などのデータを保持。
- 2026-10のPR #10～#12で、選択時と通常表示の内部境界線とタッチ時残留を調整済み。**これを失わない**。
- `SOURCE_LEDGER.md` は140町名を記録。別資料の139町という集計と差があるため、移行前に上食満を含む対象の定義を再照合。数値を黙って変更しない。
- 臨海部は補足形状・出典あり。元CODHデータだけで置き換えない。

### 伊丹市

- `index.html`、`all-area-labeled.html`、`town-search.html`。
- 出典台帳では76町名（地図に面を持つ74区域＋文字位置による補足2町名）。東桑津・小阪田の形を新しく作って補完してはいけない。
- 読みの正規化、町名選択後の強調、地図フォーカスを保持する。

### 芦屋市

- `index.html`、`all-area-labeled.html`、`town-search.html`、`ashiya-bread-map.html`。
- 出典台帳：59町名。全域図では南浜町の飛地のため地図面60件。**59町名と60地図面を混同しない**。
- 現行全域図ではSVG `<text>` がx/y固定、地図形状もHTML内。まずラベル計算だけ独立させて比較するのに適する。
- 検索結果・直接タップ・マウスホイールB案・全体表示・パン／ピンチ操作を守る。

### 兵庫県

- `index.html`、`study-all.html`、`study-region.html`、`quiz1.html`、`quiz2.html`。
- 40市町＋神戸市9区 = 49の学習区域。地域区分は神戸、阪神南、阪神北、東播磨、北播磨、中播磨、西播磨、但馬、丹波、淡路。
- `learning-common.css`、`learning-common.js` が先行共通処理。
- `meisan/` には `index.html`、`study.html`、`quiz1.html`、`quiz2.html`、`sources.html`、`meisan-data.js`。
- D3+TopoJSONで動的に図形とラベルを描画。見出し、長い郡名、神戸9区、市名追加表示などを維持。
- `SOURCE_LEDGER.md` は現ツリーに見当たらず、READMEや`meisan/sources.html`に出典の記録あり。追加調査前に一律の出典書式を強制しない。

## 3. 地図・ラベル実装に関する重要な差

| 論点 | 既存の確認事項 | V2への示唆 |
| --- | --- | --- |
| 形状の保存 | 西宮・宝塚・兵庫県はTopoJSONを持つ。芦屋・伊丹・尼崎の検索は主にSVGをHTMLに埋め込む | まず元データと公開SVGの差分を保存してから、形状を抽出する |
| 自動ラベル候補 | 兵庫県ではD3重心、他市は手動座標／Tooltip中心 | Polylabel等の候補点と衝突回避を独立モジュールで検証 |
| 複数区域 | 西宮の複数ラベル、芦屋の南浜町、尼崎の統合区域 | 1地名対複数ポリゴン、1地名対複数ラベルを許可 |
| 面がない地名 | 伊丹の2町名 | 点アンカー表示・検索・学習対象の例外を持たせる |
| クイズ | 西宮・宝塚・兵庫県で進行、採点、復習の画面実装が異なる | 共通ルールとUIを分離し、既存動作をテストで照合 |
| 操作 | 2026-10に5市で直接選択、ホイールB案など改善 | 操作仕様の退行テストが必要 |
| ライセンス | 町域のCODH CC BY 4.0を基本に、独自補足・交通・OSMが混在 | ファイルごとの出典と加工履歴を維持 |

## 4. サイト全体・GitHub Pagesの入口

- [Kussoon/kussoon.github.io](https://github.com/Kussoon/kussoon.github.io) の `CNAME` は `kussoon.com`。
- `local/index.html` が地域を探す入口。`maps/unified-bread-map.html` と `maps/unified-sweets-map.html` は市をまたぐ既存企画。
- [Kussoon/games](https://github.com/Kussoon/games) に `nishinomiya/` 下の旧／別系統ファイルが存在。最新の正本と誤認して統合・削除しない。
- 利用者向け階層、公開URL、GitHubフォルダ・リポジトリは独立して設計する。Pages設定と公開パスの詳細は正式移行前に再確認する。

## 5. 次工程までの未完了監査（意図的に保留）

- 141 HTMLの全画面・全リンク・全問題・全境界を実ブラウザで確認したわけではない。
- 全地域の正規町名、同名町、飛地、補正済み形状、丁目・コミュニティ所属を機械的に照合する必要がある。
- SVGからGeoJSON/TopoJSONへの復元で座標系・リング方向・穴・精度を維持できるか未検証。
- ホイールB案と選択操作が共通コードで完全再現可能か未検証。
- ラベル候補の成功率・衝突数・補正件数は**未測定**。
- 現行の出典・ライセンス表示とUmami/共通7リンクが、移行後も実際に維持されるかは後工程で確認する。

出典・実装を再参照する場合は上記のGitHub各mainと各 `SOURCE_LEDGER.md`、兵庫県READMEを正本として扱う。
