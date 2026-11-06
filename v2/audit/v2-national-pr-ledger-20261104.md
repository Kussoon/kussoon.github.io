# V2全国統合版・PR履歴／仕様照合台帳

2026-11-05補完: main `6bdd869` を基準に[PR #261](https://github.com/Kussoon/kussoon.github.io/pull/261)へ監査のみの更新を提出。現在の正式仕様は49件（A23/B12/C5/要確認9）。以下の初回集計/旧未確認記述は当時の履歴で、現在の判定は[正式仕様](v2-national-current-spec-20261104.md)と[補完追跡](#behavior-pr-trace)を参照する。

初回監査日（履歴）: 2026-11-04 UTC。基準main: `c69c970c982724b20d9a327e1fd1c223f356aebd`。監査開始時点のPRは #1〜#245、245件（240 merged、5 closed/unmerged）。この監査PR自体と開始後の変更は母数に含めない。

PR本文、全245件の変更ファイル一覧（計1027エントリ）、APIが返したpatch、現行の呼出し経路、関連文書・既存テストを照合した。本文・差分は一度取得して作業領域にキャッシュした。GitHub APIの全体Conversationコメント・inlineコメントは各0件だった。review submissions全件取得・会話外の実機承認原本の独立確認は未実施。実機承認は#31/#91/#129等のPR本文に記録された事実を根拠とし、本監査による実機合格とは呼ばない。

大容量TopoJSON等のpatchはAPIで省略されている。末尾に全省略ファイルを列挙する。全245件を同じ深さで動作検証したという意味ではない。形状差分未取得・実ブラウザ未確認・根拠不足は「要確認」のまま残す。

## 判定と集計単位

- A=正常反映（記載したテスト範囲内）。静的、DOMスタブ、合成イベント、実ブラウザを必ず区別。
- B=未反映／回帰疑い。意図的廃止と断定しない。
- C=後続PRで明示的に変更・保留された過去仕様。
- 要確認=現在への適用方針または確認材料が不足。
- 対象外=V2に無関係なサイト変更。未採用=未マージPRであり確定仕様に数えない。

初回の集約結果（履歴）は **40件**。A **21**／B **6**／C **4**／要確認 **9**。この40件は全PRの細部を40個で網羅し尽くしたとの主張ではなく、今回抽出・照合した主要な規則。Cの4件を除く36件が現行の要件・継承確認項目。次節のPR行数と合算しない。URL監査のA/B/Cは別の分類であり、この集計に加えない。

## 機能別の有効仕様と現行照合

現在49件（既存40＋追加9）の判定表は[確定仕様・確認状態](v2-national-current-spec-20261104.md)へ分離した。PR履歴と仕様単位の集計を混同しない。

## PRごとの履歴

各節の本文抜粋は当時の提案・制約を残す。現在有効な仕様は上のS-IDを優先する。差分欄は変更対象、現行経路欄は2026版が実際に呼ぶ部品を区別する。試作ページへの変更を自動的に全国版へ適用済みとしない。

### PR #1

- PR: [docs: GitHubでの安全な変更手順を記録（接続テスト）](https://github.com/Kussoon/kussoon.github.io/pull/1)／分類: サイト共通／対象外／マージ: 2026-10-28T01:46:28Z
- 当時の仕様・目的（本文抜粋）: ChatGPTからGitHubへの別ブランチ書き込み → Pull Request → main反映の一連の操作を検証します。 / `.github/kussoon-edit-workflow.md` を追加 / 既存の公開HTML、CSS、JavaScript、画像、Umami設定は変更しません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/1/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #2

- PR: [chore: ルート直下の旧都道府県HTML 10件を整理](https://github.com/Kussoon/kussoon.github.io/pull/2)／分類: サイト共通／対象外／マージ: 2026-10-28T01:54:13Z
- 当時の仕様・目的（本文抜粋）: ルート直下の `01hokkaido.html` 〜 `10gunma.html` は旧ビルド v0.3.20。 / 正式な `/driving/vehicleregistrationplates/region/` 内には v0.3.21 の対応ページと47都道府県分のファイルが存在。 / 主要なHTML/JS/XMLファイルでルート直下への直接参照は検出されず、都道府県一覧の相対リンクは正式ディレクトリ内を指す。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/2/files)（10ファイル）。主要変更先: `01hokkaido.html`、`02aomori.html`、`03iwate.html`、`04miyagi.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #3

- PR: [Add visitor-friendly sitemap page at /sitemap/](https://github.com/Kussoon/kussoon.github.io/pull/3)／分類: サイト共通／対象外／マージ: 2026-10-28T03:48:53Z
- 当時の仕様・目的（本文抜粋）: `/sitemap/index.html` を新規追加 / 既存の6カテゴリと主要公開コンテンツへのリンクを掲載 / トップページの青系デザインに合わせたレスポンシブ画面
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/3/files)（1ファイル）。主要変更先: `sitemap/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #4

- PR: [Hide in-progress maps from visitor sitemap](https://github.com/Kussoon/kussoon.github.io/pull/4)／分類: サイト共通／対象外／マージ: 2026-10-28T03:51:45Z
- 当時の仕様・目的（本文抜粋）: サイトマップから作業中の「西宮の川と橋」「ポケふたマップ」の2リンクのみ除去します。元ページやその他のリンク、Umamiには手を加えません。ブランチ上の全文再取得照合済み。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/4/files)（1ファイル）。主要変更先: `sitemap/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #5

- PR: [Hide Kanken and piano apps from visitor sitemap](https://github.com/Kussoon/kussoon.github.io/pull/5)／分類: サイト共通／対象外／マージ: 2026-10-28T03:55:09Z
- 当時の仕様・目的（本文抜粋）: サイトマップから制作中の漢検準1級アプリとピアノ運指練習の2リンクを削除します。「西宮の川と橋」は既に非掲載であることを確認済みです。対象アプリ自体には変更を加えません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/5/files)（1ファイル）。主要変更先: `sitemap/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #6

- PR: [Correct Akachin canonical and reading navigation](https://github.com/Kussoon/kussoon.github.io/pull/6)／分類: サイト共通／対象外／マージ: 2026-10-28T03:57:53Z
- 当時の仕様・目的（本文抜粋）: 赤チン記事のcanonicalを現行URL `/reading/showa/001akachin.html` に修正し、ヘッダーの「読み物」を `/reading/` へのリンクに変更します。本文・画像・既存の他リンクには変更なし。ブランチ上で全文一致を検証しました。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/6/files)（1ファイル）。主要変更先: `reading/showa/001akachin.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #7

- PR: [Refresh sitemap.xml for current published pages](https://github.com/Kussoon/kussoon.github.io/pull/7)／分類: サイト共通／対象外／マージ: 2026-10-28T04:10:47Z
- 当時の仕様・目的（本文抜粋）: 旧移転案内4 URLを検索エンジン用XMLから除外。存在をGitHub treeで確認済みの公開ページを追加（既存掲載URLの重複は除外）。制作中の漢検・ピアノ・川と橋・ポケふたは追加しません。元ファイルを変更するのは sitemap.xml のみ。全URLを一意化、更新ブランチを全文照合済み。旧 160 件 → 新 170 件。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/7/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #8

- PR: [Prepare operator information and Google Forms contact page (awaiting form URL)](https://github.com/Kussoon/kussoon.github.io/pull/8)／分類: サイト共通／対象外／マージ: 2026-10-28T06:06:02Z
- 当時の仕様・目的（本文抜粋）: 個人運営者情報の追記、共通フッター・サイトマップへのお問い合わせ導線、/contact/ ページの雛形を追加。**Googleフォームの実URLはまだ未設定で、問い合わせが送れません。フォームURLを受け取り正しいフォームリンクを組み込むまでマージ禁止。** 4ファイルのブランチ上の存在・表示用コード確認済み。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/8/files)（6ファイル）。主要変更先: `about/index.html`、`common/site-footer.js`、`contact/index.html`、`index.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #9

- PR: [Update privacy policy for contact form and Umami](https://github.com/Kussoon/kussoon.github.io/pull/9)／分類: サイト共通／対象外／マージ: 2026-10-28T07:27:44Z
- 当時の仕様・目的（本文抜粋）: Googleフォーム導入に伴う既存記述の修正と、問い合わせ情報の利用目的・Googleへの送信、Umamiアクセス解析の説明を追加。最終更新日を2026年10月28日に変更。privacy/index.htmlのみ変更、ブランチ上で全文照合済み。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/9/files)（1ファイル）。主要変更先: `privacy/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #10

- PR: [Add unified footer navigation and sitemap link](https://github.com/Kussoon/kussoon.github.io/pull/10)／分類: サイト共通／対象外／マージ: 2026-10-28T07:36:36Z
- 当時の仕様・目的（本文抜粋）: 共通フッターのリンク・スタイルを統一し、サイトマップとお問い合わせを追加。既存フッター内のバージョンや出典テキストは保持します。総合トップは共通スクリプトを使用します。その他のページも共通スクリプト経由で更新されます。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/10/files)（2ファイル）。主要変更先: `common/site-footer.js`、`index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #11

- PR: [Unify driving footer navigation while keeping section-specific links](https://github.com/Kussoon/kussoon.github.io/pull/11)／分類: サイト共通／対象外／マージ: 2026-10-28T07:48:06Z
- 当時の仕様・目的（本文抜粋）: /driving/ の下端ナビゲーションを「運転関連／ほかのコンテンツ／サイト共通案内」の3段構成に統一。ニュースページの専用フッターは維持し、不足していたサイトマップ・お問い合わせを追加します。本文や地図・ニュースデータに変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/11/files)（2ファイル）。主要変更先: `driving/index.html`、`driving/news/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #12

- PR: [Complete footer navigation on driving subpages](https://github.com/Kussoon/kussoon.github.io/pull/12)／分類: サイト共通／対象外／マージ: 2026-10-28T07:52:32Z
- 当時の仕様・目的（本文抜粋）: 運転カテゴリの下層8ページに「サイトマップ」「お問い合わせ」を追加します。7ページは既存の専用フッターにリンクを追記し、兵庫県ナンバーマップは出典・注意書き・版表示を維持して共通案内を追記します。全国47都道府県の大容量詳細HTMLは今回対象外です。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/12/files)（8ファイル）。主要変更先: `driving/news/20261012.html`、`driving/news/20261019.html`、`driving/news/guide/index.html`、`driving/news/japan-timeline/index.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #13

- PR: [Centralize footer link completion on Ideas, Local, and Reading pages](https://github.com/Kussoon/kussoon.github.io/pull/13)／分類: サイト共通／対象外／マージ: 2026-10-28T10:09:50Z
- 当時の仕様・目的（本文抜粋）: 通常ページ9件に共通フッター案内補完スクリプトを追加。既存のナビゲーションに不足リンクだけ追加し、新しいフッターを作らない方式で二重表示を避けます。既存の独自リンク、出典、バージョン、著作権表記は維持。ゲーム・地図機能は変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/13/files)（10ファイル）。主要変更先: `common/footer-links.js`、`ideas/001/index.html`、`ideas/002/index.html`、`ideas/003/index.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #14

- PR: [共通フッター補完の試験導入（広告説明・香川県の2ページ）](https://github.com/Kussoon/kussoon.github.io/pull/14)／分類: サイト共通／対象外／マージ: 2026-10-28T12:41:03Z
- 当時の仕様・目的（本文抜粋）: 広告説明と香川県ナンバープレート詳細で不足する共通情報リンクを、既存の `/common/footer-links.js` で補完する試験導入です。 / `advertising/index.html`：既存フッターナビに不足する4リンク（サイトマップ・このサイトについて・お問い合わせ・データ出典）を補完。本文の既存リンクも維持。 / `driving/vehicleregistrationplates/region/37kagawa.html`：末尾の既存ナビにサイトマップ・お問い合わせを補完。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/14/files)（2ファイル）。主要変更先: `advertising/index.html`、`driving/vehicleregistrationplates/region/37kagawa.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #15

- PR: [全国ナンバープレート詳細46ページの共通フッターリンクを補完](https://github.com/Kussoon/kussoon.github.io/pull/15)／分類: サイト共通／対象外／マージ: 2026-10-28T13:23:44Z
- 当時の仕様・目的（本文抜粋）: 香川県で検証済みの共通フッター補完方式を、残る46都道府県のナンバープレート詳細ページへ展開します。各ページで不足していたサイトマップ・お問い合わせを、既存の末尾ナビへ追加します。 / `driving/vehicleregistrationplates/region/` の県別詳細46HTMLのみ。導入済みの `37kagawa.html` と全国一覧 `index.html` は変更していません。 / 各ファイルの `</body>` 直前に `<script defer src="/common/footer-links.js"></script>` と改行を追加しただけです。各54バイト、合計2,484バイト増加。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/15/files)（46ファイル）。主要変更先: `driving/vehicleregistrationplates/region/01hokkaido.html`、`driving/vehicleregistrationplates/region/02aomori.html`、`driving/vehicleregistrationplates/region/03iwate.html`、`driving/vehicleregistrationplates/region/04miyagi.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #16

- PR: [通常ページ・独立地図5ページの共通フッターリンクを補完](https://github.com/Kussoon/kussoon.github.io/pull/16)／分類: サイト共通／対象外／マージ: 2026-10-28T13:52:34Z
- 当時の仕様・目的（本文抜粋）: ポケふた、統合パン屋・お菓子マップ、advertizingの広告説明、サイトマップの5ページを整備します。ポケふたの新設ナビには既存の固定ページ先頭ボタンとリンクが重ならない余白を設けています。お菓子マップの既存説明・出典の開閉部、パン屋マップのカテゴリ案内も維持します。 / `advertizing/index.html` / `local/pokefuta/index.html`
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/16/files)（5ファイル）。主要変更先: `advertizing/index.html`、`local/pokefuta/index.html`、`maps/unified-bread-map.html`、`maps/unified-sweets-map.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #17

- PR: [共通フッターと重複する既存の末尾リンクを整理](https://github.com/Kussoon/kussoon.github.io/pull/17)／分類: サイト共通／対象外／マージ: 2026-10-28T14:13:46Z
- 当時の仕様・目的（本文抜粋）: 共通スクリプトの二重実行ではなく、既存の末尾案内と共通ナビで同じリンクが併存していました。パン屋の旧footer-actions内トップと旧subnav内サイトマップ、お菓子の旧footer-actions内トップ、ポケふたのfooter直下トップを削除しました。 / 削除は同じfooter内で重複しているアンカーのみです。共通7リンクと、ページ上部の案内、地図操作、ページ先頭へ戻る操作、カテゴリ案内を維持します。フッター外の同一URLリンクは意図的な別導線として保持しました。共通スクリプトを含め既存JavaScript・CSSは一切変更していません。 / ローカル配信のChromiumで検証。同じ版のLeaflet等を使用し、外部地図タイルとUmami送信は遮断、現在地は模擬値です。公開環境・実機の監査ではありません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/17/files)（3ファイル）。主要変更先: `local/pokefuta/index.html`、`maps/unified-bread-map.html`、`maps/unified-sweets-map.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #18

- PR: [時計・タイマー2ページの設定メニューに共通案内とUmamiを追加](https://github.com/Kussoon/kussoon.github.io/pull/18)／分類: サイト共通／対象外／マージ: 2026-10-28T22:07:37Z
- 当時の仕様・目的（本文抜粋）: 時計設定メニューに共通7リンクを補完し、短い画面でもメニュー内部のスクロールで案内にアクセスできるようにします。時計・タイマー本体の表示領域と操作処理は変更しません。 / 既存 `.menu-info` に `site-links` クラスを追加し、未変更の `/common/footer-links.js` で不足するサイトマップ・このサイトについて・お問い合わせ・データ出典を補完。 / 既存のトップ・プライバシー・注意事項の案内、使い方リンク、著作権は保持。共通7リンクはメニュー内で各1件、案内領域は1組です。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/18/files)（2ファイル）。主要変更先: `ideas/001/clock.html`、`ideas/clock/clock.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #19

- PR: [Umami試験導入：サイトトップと時計説明の2ページ](https://github.com/Kussoon/kussoon.github.io/pull/19)／分類: サイト共通／対象外／マージ: 2026-10-28T22:53:52Z
- 当時の仕様・目的（本文抜粋）: Umami未導入の通常139ページへの展開に先立つ第1段階の試験導入です。このPRはサイトトップ `index.html` と時計説明 `ideas/clock/clock-guide.html` の2ページだけを変更します。構造の異なる地図・クイズ2ページはKussoon/nishinomiya側の別PRで試験します。 / 各HTMLのhead内で、依頼書の正本タグを1行だけ追加します。 / 既存公開ページ（https://kussoon.com/games/nishinomiya/north2.html、HTTP200）のsrcとWebsite IDとも一致します。既存JS・CSS・共通フッター・メタデータを変更せず、UTF-8とLFを維持します。元ファイルへ追加したバイト数は各118バイトです。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/19/files)（2ファイル）。主要変更先: `ideas/clock/clock-guide.html`、`index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #20

- PR: [トップページの似顔絵を新しい線画へ差し替え](https://github.com/Kussoon/kussoon.github.io/pull/20)／分類: サイト共通／対象外／マージ: 2026-10-29T01:14:27Z
- 当時の仕様・目的（本文抜粋）: 添付されたモノクロ似顔絵の輪郭をSVG化し、トップページの案内イラストだけを差し替えます。既存の画像は削除・変更せず、本文・その他のデザイン・Umamiタグは維持します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/20/files)（2ファイル）。主要変更先: `index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #21

- PR: [トップページをPCの画面幅に対応](https://github.com/Kussoon/kussoon.github.io/pull/21)／分類: サイト共通／対象外／マージ: 2026-10-29T01:28:33Z
- 当時の仕様・目的（本文抜粋）: PC（768px以上）でメイン幅を最大1080px、カテゴリカードを2〜3列、公開ページのリンクを2列にします。モバイル向け既存CSSは変えず、画像や文章、Umamiタグを保持します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/21/files)（1ファイル）。主要変更先: `index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #22

- PR: [地域トップのPC表示を2列のレイアウトに改善](https://github.com/Kussoon/kussoon.github.io/pull/22)／分類: サイト共通／対象外／マージ: 2026-10-29T05:41:12Z
- 当時の仕様・目的（本文抜粋）: PCではメインを最大960pxに広げ、地域カードを2列に配置します。案内と町名検索の幅を抑え、注目カードは全幅とします。700px未満では従来の表示を維持します。 / Chromiumで390・768・1024・1440pxの修正前後を確認。横はみ出しなし、390pxのカード配置は変更なし。 / 検索対象の市の切り替え、リンク先とインラインJavaScriptの維持を確認。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/22/files)（1ファイル）。主要変更先: `local/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #23

- PR: [docs(v2): 地域学習V2 第1弾・試験トップと設計基盤](https://github.com/Kussoon/kussoon.github.io/pull/23)／分類: ラベル・読み／基盤／マージ: 2026-10-30T02:07:34Z
- 当時の仕様・目的（本文抜粋）: 地域学習システムV2の安全な独立試験環境を /v2/ に立ち上げる。5市＋兵庫県の既存公開ページは変更しない。 / v2/index.html: 試験トップ。未実装V2機能へのリンクを作らず、各現行版へのみ案内 / v2/v2-national-audit-summary-20261104.md: 目的・運用ルール
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/23/files)（5ファイル）。主要変更先: `v2/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #24

- PR: [feat(v2): 芦屋市59町名のラベル自動配置・比較実験](https://github.com/Kussoon/kussoon.github.io/pull/24)／分類: ラベル・読み／基盤／マージ: 2026-10-30T02:26:01Z
- 当時の仕様・目的（本文抜粋）: 芦屋市の現行SVGの59町名・60地図面を維持して、手動配置と重心・Polylabel・簡易衝突回避の候補配置を比較する。V2専用試験エリアであり、既存の /ashiya/ は変更しない。 / `v2/data/ashiya/labels-source.json`: 町名検索の59個の名前付きSVG形状、現行全域図の59の手動ラベル座標。元Git blob SHA・出典を記録 / `v2/common/js/label-engine.js`: Polygon / MultiPolygon輪郭復元、重心、Polylabel、候補探索・簡易衝突回避、概算指標
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/24/files)（8ファイル）。主要変更先: `v2/ashiya/labels-app.js`、`v2/ashiya/labels.html`、`v2/common/js/label-engine.js`、`v2/data/ashiya/labels-source.json` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/docs/ashiya-label-test.md](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/docs/ashiya-label-test.md)、[v2/tests/label-engine.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/label-engine.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #25

- PR: [feat(v2): 芦屋市ラベルのズーム連動と表示範囲別メトリクス](https://github.com/Kussoon/kussoon.github.io/pull/25)／分類: ラベル・読み／基盤／マージ: 2026-10-30T02:46:54Z
- 当時の仕様・目的（本文抜粋）: 2026-10-30のiPhone実機スクリーンショット（自動配置・手動配置・拡大表示）では、文字サイズ14の自動配置は重複0組／区域外19件（概算）、現行手動配置は重複7組／区域外24件（概算）。ただし拡大後も「19件」の数値が変化せず、ズーム時のラベル再配置がなかった。 / 自動配置側のみ、地図倍率 z に対し見た目の文字倍率を z^0.4 とするオプションを追加。2倍ズーム時に文字は約1.32倍、4倍ズーム時は約1.74倍。オフにすれば従来の地図と文字が同じ倍率の動作に戻せる。 / ズーム操作が落ち着いてから130ms後、ラベルサイズに合わせて候補位置と重複・区域外評価を再計算。スクロール・ドラッグ中に毎フレーム重い計算をしない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/25/files)（5ファイル）。主要変更先: `v2/ashiya/labels-app.js`、`v2/ashiya/labels.html`、`v2/common/js/label-engine.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/docs/ashiya-label-test.md](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/docs/ashiya-label-test.md)、[v2/tests/label-engine.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/label-engine.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #26

- PR: [feat(v2): 芦屋市の画面ピクセル固定ラベルと縮尺別の表示整理](https://github.com/Kussoon/kussoon.github.io/pull/26)／分類: ラベル・読み／基盤／マージ: 2026-10-30T03:10:44Z
- 当時の仕様・目的（本文抜粋）: ユーザーのiPhone実機評価で、地図10倍時でも文字2.53倍では小さすぎることが判明。指数を調整するのではなく、マピオンなどのスマホ地図を参考に「画面上の文字サイズは一定、ズームで表示するラベルの数を調整する」方式を試作する。 / SVG viewBoxと実際の地図描画幅から変換して、町名ラベルの見た目をCSSピクセル単位で指定。文字サイズ12・14・16（初期値）・18・22pxから選択。 / 地図を拡大しても文字だけ不自然に巨大化／縮小しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/26/files)（5ファイル）。主要変更先: `v2/ashiya/labels-app.js`、`v2/ashiya/labels.html`、`v2/common/js/label-engine.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/docs/ashiya-label-test.md](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/docs/ashiya-label-test.md)、[v2/tests/label-engine.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/label-engine.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #27

- PR: [feat(v2): 芦屋市の地名ラベル表示優先順位・密度の比較](https://github.com/Kussoon/kussoon.github.io/pull/27)／分類: ラベル・読み／基盤／マージ: 2026-10-30T03:34:40Z
- 当時の仕様・目的（本文抜粋）: iPhoneのKussoon V2画面とマピオンのスマホ版を比較し、表示の改善方向を「固定ピクセル文字＋縮尺に応じたラベル選択」と定めた。今回は**地図データと文字の座標算出を変更せず**、表示するラベルの優先順位だけを試験する。 / 主な変更（5ファイル、すべて /v2/ 内） / `v2/common/js/label-engine.js`：従来の面積優先に加え、区域内の文字の収まり（9点近似）＋混雑度＋直前表示の安定性を考慮する「バランス」、競合の少ないラベル優先＋1→2件交換による「表示数重視」を実装。いずれも描画するラベル矩形同士の衝突を避ける。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/27/files)（5ファイル）。主要変更先: `v2/ashiya/labels-app.js`、`v2/ashiya/labels.html`、`v2/common/js/label-engine.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/docs/ashiya-label-test.md](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/docs/ashiya-label-test.md)、[v2/tests/label-engine.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/label-engine.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #28

- PR: [feat(v2): 芦屋市ラベルの2行配置・部分縮小を自動比較](https://github.com/Kussoon/kussoon.github.io/pull/28)／分類: ラベル・読み／基盤／マージ: 2026-10-30T03:56:07Z
- 当時の仕様・目的（本文抜粋）: 芦屋市の全域比較で、16pxラベルの「区域外」約27～28件（9点概算）を確認した。ユーザーから「東芦屋町・打出小槌町・六麓荘町などは2行化で改善しそう」との提案を受け、1行／2行／控えめ縮小を**地域データを変えず**に試作する。 / 主な変更（5ファイル、すべて /v2/ のみ） / `v2/common/js/label-engine.js`: 1行と2行の改行候補・候補点・任意の87.5%縮小を比較。文字矩形の9点区域内率、候補点からの距離、改行・縮小の軽いペナルティで選ぶ。日本語4字名を無理に中央で分割せず「東芦／屋町」等の不自然な分割を候補から外す。ただし辞書的な意味区切りは保証しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/28/files)（5ファイル）。主要変更先: `v2/ashiya/labels-app.js`、`v2/ashiya/labels.html`、`v2/common/js/label-engine.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/docs/ashiya-label-test.md](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/docs/ashiya-label-test.md)、[v2/tests/label-engine.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/label-engine.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #29

- PR: [feat(v2): 1行縮小の独立比較と自然な地名改行候補](https://github.com/Kussoon/kussoon.github.io/pull/29)／分類: ラベル・読み／基盤／マージ: なし（closed）
- 当時の仕様・目的（本文抜粋）: 2026-10-30のiPhone全域比較で「1行のみ」「2行のみ」「2行＋縮小」の効果を検証したところ、2行化と文字縮小の寄与が混在。また「六麓荘／町」「朝日／ヶ丘町」の不自然な改行が確認された。ユーザーの同意を得て第5弾の比較条件を整理する。 / `v2/ashiya/labels.html`：4モードに変更。「1行のみ（従来）」「1行＋必要時のみ少し縮小（初期値）」「自然に区切れる町名だけ2行」「自然な2行＋必要時のみ少し縮小」。 / `v2/ashiya/labels-app.js`：「1行＋縮小」では従来の自動候補座標を完全に固定し、**縮小の効果だけを切り分ける**。2行モードでは従来どおり候補座標を探せる。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/29/files)（5ファイル）。主要変更先: `v2/ashiya/labels-app.js`、`v2/ashiya/labels.html`、`v2/common/js/label-engine.js`。
- 後続変更: [#30](https://github.com/Kussoon/kussoon.github.io/pull/30) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 未採用（確定仕様ではない）
- 回帰テスト: [v2/docs/ashiya-label-test.md](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/docs/ashiya-label-test.md)、[v2/tests/label-engine.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/label-engine.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #30

- PR: [feat(v2): 芦屋市59町名の読み仮名切替と1行ラベル上下微調整](https://github.com/Kussoon/kussoon.github.io/pull/30)／分類: ラベル・読み／基盤／マージ: 2026-10-30T04:32:42Z
- 当時の仕様・目的（本文抜粋）: Yahoo!マップ「住所」レイヤーの拡大表示を参考に、「漢字のみ／漢字＋小さな読み仮名／ひらがなのみ」と「1行固定・ラベル重複時だけ上下へ半文字～1.5文字ずらす」を試す。西宮市の美作町のような難しい読みへの対応を見据え、地図形状と読み仮名データを分離する。 / 今回の変更（全8ファイル、すべて /v2/ 内） / `v2/data/ashiya/readings.json`: 既存 `Kussoon/ashiya/town-search.html` の読み59件を再利用。59町名との全件一致、ひらがな・出典・元Git blob SHAを記録。日本郵便の読み確認記録は芦屋リポジトリの `SOURCE_LEDGER.md` を参照。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/30/files)（8ファイル）。主要変更先: `v2/ashiya/readings-app.js`、`v2/ashiya/readings.html`、`v2/common/js/readable-labels.js`、`v2/data/ashiya/readings.json` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/readable-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/readable-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #31

- PR: [feat(v2): 町名の中心優先・全59件表示を標準にする（芦屋市）](https://github.com/Kussoon/kussoon.github.io/pull/31)／分類: ラベル・読み／基盤／マージ: 2026-10-30T05:05:38Z
- 当時の仕様・目的（本文抜粋）: ユーザーのiPhone実機確認では、楠町・平田町・親王塚町・月若町・西蔵町などが不必要に端へずれ、拡大するまで多数のラベルが現れない状態だった。ユーザーの明確な優先順位は「**重なっていてもそこに町名があると分かればよい。読めない場合は自分で拡大する**」「文字が境界をまたいでもよい」「端へ逃げるくらいなら町域の中心に置く」。 / 新しい標準の配置**：各町の幾何学的重心をラベルの中心とする。重心が町域外の場合だけ、区域内のPolylabelにフォールバック。芦屋市59町の重心はすべて町域内であることを確認。 / 全件表示が標準**：ラベル同士の重なりを理由に隠さない。59町名すべてを地図に描画し、読めないときは拡大して確認できるようにする。従来の衝突回避・間引きモードは比較用に残し、明示的にオンにしたときだけ有効。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/31/files)（5ファイル）。主要変更先: `v2/ashiya/readings-app.js`、`v2/ashiya/readings.html`、`v2/common/js/readable-labels.js`。
- 後続変更: [#32](https://github.com/Kussoon/kussoon.github.io/pull/32) → [#33](https://github.com/Kussoon/kussoon.github.io/pull/33) → [#34](https://github.com/Kussoon/kussoon.github.io/pull/34) → [#36](https://github.com/Kussoon/kussoon.github.io/pull/36) → [#38](https://github.com/Kussoon/kussoon.github.io/pull/38) → [#58](https://github.com/Kussoon/kussoon.github.io/pull/58) → [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S29=要確認
- 回帰テスト: [v2/tests/readable-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/readable-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #32

- PR: [feat(v2): くびれ・凹型町域の中心自動補正と縦長隣接町の上下調整](https://github.com/Kussoon/kussoon.github.io/pull/32)／分類: ラベル・読み／基盤／マージ: 2026-10-30T05:21:36Z
- 当時の仕様・目的（本文抜粋）: PR #31 で「町域中心・全59件表示・重なり許容」を標準にしたところ、従来より自然になった。一方、ユーザーのiPhone実機画像では、奥山のように**幾何学的重心が町域内でも細いくびれや別の区域に近くなる**問題、縦長の町が横に並ぶと文字同士が重なる問題が明確になった。 / 今回の変更（5ファイル、すべて /v2/ 内） / `readable-labels.js`：`safeInteriorCenter` を追加。重心が町域外にあるか、境界余裕がPolylabelの26%未満なら、重心〜Polylabel間の41点を実際の区域内判定で検査し、境界余裕35%以上を確保できるうち元の重心に最も近い点を選択。候補がなければPolylabelにフォールバック。正常な町域の中心は変えない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/32/files)（5ファイル）。主要変更先: `v2/ashiya/readings-app.js`、`v2/ashiya/readings.html`、`v2/common/js/readable-labels.js`。
- 後続変更: [#33](https://github.com/Kussoon/kussoon.github.io/pull/33) → [#34](https://github.com/Kussoon/kussoon.github.io/pull/34) → [#36](https://github.com/Kussoon/kussoon.github.io/pull/36) → [#38](https://github.com/Kussoon/kussoon.github.io/pull/38) → [#58](https://github.com/Kussoon/kussoon.github.io/pull/58) → [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S29=要確認
- 回帰テスト: [v2/tests/readable-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/readable-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #33

- PR: [fix(v2): 東芦屋町の一方向へのはみ出しを左右余裕の自動補正で改善](https://github.com/Kussoon/kussoon.github.io/pull/33)／分類: ラベル・読み／基盤／マージ: 2026-10-30T05:32:30Z
- 当時の仕様・目的（本文抜粋）: ユーザーのiPhone実機画像で、東芦屋町の漢字＋読みラベルが縮尺にかかわらず町域の左端に寄り、左側に常にはみ出すと指摘された。「それ以外は良好」のため既存の全件表示・中心優先・くびれ補正・縦長町の上下微調整を変更しない。 / `v2/common/js/readable-labels.js`：`safeInteriorCenter` の末尾に、**極端な左右余裕の非対称性**だけを解消する `balanceOneSidedAnchor` を追加。 / 町域の水平横断線との交点から、現在のアンカーが含まれる連続区域の左右余裕を計算。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/33/files)（3ファイル）。主要変更先: `v2/common/js/readable-labels.js`。
- 後続変更: [#34](https://github.com/Kussoon/kussoon.github.io/pull/34) → [#36](https://github.com/Kussoon/kussoon.github.io/pull/36) → [#38](https://github.com/Kussoon/kussoon.github.io/pull/38) → [#58](https://github.com/Kussoon/kussoon.github.io/pull/58) → [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S29=要確認
- 回帰テスト: [v2/tests/readable-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/readable-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #34

- PR: [feat(v2): 三日月・多枝・飛地に対応する汎用ラベル中心の比較実験](https://github.com/Kussoon/kussoon.github.io/pull/34)／分類: ラベル・読み／基盤／マージ: 2026-10-30T06:01:14Z
- 当時の仕様・目的（本文抜粋）: 芦屋市で完成候補となった「町域中心・1行・全件表示・境界／重複許容」を保ったまま、**三日月型、鹿児島県のような多枝／飛地、中央に穴のある形、西宮市の仁川町・一ケ谷町**などへ一般化する。 / `v2/common/js/readable-labels.js` に新しい `universalInteriorAnchor` を追加。既存の `safeInteriorCenter` は**変更せず維持**。 / 自然な重心は従来どおり保持。重心が外・極端な細いくびれにある場合だけ、主要面積の外周リング内を24×24格子＋4回の局所探索で二次元検索。「境界から十分な余裕がある点のうち、重心に近い点」を選ぶ。重心～Polylabelの直線上に探索を限定しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/34/files)（10ファイル）。主要変更先: `v2/ashiya/readings-app.js`、`v2/ashiya/readings.html`、`v2/common/js/readable-labels.js`、`v2/index.html` 他。
- 後続変更: [#36](https://github.com/Kussoon/kussoon.github.io/pull/36) → [#38](https://github.com/Kussoon/kussoon.github.io/pull/38) → [#58](https://github.com/Kussoon/kussoon.github.io/pull/58) → [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S29=要確認
- 回帰テスト: [v2/tests/fixtures/nishinomiya-irregular.json](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/fixtures/nishinomiya-irregular.json)、[v2/tests/universal-centers.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/universal-centers.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #35

- PR: [fix(v2): 漢字中心への読み仮名配置統一と若葉町の左右バランス補正](https://github.com/Kussoon/kussoon.github.io/pull/35)／分類: ラベル・読み／基盤／マージ: 2026-10-30T06:24:32Z
- 当時の仕様・目的（本文抜粋）: iPhoneの実機画像で次の2点が指摘された。 / 1. **楠町**：漢字＋読み仮名の2行全体を町域中心に置いていたため、漢字1行が不必要に上へずれている。 / 2. **若葉町**：左境界をまたいでいる一方、右には余裕がある。これは隣の高浜町の文字を避けて横へ移ったのではない（従来の上下微調整は縦移動のみ）。左右余裕の比が約0.473で、従来の補正閾値0.35には該当しなかったため。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/35/files)（5ファイル）。主要変更先: `v2/ashiya/readings-app.js`、`v2/ashiya/readings.html`、`v2/common/js/readable-labels.js`。
- 後続変更: [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) → [#144](https://github.com/Kussoon/kussoon.github.io/pull/144)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S26=B
- 回帰テスト: [v2/tests/readable-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/readable-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #36

- PR: [test(v2): 西宮市・鞍掛町／久保町・上ケ原七〜十番町を配置回帰テストに登録](https://github.com/Kussoon/kussoon.github.io/pull/36)／分類: ラベル・読み／基盤／マージ: 2026-10-30T06:53:12Z
- 当時の仕様・目的（本文抜粋）: ユーザーから「以前の西宮市の町名ラベルの重なり例も、今の規則の回帰テストとして覚えておいてほしい」という要望があった。会話の記憶だけでなく、GitHubの実データ・自動テスト・試験用画面に恒久的に記録する。 / 上ケ原七番町／八番町／九番町／十番町（地理データの正式表記は「上ケ原」） / `v2/tests/fixtures/nishinomiya-adjacent.json`：`Kussoon/nishinomiya/data/nishinomiya-towns.topojson` の町域形状と `town-search.html` の正本の読みを抽出して固定。鞍掛町・久保町の周辺19町域、上ケ原七〜十番町の周辺30町域。元Git blob SHAとCODH CC BY 4.0出典を記録。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/36/files)（7ファイル）。主要変更先: `v2/index.html`、`v2/nishinomiya/stagger-app.js`、`v2/nishinomiya/staggers.html`。
- 後続変更: [#38](https://github.com/Kussoon/kussoon.github.io/pull/38) → [#58](https://github.com/Kussoon/kussoon.github.io/pull/58) → [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S29=要確認
- 回帰テスト: [v2/tests/fixtures/nishinomiya-adjacent.json](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/fixtures/nishinomiya-adjacent.json)、[v2/tests/nishinomiya-staggers.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/nishinomiya-staggers.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #37

- PR: [feat(v2): 兵庫県49市町・区ラベルを学習地図とナンバー地域名地図で共通化](https://github.com/Kussoon/kussoon.github.io/pull/37)／分類: ラベル・読み／基盤／マージ: 2026-10-30T07:22:15Z
- 当時の仕様・目的（本文抜粋）: ユーザー要望に基づく地域学習V2第10弾。兵庫県の**40市町＋神戸市9区＝49区域**で、芦屋市・西宮市で好評だった中心優先・全件表示・最小限の自動上下調整を検証し、同じラベル配置を兵庫県ナンバープレート地域名マップの表示にも再利用する。47県全ページの一括置換はしない。 / `v2/data/hyogo/hyogo-city.topojson`: 既存 `Kussoon/hyogo/hyogo-city.topojson` の49区域をスナップショット保存。出典CODH『歴史的行政区域データセットβ版』／国土数値情報「行政区域データ」加工、CC BY 4.0。行政5桁コードを安定IDとする。 / `v2/common/js/topo-region-adapter.js`: 差分・反転Arc、複数ポリゴン・穴を含むTopoJSONを既存V2エンジンに渡せるSVG平面モデルへ変換。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/37/files)（12ファイル）。主要変更先: `v2/common/js/readable-labels.js`、`v2/common/js/topo-region-adapter.js`、`v2/data/hyogo/plate-assignment.json`、`v2/hyogo/labels-app.js` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/hyogo49-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/hyogo49-labels.test.cjs)、[v2/tests/readable-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/readable-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #38

- PR: [fix(v2): 兵庫県4市ラベルの局所左右中央と西宮市の南寄り配置](https://github.com/Kussoon/kussoon.github.io/pull/38)／分類: ラベル・読み／基盤／マージ: 2026-10-30T07:45:58Z
- 当時の仕様・目的（本文抜粋）: 兵庫県49区域の試験地図（市町村学習／ナンバー地域名表示共通）で、次の4市を改善する。 / 西宮市**：北側の広い部分に引っ張られているため、ラベルを南部の広い部分へ。 / 洲本市**：現在の縦位置のまま、左右の中央へ。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/38/files)（5ファイル）。主要変更先: `v2/common/js/readable-labels.js`、`v2/hyogo/labels-app.js`、`v2/hyogo/labels.html`。
- 後続変更: [#58](https://github.com/Kussoon/kussoon.github.io/pull/58) → [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S29=要確認
- 回帰テスト: [v2/tests/hyogo49-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/hyogo49-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #39

- PR: [feat(v2): 兵庫県ナンバープレート比較への専用入口を追加](https://github.com/Kussoon/kussoon.github.io/pull/39)／分類: ラベル・読み／基盤／マージ: 2026-10-30T09:24:58Z
- 当時の仕様・目的（本文抜粋）: V2の既存49区域共通ラベル試験を、ナンバープレート用途で直接開けるようにします。 / `v2/hyogo/labels.html?mode=plate` で用途選択を「ナンバープレート」に初期設定 / `v2/index.html` の兵庫県カードに専用入口を追加
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/39/files)（2ファイル）。主要変更先: `v2/hyogo/labels-app.js`、`v2/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #40

- PR: [fix(v2): 兵庫県の選択色を神戸・姫路の地域色と区別](https://github.com/Kussoon/kussoon.github.io/pull/40)／分類: ラベル・読み／基盤／マージ: 2026-10-30T09:29:38Z
- 当時の仕様・目的（本文抜粋）: 選択区域の黄色が姫路ナンバー地域のオレンジと紛らわしいため、選択中の区域を紫色＋濃い紫の輪郭に変更。`v2/hyogo/labels.html` のCSSのみ変更。正式版は変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/40/files)（1ファイル）。主要変更先: `v2/hyogo/labels.html`。
- 後続変更: [#80](https://github.com/Kussoon/kussoon.github.io/pull/80) → [#85](https://github.com/Kussoon/kussoon.github.io/pull/85) → [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S06=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #41

- PR: [feat(v2): 神戸市9区を「神戸市／北区」の2段表示に変更](https://github.com/Kussoon/kussoon.github.io/pull/41)／分類: ラベル・読み／基盤／マージ: 2026-10-30T09:34:09Z
- 当時の仕様・目的（本文抜粋）: V2兵庫県49区域地図で神戸市9区が区名だけになっていたため、上段「神戸市」、下段「北区」などの2行表示に変更。既存の区域中心座標を維持し、SVG tspanで表示。アクセシビリティ用の区域名も「神戸市北区」形式に変更。正式版には変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/41/files)（1ファイル）。主要変更先: `v2/hyogo/labels-app.js`。
- 後続変更: [#55](https://github.com/Kussoon/kussoon.github.io/pull/55) → [#57](https://github.com/Kussoon/kussoon.github.io/pull/57) → [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) → [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) → [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S24=B
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #42

- PR: [fix(v2): 神戸市9区の2段表示をキャッシュ更新で反映](https://github.com/Kussoon/kussoon.github.io/pull/42)／分類: ラベル・読み／基盤／マージ: 2026-10-30T09:37:53Z
- 当時の仕様・目的（本文抜粋）: `labels-app.js` はPR #41で更新済みだが、iPhoneで旧JSがキャッシュされる可能性があるため、V2 HTMLのscript URLにバージョンを付与。正式版変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/42/files)（1ファイル）。主要変更先: `v2/hyogo/labels.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #43

- PR: [fix(v2): 神戸市9区の正式名称で検索・選択表示を統一](https://github.com/Kussoon/kussoon.github.io/pull/43)／分類: ラベル・読み／基盤／マージ: 2026-10-30T09:44:10Z
- 当時の仕様・目的（本文抜粋）: V2兵庫県49区域の2段ラベルと検索・選択情報を整合。`神戸市北区` 等で検索でき、候補と選択詳細も正式名称で表示。従来の `北区` や行政区域コードも引き続き検索可能。学習・ナンバープレート両モード共通。JSキャッシュ更新。正式版は変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/43/files)（2ファイル）。主要変更先: `v2/hyogo/labels-app.js`、`v2/hyogo/labels.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #44

- PR: [fix(v2): 地図へ移動で兵庫県全域を表示して選択区域を強調](https://github.com/Kussoon/kussoon.github.io/pull/44)／分類: ラベル・読み／基盤／マージ: 2026-10-30T09:47:27Z
- 当時の仕様・目的（本文抜粋）: 検索から「地図へ移動」した際、従来の5倍拡大で神戸市の2段ラベルが密集する問題を解消。全域表示へ戻し、既存の紫色選択ハイライトを維持して地図までスクロール。通常のタップ選択・手動ズームは変更なし。V2内のみ。JSキャッシュ更新。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/44/files)（2ファイル）。主要変更先: `v2/hyogo/labels-app.js`、`v2/hyogo/labels.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #45

- PR: [feat(v2): 兵庫県49区域にひらがな部分一致・入力候補検索を追加](https://github.com/Kussoon/kussoon.github.io/pull/45)／分類: ラベル・読み／基盤／マージ: 2026-10-30T09:53:38Z
- 当時の仕様・目的（本文抜粋）: 西宮市町名検索の操作感に合わせ、V2兵庫県の検索窓直下に候補を表示。漢字・ひらがな・カタカナの部分一致で絞り込み、候補タップで全域地図へ移動し紫色選択。神戸市9区は市区名で表示。既存の正式版は変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/45/files)（2ファイル）。主要変更先: `v2/hyogo/labels-app.js`、`v2/hyogo/labels.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #46

- PR: [fix(v2): 神戸市9区の2段ラベルを含む実表示の重なり診断](https://github.com/Kussoon/kussoon.github.io/pull/46)／分類: ラベル・読み／基盤／マージ: 2026-10-30T09:58:05Z
- 当時の仕様・目的（本文抜粋）: V2兵庫県49区域で、従来の重なり指標は元の1行ラベル矩形を使用していたため、神戸市9区の2段表示の実際の重なりを正確に反映できませんでした。描画済SVGテキストのgetBBoxを計測し、2段ラベルも含めた重なり・境界またぎ・画面内表示の診断指標を更新します。現段階ではラベル位置を変更せず、判定のみ改善。正式版への変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/46/files)（2ファイル）。主要変更先: `v2/hyogo/labels-app.js`、`v2/hyogo/labels.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #47

- PR: [feat(v2): 西宮市全域322町名の自動配置試験ページを追加](https://github.com/Kussoon/kussoon.github.io/pull/47)／分類: ラベル・読み／基盤／マージ: 2026-10-30T10:09:40Z
- 当時の仕様・目的（本文抜粋）: 西宮市の既存町域TopoJSON（449図形）を丁目統合し、322町名グループとしてV2共通ラベルエンジンで全域表示する独立試験ページを追加。アンカー4方式・縦微調整3方式、文字サイズ、検索（漢字部分一致）、選択・全域戻り・ズーム、配置診断を用意。/v2/index.html からリンク。正式版 /nishinomiya/ 以下は変更しません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/47/files)（3ファイル）。主要変更先: `v2/index.html`、`v2/nishinomiya/full-map-app.js`、`v2/nishinomiya/full-map.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #48

- PR: [fix(v2): 西宮市全域322町名の丁目内部境界を結合](https://github.com/Kussoon/kussoon.github.io/pull/48)／分類: ラベル・読み／基盤／マージ: 2026-10-30T11:18:59Z
- 当時の仕様・目的（本文抜粋）: 西宮市全域V2試験ページで、丁目を町名グループにまとめながら内部の丁目境界線が残っていた問題を修正します。 / 既存の正式版 `Kussoon/nishinomiya/all-area-labeled.html` が使用している `topojson.merge(topology, members)` と同じ方式で、同名町の共有辺を除去して複合区域にします。元データ449図形→322町名グループは維持。実データで45グループに171本の共有Arcを確認済みです。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/48/files)（2ファイル）。主要変更先: `v2/nishinomiya/full-map-app.js`、`v2/nishinomiya/full-map.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #49

- PR: [fix(v2): 西宮市全域ラベルの最小16px・拡大文字と2方向の重なり調整](https://github.com/Kussoon/kussoon.github.io/pull/49)／分類: ラベル・読み／基盤／マージ: 2026-10-30T11:45:14Z
- 当時の仕様・目的（本文抜粋）: 西宮市全域V2（322町名）の実機指摘を受けた修正です。 / 文字サイズ選択肢を16/18/20/22/24pxへ変更し、初期値16px。最小16pxを維持 / ズームに合わせて画面上の文字サイズを徐々に拡大（16px初期→最大約27px）。正方形SVGと縦長viewBoxの`preserveAspectRatio`による実際の縮尺を基準に換算し、従来の文字縮小問題を修正
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/49/files)（3ファイル）。主要変更先: `v2/common/js/collision-refinement.js`、`v2/nishinomiya/full-map-app.js`、`v2/nishinomiya/full-map.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #50

- PR: [fix(v2): 西宮市全域の文字サイズと密集町名ラベルの配置を改良](https://github.com/Kussoon/kussoon.github.io/pull/50)／分類: ラベル・読み／基盤／マージ: なし（closed）
- 当時の仕様・目的（本文抜粋）: ※ PR #49が先にマージされ、16px・拡大字形・汎用上下左右調整の実装が正式にV2へ入りました。本PRはそれと重複する変更に追加の「ラベル2件同時移動」の未採用実験を含みます。追加実験は一部の倍率で他ラベルの重なりを増やすケースがあったため安全のため未マージとし、本PRを閉じます。再検証する場合はmainから独立したPRを作成してください。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/50/files)（3ファイル）。主要変更先: `v2/common/js/collision-refinement.js`、`v2/nishinomiya/full-map-app.js`、`v2/nishinomiya/full-map.html`。
- 後続変更: [#49](https://github.com/Kussoon/kussoon.github.io/pull/49) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 未採用（確定仕様ではない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #51

- PR: [fix(v2): 西宮市の最大拡大文字を18pxに抑え、ラベル重なりを再改善](https://github.com/Kussoon/kussoon.github.io/pull/51)／分類: ラベル・読み／基盤／マージ: 2026-10-30T12:01:16Z
- 当時の仕様・目的（本文抜粋）: 西宮市全域322町名のV2について、最大拡大時に文字が過大（旧設定初期16pxで約27px）となり、移動できる範囲を超えてラベルが重なる問題を修正します。 / 標準16pxは維持し、最大18倍拡大時の標準フォントを約18pxで抑制（利用者が18〜24pxを指定した場合は選択値を尊重）。 / 画面pxとSVG viewBoxの比率計算は既存修正を維持。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/51/files)（2ファイル）。主要変更先: `v2/nishinomiya/full-map-app.js`、`v2/nishinomiya/full-map.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #52

- PR: [feat(v2): 芦屋・西宮・兵庫県の共通ラベル配置ベンチマークを追加](https://github.com/Kussoon/kussoon.github.io/pull/52)／分類: ラベル・読み／基盤／マージ: 2026-10-30T12:14:37Z
- 当時の仕様・目的（本文抜粋）: 全国展開できるV2ラベル配置規則を検証するため、芦屋市59町名・西宮市322町名・兵庫県49区域を同一尺度で評価できる試験ページを追加します。 / 追加 `v2/benchmark/index.html` と `benchmark-app.js`。V2トップにもリンクを追加します。 / 正式版への反映なし。既存のV2地図エンジン・各地域試験ページの挙動も一切変更しません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/52/files)（3ファイル）。主要変更先: `v2/benchmark/benchmark-app.js`、`v2/benchmark/index.html`、`v2/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/benchmark/benchmark-app.js](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/benchmark/benchmark-app.js)、[v2/benchmark/index.html](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/benchmark/index.html)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #53

- PR: [feat(v2): 全国市区町村共通モデルと関西198市町村・富士山県境横断マップ](https://github.com/Kussoon/kussoon.github.io/pull/53)／分類: ラベル・読み／基盤／マージ: 2026-10-30T12:51:23Z
- 当時の仕様・目的（本文抜粋）: 全国市町村マップを最初から想定したV2共通基盤を実装します。既存の公開済み学習・ナンバープレートページには触れません。 / `/v2/national/` — 共通表示ページ。関西2府4県、山梨・静岡の切替と、市町村／行政区単位表示、富士山ナンバーの広域選択を実装。 / `/v2/common/js/national-boundaries.js` — 緯度経度の全国共通投影、行政区域コードに基づく地域モデル、政令指定都市の集約、県境を越えるナンバープレート地域コードの集合管理。町名固有の手動配置なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/53/files)（15ファイル）。主要変更先: `v2/common/js/national-boundaries.js`、`v2/data/national/catalog.json`、`v2/index.html`、`v2/national/index.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/national-boundaries.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-boundaries.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #54

- PR: [feat(v2): 全国市区町村マップの土台—関西198市町村と県境をまたぐ富士山ナンバー](https://github.com/Kussoon/kussoon.github.io/pull/54)／分類: ラベル・読み／基盤／マージ: なし（closed）
- 当時の仕様・目的（本文抜粋）: PR #53 が同じ元ブランチから先にmainへマージされており、このPRは共通部分が重複して競合しました。追加の2段ラベル表示・正式なデータ出典記載・テスト正規表現修正はmainから新しいブランチを切って独立したPRに移したため、本PRは未マージで閉じます。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/54/files)（15ファイル）。主要変更先: `v2/common/js/national-boundaries.js`、`v2/data/national/catalog.json`、`v2/index.html`、`v2/national/index.html` 他。
- 後続変更: [#53](https://github.com/Kussoon/kussoon.github.io/pull/53) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 未採用（確定仕様ではない）
- 回帰テスト: [v2/tests/national-boundaries.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-boundaries.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #55

- PR: [fix(v2): 全国マップ政令市の市名・区名2段表示と試験データ監査](https://github.com/Kussoon/kussoon.github.io/pull/55)／分類: ラベル・読み／基盤／マージ: 2026-10-30T12:56:57Z
- 当時の仕様・目的（本文抜粋）: 先行PR #53（全国市区町村マップ共通モデル）の追加品質修正です。変更はV2の3ファイルのみ。 / 政令市の区名（例：神戸市北区、大阪市北区）を『市名／区名』の2段に分け、重複・混同を防止します。ラベルの位置決定・重なり判定は実際の2段文字矩形で行い、個別区の手動座標補正は追加しません。 / テストコードの5桁行政コード正規表現を修正（元の正規表現は二重エスケープで実行時にコードを認識できませんでした）。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/55/files)（3ファイル）。主要変更先: `v2/national/index.html`、`v2/national/national-app.js`。
- 後続変更: [#57](https://github.com/Kussoon/kussoon.github.io/pull/57) → [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) → [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) → [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S24=B
- 回帰テスト: [v2/tests/national-boundaries.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-boundaries.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #56

- PR: [fix(v2): 全国・兵庫マップの郡名表示、初期文字の縮小、ナンバー地図の非タップ化](https://github.com/Kussoon/kussoon.github.io/pull/56)／分類: ラベル・読み／基盤／マージ: 2026-10-30T13:30:47Z
- 当時の仕様・目的（本文抜粋）: V2試験版のみ。`/v2/national/`、`/v2/hyogo/labels.html` と共通の全国データ解釈・回帰テストに限定。正式版・既存47都道府県のナンバープレートHTMLは変更しません。 / 1. **郡名付き町村名を自動生成**：N03_003が「郡」で終わる町村では`fullName=郡名＋町村名`とし、例：`川辺郡猪名川町`、`神崎郡神河町`、`南都留郡富士河口湖町`。データ上の短い`name`と5桁行政コードは維持。全国V2の地図ラベル・検索・選択表示だけでなく、兵庫県49区域のV2にも適用。ラベル幅の計測も郡名込みに変更。 / 2. **全国マップの標準フォント**：初期16pxから15px、最大拡大時約18pxから17pxへ小幅調整（西宮町名V2の初期16pxは変更なし）。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/56/files)（8ファイル）。主要変更先: `v2/common/js/national-boundaries.js`、`v2/hyogo/labels-app.js`、`v2/hyogo/labels.html`、`v2/national/index.html` 他。
- 後続変更: [#57](https://github.com/Kussoon/kussoon.github.io/pull/57) → [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) → [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) → [#226](https://github.com/Kussoon/kussoon.github.io/pull/226)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S25=B
- 回帰テスト: [v2/tests/hyogo49-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/hyogo49-labels.test.cjs)、[v2/tests/national-boundaries.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-boundaries.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #57

- PR: [fix(v2): タッチ時の不要な区域輪郭を抑制し、郡／町村を全国共通の2段ラベルへ](https://github.com/Kussoon/kussoon.github.io/pull/57)／分類: ラベル・読み／基盤／マージ: 2026-10-30T13:54:15Z
- 当時の仕様・目的（本文抜粋）: iPhoneの関西市町村V2で、タップせずに指が触れただけで濃い輪郭線が残る問題、および郡に属する町村名を市／区と同じ2段にする要望に対応します。 / 全国V2 CSSの `.land:hover`（無条件指定）を廃止し、`@media (hover:hover) and (pointer:fine)` の内側だけに変更。タッチ時の非意図的なSVGフォーカス輪郭も抑制しつつ、キーボードの `:focus-visible` は保持します。意図的に選択した区域の紫色表示は残します。 / 新しい共通 `v2/common/js/administrative-labels.js` で、地図ラベルを「郡／町村」「政令市／区」の2段表示に統一。検索用の正式名称（例：川辺郡猪名川町）と実際のSVG2段ラベルを分離します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/57/files)（11ファイル）。主要変更先: `v2/benchmark/benchmark-app.js`、`v2/benchmark/index.html`、`v2/common/js/administrative-labels.js`、`v2/hyogo/labels-app.js` 他。
- 後続変更: [#60](https://github.com/Kussoon/kussoon.github.io/pull/60) → [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) → [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) → [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238) → [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S24=B, S25=B, S37=要確認
- 回帰テスト: [v2/benchmark/benchmark-app.js](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/benchmark/benchmark-app.js)、[v2/benchmark/index.html](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/benchmark/index.html)、[v2/tests/administrative-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/administrative-labels.test.cjs)、[v2/tests/hyogo49-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/hyogo49-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #58

- PR: [feat(v2): 全国市町村ラベルに区域内適合度を評価する自動配置を追加](https://github.com/Kussoon/kussoon.github.io/pull/58)／分類: ラベル・読み／基盤／マージ: 2026-10-30T14:37:21Z
- 当時の仕様・目的（本文抜粋）: 全国市区町村マップV2で、中心点が区域内でも文字全体が隣接自治体へはみ出すケースに対応します。 / 新規共通部品 `v2/common/js/region-fit.js`：ラベル文字矩形の5×5点を区域の内外と照合して区域内適合率を推定。元の中心・安全中心・上下左右／斜め・区域内部の複数候補を形状から生成し、重なり件数を増やさず適合率が改善する場合だけ移動します。特定町名の固定座標なし。 / `v2/national/` の市町村・市区町村表示で、拡大4倍以上に限定して既存衝突回避のあとに追加適用。全域の縮小表示は変更なし、ユーザー実機確認済みの「富士山」ナンバープレートモードも変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/58/files)（5ファイル）。主要変更先: `v2/common/js/region-fit.js`、`v2/national/index.html`、`v2/national/national-app.js`。
- 後続変更: [#59](https://github.com/Kussoon/kussoon.github.io/pull/59) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S29=要確認
- 回帰テスト: [v2/tests/region-fit.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/region-fit.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #59

- PR: [fix(v2): 市区町村ラベルの四辺と境界の余白を自動評価し、はみ出しを改善](https://github.com/Kussoon/kussoon.github.io/pull/59)／分類: ラベル・読み／基盤／マージ: 2026-10-30T15:04:05Z
- 当時の仕様・目的（本文抜粋）: 関西市町村V2で「串本町」「米原市」「神河町」のように、ラベルの中心は区域内でも文字の端が境界線に接する／隣の町にはみ出すケースを、自治体名を使わない共通規則で改善します。 / `v2/common/js/region-fit.js`: 従来のラベル内部5×5（25点）判定に加え、ラベル矩形の上下左右を各5点で走査し、境界までの符号付き最小余白を評価。文字の端だけのはみ出しを検出して、既存の上下左右・斜めの候補から安全な位置を選びます。 / 既存の配置を損ねないため、全国市区町村モードでは **従来の適合度処理を第1段階として完全維持**し、拡大6倍以上でだけ第2段階の余白調整を追加。4〜6倍未満、全域、**富士山ナンバーモードは従来どおり**。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/59/files)（5ファイル）。主要変更先: `v2/common/js/region-fit.js`、`v2/national/index.html`、`v2/national/national-app.js`。
- 後続変更: [#146](https://github.com/Kussoon/kussoon.github.io/pull/146)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S29=要確認
- 回帰テスト: [v2/tests/region-fit.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/region-fit.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #60

- PR: [feat(v2): 全国市区町村に漢字→読み仮名の交互表示と読み検索を実装](https://github.com/Kussoon/kussoon.github.io/pull/60)／分類: ラベル・読み／基盤／マージ: 2026-10-30T15:34:13Z
- 当時の仕様・目的（本文抜粋）: 政令指定都市の区は **「神戸市／こうべし／中央区／ちゅうおうく」** の4行にします。郡付き町村も「郡名／その読み／町村名／その読み」の4行、通常の市町村は漢字／読みの2行です。読み仮名は漢字の62%の大きさにします。 / `code4fukui/localgovjp` のCC0データを、既存の2021年試験境界の5桁行政コード＋市区町村漢字名称で照合し、8府県の315行政区域と政令指定市の親コード6件、計 **321件** の読みを追加しました。 / N03_003の郡名と対応する45種類の読みを別JSONに保存。漢字＋読みの各ペアを必ず交互表示します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/60/files)（7ファイル）。主要変更先: `v2/common/js/national-readings.js`、`v2/data/national/county-readings.json`、`v2/data/national/municipality-readings.json`、`v2/national/index.html` 他。
- 後続変更: [#61](https://github.com/Kussoon/kussoon.github.io/pull/61) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S24=B, S25=B, S26=B, S28=A
- 回帰テスト: [v2/tests/national-readings.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-readings.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #61

- PR: [feat(v2): 全国市区町村マップに漢字→読みの交互表示を追加](https://github.com/Kussoon/kussoon.github.io/pull/61)／分類: ラベル・読み／基盤／マージ: 2026-10-30T15:36:50Z
- 当時の仕様・目的（本文抜粋）: 市町村地図V2の漢字ラベルに正確なひらがなの読みを付加。指定の順番は**神戸市／こうべし／中央区／ちゅうおうく**で、郡に属する町村も同様に**神崎郡／かんざきぐん／神河町／かみかわちょう**と表示する。 / 8府県の試験用行政区域（関西2府4県、山梨・静岡）に対し、5桁自治体コードと漢字名の両一致を確認した `municipality-readings.json` 321件（315行政区域＋政令市親コード6件）を追加。出典は code4fukui/localgovjp（CC0）。 / N03_003 の郡名45件について独立した `county-readings.json` を整備。郡名読みは正式版移行時に再監査する。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/61/files)（7ファイル）。主要変更先: `v2/common/js/national-readings.js`、`v2/data/national/county-readings.json`、`v2/data/national/municipality-readings.json`、`v2/national/index.html` 他。
- 後続変更: [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) → [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) → [#226](https://github.com/Kussoon/kussoon.github.io/pull/226)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S24=B, S25=B, S28=A
- 回帰テスト: [v2/tests/national-readings.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-readings.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #62

- PR: [fix(v2): 富士山ナンバーモードにも市町村と地域名の読み仮名を表示](https://github.com/Kussoon/kussoon.github.io/pull/62)／分類: ラベル・読み／基盤／マージ: 2026-10-30T15:50:32Z
- 当時の仕様・目的（本文抜粋）: 全国市区町村V2の読み仮名実装で、富士山ナンバー表示だけ読み仮名が無効化されていた不一致を修正します。 / ナンバープレートモードの市町村名にも、関西と同じ「漢字→小さいひらがな」を表示。郡名・政令指定都市の区は4行表示を保ちます。 / 地域名自体も「富士山／ふじさん」の2行表示に。既存のナンバー区域（山梨7市町村＋静岡5市町）、配色、県境をまたぐ表示、市町村タップ不要の仕様は維持します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/62/files)（5ファイル）。主要変更先: `v2/data/national/catalog.json`、`v2/national/index.html`、`v2/national/national-app.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/national-readings.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-readings.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #63

- PR: [feat(v2): 中国地方5県と関西・中国11府県の全国市区町村マップ試験](https://github.com/Kussoon/kussoon.github.io/pull/63)／分類: ラベル・読み／基盤／マージ: 2026-10-30T16:14:23Z
- 当時の仕様・目的（本文抜粋）: 全国市区町村マップV2を、中国地方（鳥取・島根・岡山・広島・山口）の5県へ拡張し、関西2府4県とつながる同一投影の11府県広域表示を追加します。従来のラベル自動配置／漢字＋読み仮名／県境横断の共通エンジンを再利用し、自治体別の手動座標は追加しません。 / 2021年国土数値情報N03を加工した SmartNews SMRI 1％簡略化TopoJSONを、中国5県（コード31–35）の試験データとして追加。 / 「中国地方5県」107市町村／117市区町村（岡山市4区・広島市8区を統合／分離）。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/63/files)（14ファイル）。主要変更先: `v2/data/national/catalog.json`、`v2/data/national/county-readings.json`、`v2/data/national/municipality-readings.json`、`v2/index.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/national-boundaries.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-boundaries.test.cjs)、[v2/tests/national-readings.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-readings.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #64

- PR: [feat(v2): 四国4県と中国・四国／西日本広域マップの試験データ追加](https://github.com/Kussoon/kussoon.github.io/pull/64)／分類: ラベル・読み／基盤／マージ: 2026-10-30T22:16:53Z
- 当時の仕様・目的（本文抜粋）: 四国（徳島・香川・愛媛・高知）を既存の全国市区町村V2共通エンジンへ追加します。正式版は変更しません。 / 2021年基準、1%簡略化TopoJSONの四国4県（95区域）を追加 / 「四国4県」95/95、「中国＋四国9県」202/212、「関西＋中国＋四国15府県」400/457（市町村統合／行政区別）を選択可能に
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/64/files)（13ファイル）。主要変更先: `v2/data/national/catalog.json`、`v2/data/national/county-readings.json`、`v2/data/national/municipality-readings.json`、`v2/index.html` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/national-boundaries.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-boundaries.test.cjs)、[v2/tests/national-readings.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-readings.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #65

- PR: [fix(v2): 広域地図で18倍以上に拡大できない制限を修正](https://github.com/Kussoon/kussoon.github.io/pull/65)／分類: 地図操作／マージ: 2026-10-30T22:26:28Z
- 当時の仕様・目的（本文抜粋）: 関西＋中国＋四国15府県で市町村を選択・拡大していると、従来の `bounds.w/18` 固定上限で拡大が止まる。市町村の選択そのものが上限を変更するわけではなく、広域図の初期範囲が大きいため18倍では足りない。 / 関西＋中国＋四国15府県：最大96倍 / 中国＋四国9県、関西＋中国11府県：最大72倍
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/65/files)（4ファイル）。主要変更先: `v2/national/index.html`、`v2/national/national-app.js`。
- 後続変更: [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) → [#224](https://github.com/Kussoon/kussoon.github.io/pull/224) → [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S23=B
- 回帰テスト: [v2/tests/national-zoom.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-zoom.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #66

- PR: [feat(v2): 全国市区町村のラベル表示密度を比較する独立試験ページ](https://github.com/Kussoon/kussoon.github.io/pull/66)／分類: ラベル・読み／基盤／マージ: 2026-10-31T10:52:36Z
- 当時の仕様・目的（本文抜粋）: 15府県・400市町村を全件＋読み仮名で表示した際の重なりを、縮尺連動・衝突回避の自然な表示と比較検証する。 / `/v2/national/density.html`：独立した比較ページ（初期表示は15府県） / `density-app.js`：既存 `national-app.js` から派生した試験専用画面処理（本家の全国マップは変更しない）
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/66/files)（6ファイル）。主要変更先: `v2/index.html`、`v2/national/density-app.js`、`v2/national/density-labels.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/national-density.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-density.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #67

- PR: [fix(v2): 密度比較地図の空白分布・選択情報・解除操作を改善](https://github.com/Kussoon/kussoon.github.io/pull/67)／分類: ラベル・読み／基盤／マージ: 2026-10-31T11:44:34Z
- 当時の仕様・目的（本文抜粋）: 表示密度「多め」でも大きな空白が残る原因の一つは、既存のラベル位置だけで衝突判定し、別の配置候補を試さず非表示にしていたことです。 / 広域比較地図で、既存位置に加えて各区域のpolylabel内部点を候補に使用し、画面内の格子を先に埋める配置を実験。重ならない候補を残し、追加ラベルを分散します。 / タップ選択の詳細表示を正式地名・読み・都道府県優先へ変更し、コードは補足欄へ移動。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/67/files)（5ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density-labels.js`、`v2/national/density.html`。
- 後続変更: [#69](https://github.com/Kussoon/kussoon.github.io/pull/69) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: [v2/tests/national-density.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-density.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #68

- PR: [fix(v2): 拡大途中でも空いた町域の地名を早めに表示](https://github.com/Kussoon/kussoon.github.io/pull/68)／分類: ラベル・読み／基盤／マージ: 2026-10-31T11:51:48Z
- 当時の仕様・目的（本文抜粋）: 15府県の比較地図で、拡大途中の赤丸箇所に地名が出ず、「多め」でも大きな空白が続く。原因は表示数の固定上限と、町域の代表ラベル位置が画面外にあるときに可視部分へ配置し直さない判定。 / 自然表示の「標準」「多め」は全体の表示件数上限を撤廃し、文字同士が重ならない候補を順次表示。少なめのみ上限を維持。 / 各行政ポリゴンと現在表示範囲の交差領域を評価し、5×5の候補点を実際の区域内部から選ぶ。元のラベル位置・polylabelが画面外でも可視部分に地名を置ける。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/68/files)（4ファイル）。主要変更先: `v2/national/density-labels.js`、`v2/national/density.html`。
- 後続変更: [#69](https://github.com/Kussoon/kussoon.github.io/pull/69) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: [v2/tests/national-density.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-density.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #69

- PR: [feat(v2): 市町村ラベル全件表示のA/B比較（固定配置・軽い位置調整）](https://github.com/Kussoon/kussoon.github.io/pull/69)／分類: ラベル・読み／基盤／マージ: 2026-10-31T12:19:17Z
- 当時の仕様・目的（本文抜粋）: 旧・自然な表示の間引き方式では広域地図に不自然な空白が生じ、可視範囲内で位置を動かすと名称が不自然な場所へ飛ぶ場合があった。西宮市全域町名図のような原則全件表示を検証する。 / A：全市町村のラベルを常時表示し、各区域の polylabel 内部代表点に固定（衝突調整なし） / B：同じ代表点を基準に、文字が重なる場合だけ最大8画面px相当の微調整を試行。元のポリゴン内部で重なりが改善するときのみ移動
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/69/files)（5ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density-labels.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/national-density.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-density.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #70

- PR: [feat(v2): 全件小文字表示と地図右上の4操作ボタンを試作](https://github.com/Kussoon/kussoon.github.io/pull/70)／分類: 地図操作／マージ: 2026-10-31T12:36:09Z
- 当時の仕様・目的（本文抜粋）: 西宮市の全域町名図に近い、全市町村名が初期から小さく見え、拡大に応じて文字が読みやすくなる表示を15府県の比較ページで検証する。 / 比較ページのA/B全件表示で、初期約7pxからズームに応じて最大18pxまで緩やかに拡大（1倍7、2倍9.6、4倍12.2、8倍14.8、16倍17.4） / A/Bは全件表示のままで、文字が重なることも許容する。旧・間引きモードのフォントサイズは変更しない
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/70/files)（4ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#217](https://github.com/Kussoon/kussoon.github.io/pull/217) → [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S22=B
- 回帰テスト: [v2/tests/national-density.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-density.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #71

- PR: [feat(v2): 市区町村ラベルを南北中央・東西中央へ初期固定配置](https://github.com/Kussoon/kussoon.github.io/pull/71)／分類: ラベル・読み／基盤／マージ: 2026-10-31T12:54:36Z
- 当時の仕様・目的（本文抜粋）: 宝塚市・西宮市など南北に長い自治体で、Polylabelをそのまま置くと上寄りになりやすい問題を改善する。ユーザー希望の「A案・全件表示・小文字・位置固定」を維持する。 / 試験ページの新しい初期設定「A：南北中央＋東西中央・初期だけ補正」を追加 / 区域外接矩形の南北中央の水平切断から、内部の左右中央を計算。飛地・穴は実際のポリゴン内判定で確認し、必要なら近傍断面・Polylabelへフォールバック
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/71/files)（5ファイル）。主要変更先: `v2/national/centered-labels.js`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#79](https://github.com/Kussoon/kussoon.github.io/pull/79) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #72

- PR: [feat(v2): 西宮市4町で複数水平断面のラベル候補を比較](https://github.com/Kussoon/kussoon.github.io/pull/72)／分類: ラベル・読み／基盤／マージ: 2026-10-31T13:09:54Z
- 当時の仕様・目的（本文抜粋）: すみれ台・宝生ケ丘・仁川町・一ケ谷町の変形町域で、Polylabelと南北中央、および南北中央付近の複数水平断面から自然なラベル位置を選ぶ試験を行う。 / `/v2/nishinomiya-four-town-test/` / 4町の既存西宮市TopoJSONを同一ドメインから読み込み、丁目ごとに分かれているデータは町名に統合
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/72/files)（4ファイル）。主要変更先: `v2/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/nishinomiya-four-town-test/v2-national-audit-summary-20261104.md](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/nishinomiya-four-town-test/v2-national-audit-summary-20261104.md)、[v2/nishinomiya-four-town-test/index.html](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/nishinomiya-four-town-test/index.html)、[v2/nishinomiya-four-town-test/pilot.js](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/nishinomiya-four-town-test/pilot.js)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #73

- PR: [feat(v2): 複数水平断面で宝塚・西宮・神戸・京都のラベル位置を比較](https://github.com/Kussoon/kussoon.github.io/pull/73)／分類: ラベル・読み／基盤／マージ: 2026-10-31T13:22:14Z
- 当時の仕様・目的（本文抜粋）: 西宮市4町の実機比較で良好だった「複数水平断面方式」を広域市町村マップに試験導入し、宝塚市・西宮市・神戸市・京都市の位置を従来の南北中央方式と比較する。 / 南北中央の上下30%を61本の水平断面で調べ、区域内部の東西中央から表示候補を選ぶ新規 `pointMulti` を追加 / その断面の横幅と南北中央への距離で候補を評価し、初期のラベル重なり補正でYが変わった際は、その最終YでXを再計算
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/73/files)（5ファイル）。主要変更先: `v2/national/centered-labels.js`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#79](https://github.com/Kussoon/kussoon.github.io/pull/79) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #74

- PR: [feat(v2): 水平中央固定と縦断面中央のラベル配置を比較](https://github.com/Kussoon/kussoon.github.io/pull/74)／分類: ラベル・読み／基盤／マージ: 2026-10-31T13:59:11Z
- 当時の仕様・目的（本文抜粋）: 全件表示を維持しつつ、形の細い西宮市のような区域でも南北中央を優先する。神河町のような変形区域では、水平断面のX位置で縦方向の中心を選ぶ方式も比較する。 / 新案1「南北中央の水平断面」：市域の最北・最南から決めた中央Yの水平断面について、実際に市域内の横区間の東西中央を固定。横幅が細くても上下に逃がさない。 / 新案2「水平中央→縦断面中央」：新案1で得たX上の縦方向の区域内区間（元の点を含む区間）の南北中央に一度だけYを移す。Xは変えず、反復しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/74/files)（5ファイル）。主要変更先: `v2/national/centered-labels.js`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#79](https://github.com/Kussoon/kussoon.github.io/pull/79) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #75

- PR: [feat(v2): 新案3・文字の上下はみ出しが改善する場合だけ縦方向補正](https://github.com/Kussoon/kussoon.github.io/pull/75)／分類: ラベル・読み／基盤／マージ: 2026-10-31T15:52:13Z
- 当時の仕様・目的（本文抜粋）: 市域の南北中央に配置する新案1を尊重しつつ、神河町などで文字が上下にはみ出す場合だけ新案2の縦断面中央を検討する、新案3を比較する。 / 新案3を比較ページの初期設定として追加。新案1／新案2／旧方式も維持 / 各区域の水平中央を基準に、基準文字サイズで上下はみ出し20%以上・補正後12ポイント以上改善・全矩形の収まりを大きく悪化させず・市域高18%以内の移動なら、縦断面の南北中央へ移動
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/75/files)（5ファイル）。主要変更先: `v2/national/centered-labels.js`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#79](https://github.com/Kussoon/kussoon.github.io/pull/79) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #76

- PR: [feat(v2): 水平中央と縦断面中央の位置差を地図上に可視化](https://github.com/Kussoon/kussoon.github.io/pull/76)／分類: ラベル・読み／基盤／マージ: 2026-10-31T16:05:32Z
- 当時の仕様・目的（本文抜粋）: 新案1・2・3のラベル位置を、三木市・宝塚市・神河町などで比較する際、「どこからどこへ何％動いたのか」「新案3がなぜその候補を採用しなかったのか」が見えにくい。 / `/v2/national/density.html` の比較ページだけに可視化UIを追加 / 選択した市町村の水平断面（橙）、縦断面（緑）、新案1と新案2の中心点、移動線をSVGで重ねる
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/76/files)（4ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #77

- PR: [fix(v2): 南北中央断面の最西端・最東端から地名ラベル中央を決める](https://github.com/Kussoon/kussoon.github.io/pull/77)／分類: ラベル・読み／基盤／マージ: 2026-10-31T16:40:36Z
- 当時の仕様・目的（本文抜粋）: ユーザーが最初から指定していた「市域全体の最北端・最南端の中間で水平に切り、その線上で市域の最西端と最東端の中央にラベルを置く」を忠実に実装する。従来の「区間を1つ選択する」誤った処理を廃止する。 / 南北中央の水平断面に含まれるすべての区間を調べ、最西端と最東端の中間を第一候補にする。三木市のように複数の区間があっても、狭い区間の中心を選ばない / 候補が実際の市域内ならそのまま固定。飛地の隙間・穴など市域外にある場合だけ同じ高さを維持して最も近い市域内部へXを最小補正
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/77/files)（4ファイル）。主要変更先: `v2/national/centered-labels.js`、`v2/national/density.html`。
- 後続変更: [#79](https://github.com/Kussoon/kussoon.github.io/pull/79) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #78

- PR: [feat(v2): 新案4・水平中央が区域外の場合のみ同じXの縦断面で補正](https://github.com/Kussoon/kussoon.github.io/pull/78)／分類: ラベル・読み／基盤／マージ: 2026-10-31T16:56:37Z
- 当時の仕様・目的（本文抜粋）: ユーザーが提案した、南北中央の水平線上の最西端と最東端の中点を第一候補とし、その点が市域外のときだけXを変えず縦方向へ補正する規則を試験する。 / 新案4を比較ページの初期選択に追加。従来の新案1〜3と旧方式は比較用に残す / 中央の水平断面全幅の中点が市域内ならそのまま採用
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/78/files)（5ファイル）。主要変更先: `v2/national/centered-labels.js`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#79](https://github.com/Kussoon/kussoon.github.io/pull/79) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #79

- PR: [feat(v2): 新案5・南北中央の最長水平区間の中心にラベルを固定](https://github.com/Kussoon/kussoon.github.io/pull/79)／分類: ラベル・読み／基盤／マージ: 2026-10-31T17:12:16Z
- 当時の仕様・目的（本文抜粋）: 西宮市・朝来市で水平線が複数の市域区間を横切る場合、全体両端の中点ではなく、最長の連続した市域区間の中点へラベルを置く新案5をV2比較ページへ追加する。 / `proposal5(model)` を追加：市域南北中央の高さで水平に切り、区域内の連続区間を長い順に並べ、最長区間の東西中央を選択。区間幅が同じ場合は西側を優先 / 中央高さで交差区間がないときだけ近傍の高さに補完
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/79/files)（5ファイル）。主要変更先: `v2/national/centered-labels.js`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#94](https://github.com/Kussoon/kussoon.github.io/pull/94) → [#95](https://github.com/Kussoon/kussoon.github.io/pull/95) → [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) → [#225](https://github.com/Kussoon/kussoon.github.io/pull/225) → [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S21=B
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #80

- PR: [feat(v2): 市町村タップ時に庁舎所在地と3リンクの吹き出しを表示](https://github.com/Kussoon/kussoon.github.io/pull/80)／分類: 選択・吹き出し／マージ: 2026-10-31T17:25:55Z
- 当時の仕様・目的（本文抜粋）: V2地図で選択した市町村を紫色にし、庁舎の所在地と「公式サイト」「Wikipedia」「ここへ行く」の3リンクを吹き出しで提示する第一段階の実機検証。 / V2比較ページの地図内左下にスマートフォン対応の吹き出しを追加。市町村名・庁舎名・所在地を表示 / 「公式サイト」「Wikipedia」は記録済みURLを別タブで開く。「ここへ行く」は所在地を目的地に指定したGoogleマップの経路検索を別タブで開く
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/80/files)（5ファイル）。主要変更先: `v2/data/national/municipality-offices-pilot.json`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#85](https://github.com/Kussoon/kussoon.github.io/pull/85) → [#87](https://github.com/Kussoon/kussoon.github.io/pull/87) → [#88](https://github.com/Kussoon/kussoon.github.io/pull/88) → [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) → [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) → [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) → [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) → [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S06=A, S07=A, S10=A
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #81

- PR: [fix(v2): 吹き出しの×では選択色を残し、市域の再タップで解除](https://github.com/Kussoon/kussoon.github.io/pull/81)／分類: 選択・吹き出し／マージ: 2026-10-31T22:00:02Z
- 当時の仕様・目的（本文抜粋）: V2試験ページの自治体情報吹き出しの操作を修正します。 / ×印は吹き出しだけを閉じ、市域の紫色選択を維持 / 選択された市域の再タップでは色を解除、さらにタップすると紫色選択と吹き出しを再表示
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/81/files)（3ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#142](https://github.com/Kussoon/kussoon.github.io/pull/142) → [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) → [#204](https://github.com/Kussoon/kussoon.github.io/pull/204) → [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S01=A, S02=B, S03=A, S04=要確認, S05=要確認
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #82

- PR: [feat(v2): 地図操作4ボタンを右下に移し、よみがなを初期表示](https://github.com/Kussoon/kussoon.github.io/pull/82)／分類: 地図操作／マージ: 2026-10-31T22:06:55Z
- 当時の仕様・目的（本文抜粋）: V2比較ページのみのUI変更です。 / 拡大／縮小／全体表示／よみがなの4ボタンを右上から右下へ配置変更（PC・スマホ共通） / よみがなの初期値をONとし、ボタンの初期ラベル・押下状態も合わせる。押すたびに非表示→表示と切替える既存イベント処理は維持
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/82/files)（3ファイル）。主要変更先: `v2/national/density.html`。
- 後続変更: [#239](https://github.com/Kussoon/kussoon.github.io/pull/239) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S19=要確認, S27=A, S34=C
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #83

- PR: [feat(v2): 市町村情報の吹き出し配置をA/Bの2ページで比較](https://github.com/Kussoon/kussoon.github.io/pull/83)／分類: 選択・吹き出し／マージ: 2026-10-31T22:15:36Z
- 当時の仕様・目的（本文抜粋）: スマートフォンの画面をなるべく隠さず、市町村タップ時の庁舎情報を読みやすくする2パターンを、iPhoneで実機比較できるようにする。 / `/v2/national/density-popup-a.html`：吹き出しを左下に縦長表示し、「公式サイト」「Wikipedia」「ここへ行く」の3リンクを縦に並べる。幅は右下の操作ボタン群に重ならないよう抑える。 / `/v2/national/density-popup-b.html`：右下の地図操作ボタン群の左側に吹き出しを横長表示し、3リンクは横並び。モバイルでは画面幅に合わせて幅と文字サイズを調整。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/83/files)（4ファイル）。主要変更先: `v2/national/density-popup-a.html`、`v2/national/density-popup-b.html`。
- 後続変更: [#84](https://github.com/Kussoon/kussoon.github.io/pull/84) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S12=要確認
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #84

- PR: [feat(v2): B案の吹き出し配置を採用し庁舎郵便番号を追加](https://github.com/Kussoon/kussoon.github.io/pull/84)／分類: 選択・吹き出し／マージ: 2026-10-31T22:23:09Z
- 当時の仕様・目的（本文抜粋）: 現行 `/v2/national/density.html` の庁舎情報吹き出しをB案（右下の地図4ボタンの左、3リンク横並び）に変更。現行の選択操作、新案5、よみがな初期ONを維持。 / 西宮市662-8567、宝塚市665-8665、三木市673-0492、神河町679-3116の本庁舎郵便番号を、各自治体公式ページで確認して独立した `postalCode` フィールドへ収録。住所の上に `〒...` を改行して表示。 / 比較用A案・B案も共通JSを参照して同じ郵便番号を表示。ソースのキャッシュ識別子を更新。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/84/files)（7ファイル）。主要変更先: `v2/data/national/municipality-offices-pilot.json`、`v2/national/density-app.js`、`v2/national/density-popup-a.html`、`v2/national/density-popup-b.html` 他。
- 後続変更: [#90](https://github.com/Kussoon/kussoon.github.io/pull/90) → [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) → [#242](https://github.com/Kussoon/kussoon.github.io/pull/242) → [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) → [#244](https://github.com/Kussoon/kussoon.github.io/pull/244)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S12=要確認
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #85

- PR: [feat(v2): 地図4ボタンを細くし政令市区名を初期表示、選択色を琥珀色へ](https://github.com/Kussoon/kussoon.github.io/pull/85)／分類: 選択・吹き出し／マージ: 2026-10-31T22:29:35Z
- 当時の仕様・目的（本文抜粋）: 現行V2比較ページの右下4つの地図操作ボタンを、PC幅112→96px、スマホ幅104→88pxに縮小。B案の吹き出し位置もそれに合わせ左側スペースを確保 / 初期表示単位を区表示（ward）へ変更し、神戸市中央区などを漢字・よみがな付きで初期表示（15府県では457区域の想定） / 地域を切り替えた場合も区表示を維持。富士山ナンバー表示は従来どおり専用plateモード。市町村統合モードは手動選択可能
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/85/files)（4ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S06=A
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #86

- PR: [docs(v2): 全国共通の市役所・区役所データ仕様を策定](https://github.com/Kussoon/kussoon.github.io/pull/86)／分類: 選択・吹き出し／マージ: 2026-10-31T22:46:08Z
- 当時の仕様・目的（本文抜粋）: Codexでの兵庫県41市町・神戸市9区の整備に先立ち、全国共通の庁舎データ仕様を文書化。政令市の区を選ぶと区役所と市役所の2施設を個別表示する仕様、行政5桁コードと庁舎IDの分離、二重管理防止、郵便番号と住所の一次情報確認、スクロールできるB案吹き出し、段階移行、データ品質・PR受入基準、神戸市役所と中央区役所の具体例を収録。 / 追加は `v2/national/OFFICES-DATA-SPEC.md` 1ファイルのみです。地図・JS・既存データ・公開画面は未変更。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/86/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #87

- PR: [V2: 兵庫県50地域の庁舎データ正規化と区役所・市役所の併記](https://github.com/Kussoon/kussoon.github.io/pull/87)／分類: 庁舎・公式URL／マージ: 2026-10-31T23:22:43Z
- 当時の仕様・目的（本文抜粋）: 兵庫県41市町・神戸市9区を行政コードから参照する schemaVersion 2 に移行し、区の吹き出しに区役所と市役所を順に表示します。神戸市役所は1施設だけ保存し、各区が共通参照します。施設ごとに郵便番号・住所・公式庁舎案内・独立した経路案内を設け、自治体公式サイトとWikipediaも維持します。 / 多可町28365：多可町役場 本庁舎、〒679-1192、兵庫県多可郡多可町中区中村町123番地。ユーザーが確認した公式庁舎案内 https://www.town.taka.lg.jp/about_taka/chousha/ を出典として登録し、庁舎案内・経路案内を有効化しました。 / 多可町の公式本文は実行環境では再取得もHTTP 503になります。28-sources.jsonにはユーザーによる公式確認（userProvidedOfficialConfirmation）と実行環境の取得結果を区別して記録し、HTTP 200を捏造していません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/87/files)（11ファイル）。主要変更先: `v2/common/js/office-directory.js`、`v2/data/offices/28-sources.json`、`v2/data/offices/28.json`、`v2/national/density-app.js` 他。
- 後続変更: [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) → [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) → [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) → [#96](https://github.com/Kussoon/kussoon.github.io/pull/96) → [#97](https://github.com/Kussoon/kussoon.github.io/pull/97) → [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S08=A, S10=A
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)、[v2/tests/office-directory.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/office-directory.test.cjs)、[v2/tests/office-popup.browser.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/office-popup.browser.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #88

- PR: [feat(v2): 吹き出しを地域学習向けに整理し庁舎への経路案内を削除](https://github.com/Kussoon/kussoon.github.io/pull/88)／分類: 庁舎・公式URL／マージ: 2026-10-31T23:51:06Z
- 当時の仕様・目的（本文抜粋）: 役所・役場の郵便番号と住所は、その地域の代表的な住所を知るための参考情報。庁舎への訪問誘導ではなく、**選択した市区町村について調べること**を主目的とする。 / 吹き出し内で庁舎名・郵便番号・住所はテキストとして表示。神戸市中央区の中央区役所＋神戸市役所の併記は維持。 / 施設ごとの「庁舎案内」「ここへ行く」を削除し、画面のリンクは選択地域の「公式サイト」「Wikipedia」の2つだけに変更。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/88/files)（11ファイル）。主要変更先: `v2/common/js/office-directory.js`、`v2/data/offices/28.json`、`v2/national/density-app.js`、`v2/national/density-popup-a.html` 他。
- 後続変更: [#89](https://github.com/Kussoon/kussoon.github.io/pull/89) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S07=A, S33=C
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)、[v2/tests/office-directory.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/office-directory.test.cjs)、[v2/tests/office-popup.browser.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/office-popup.browser.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #89

- PR: [feat(v2): 地域の代表地点への「ここへ行く」を3番目に復活](https://github.com/Kussoon/kussoon.github.io/pull/89)／分類: 庁舎・公式URL／マージ: 2026-11-01T01:54:32Z
- 当時の仕様・目的（本文抜粋）: 地域学習の目的を踏まえ「公式サイト」「Wikipedia」「ここへ行く」の3ボタンを横並びに戻す。「ここへ行く」はGoogleマップの経路案内へリンクし、市町村は本庁舎、政令指定都市の区は区役所を**その地域の代表的な目的地**とする。出発地や移動手段は固定しないため、自宅などからの距離・所要時間・交通手段をGoogleマップ側で調べられる。施設への訪問・案内を求める趣旨ではなく、地理的な位置関係の学習を支援する機能。住所の文字表示、神戸市中央区の2庁舎併記、B案レイアウト、ラベル計算、操作は維持。未確認の住所は目的地にせずリンクを無効化。「庁舎案内」は復活させない。3画面のCSS・キャッシュ・既存テストと仕様書を更新。JS構文とリンク先の静的検証は成功。Node/Playwrightの全テスト実行は未実施。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/89/files)（9ファイル）。主要変更先: `v2/common/js/office-directory.js`、`v2/national/density-popup-a.html`、`v2/national/density-popup-b.html`、`v2/national/density.html`。
- 後続変更: [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) → [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) → [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S07=A, S10=A, S33=C
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)、[v2/tests/office-directory.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/office-directory.test.cjs)、[v2/tests/office-popup.browser.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/office-popup.browser.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #90

- PR: [trial(v2): 西宮市だけの省スペース吹き出し比較ページを追加](https://github.com/Kussoon/kussoon.github.io/pull/90)／分類: 選択・吹き出し／マージ: 2026-11-01T02:45:31Z
- 当時の仕様・目的（本文抜粋）: 公開中の `v2/national/density.html` と共有JSを変更せず、独立したプレビューページ `density-nishinomiya-compact.html` のみ追加。西宮市を選択した時だけ、空要素の余白除去、吹き出し・施設欄の余白縮小、文字間隔・3ボタン・注記の圧縮を適用。他の市区町村は現行表示のまま。初期表示は関西2府4県、ページ上に現行ページへの比較リンクを設け、見た目はユーザーのiPhone実機確認を経てから横展開予定。地図の選択・ラベル・リンク先・共通プログラムは不変。データや他ページへの変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/90/files)（1ファイル）。主要変更先: `v2/national/density-nishinomiya-compact.html`。
- 後続変更: [#91](https://github.com/Kussoon/kussoon.github.io/pull/91) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S12=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #91

- PR: [feat(v2): 西宮市で合格した省スペース吹き出しを全市区町村へ適用](https://github.com/Kussoon/kussoon.github.io/pull/91)／分類: 選択・吹き出し／マージ: 2026-11-01T02:55:35Z
- 当時の仕様・目的（本文抜粋）: 西宮市の独立試作 `density-nishinomiya-compact.html` で実機確認・承認された余白・3ボタン横並び・短い注記を通常のV2 `density.html` 全地域に適用。 / 単一庁舎の吹き出しは省スペース表示。`公式サイト`・`Wikipedia`・`ここへ行く` 3ボタン横一列、右の4操作ボタンとの非重複B案を維持。 / 神戸市中央区など区役所＋市役所の二施設は文字を無理に縮小しない `multi-office` 調整（庁舎名14px・住所13px）。吹き出し最大高さと内部スクロールは維持。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/91/files)（10ファイル）。主要変更先: `v2/common/js/office-directory.js`、`v2/national/density-app.js`、`v2/national/density-nishinomiya-compact.html`、`v2/national/density-popup-a.html` 他。
- 後続変更: [#93](https://github.com/Kussoon/kussoon.github.io/pull/93) → [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) → [#242](https://github.com/Kussoon/kussoon.github.io/pull/242) → [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) → [#244](https://github.com/Kussoon/kussoon.github.io/pull/244)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S07=A, S10=A, S12=要確認, S13=要確認
- 回帰テスト: [v2/tests/national-centered-labels.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/national-centered-labels.test.cjs)、[v2/tests/office-directory.test.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/office-directory.test.cjs)、[v2/tests/office-popup.browser.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tests/office-popup.browser.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #92

- PR: [feat(v2): 大阪府5地域の庁舎データ試作（兵庫県との共存）](https://github.com/Kussoon/kussoon.github.io/pull/92)／分類: 庁舎・公式URL／マージ: 2026-11-01T03:26:50Z
- 当時の仕様・目的（本文抜粋）: 大阪府5地域（大阪市・大阪市北区・豊中市・能勢町・千早赤阪村）の公式所在地・郵便番号・地域公式サイト・Wikipediaを `v2/data/offices/27.json` に追加 / 大阪市北区は北区役所と大阪市役所の2施設を表示。大阪市役所施設は1回だけ定義 / `density-app.js` の読込を27/28都道府県別に拡張。兵庫県の既存50地域は維持し、必要な県だけ非同期で読み込み・結合
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/92/files)（3ファイル）。主要変更先: `v2/data/offices/27.json`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #93

- PR: [fix(v2): 政令市の区に区役所・市役所それぞれの3リンクを表示](https://github.com/Kussoon/kussoon.github.io/pull/93)／分類: 選択・吹き出し／マージ: 2026-11-01T03:46:29Z
- 当時の仕様・目的（本文抜粋）: 政令市の区を選択した場合に、区役所住所の直下に「公式サイト・Wikipedia・ここへ行く」、親市役所住所の直下にも市の3リンクを追加（計6リンク） / `parentCode` から親政令市の地域公式トップおよびWikipediaを参照し、経路案内の目的地は各段それぞれの区役所・市役所とする / 通常の単独市町村は従来の3ボタン横並びを維持
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/93/files)（3ファイル）。主要変更先: `v2/common/js/office-directory.js`、`v2/national/density.html`。
- 後続変更: [#96](https://github.com/Kussoon/kussoon.github.io/pull/96) → [#97](https://github.com/Kussoon/kussoon.github.io/pull/97) → [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) → [#243](https://github.com/Kussoon/kussoon.github.io/pull/243) → [#244](https://github.com/Kussoon/kussoon.github.io/pull/244)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S07=A, S08=A, S13=要確認, S33=C
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #94

- PR: [trial(v2): 新案5B 最大連続区域優先のラベル配置比較](https://github.com/Kussoon/kussoon.github.io/pull/94)／分類: ラベル・読み／基盤／マージ: 2026-11-01T05:22:22Z
- 当時の仕様・目的（本文抜粋）: 神戸市中央区の分離した埋立地を含む形状について、「区域全体の新案5」と「最大面積の連続した主区域だけで新案5」の表示位置を同一倍率・画面位置で比較する。 / `national-boundaries.js`: 各市区町村のMultiPolygonの連続成分（外周＋穴）を保持。全域の境界・選択データは従来どおり。 / `centered-labels.js`: 実形状から主区域を面積で自動判定し、その区域のみで現行 `proposal5` を実行する `largestComponent5` を追加。区名やコードによる例外指定はしない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/94/files)（4ファイル）。主要変更先: `v2/common/js/national-boundaries.js`、`v2/national/centered-labels.js`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S21=B
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #95

- PR: [trial(v2): 新案5C 役場・区役所のある連続区域でラベル配置を比較](https://github.com/Kussoon/kussoon.github.io/pull/95)／分類: ラベル・読み／基盤／マージ: 2026-11-01T05:38:34Z
- 当時の仕様・目的（本文抜粋）: 田尻町では関西空港側の連続区域が本土より大きいため、従来の「最大面積」5Bでもラベルが空港側に配置される。役場を含む区域を特定して、その区域の中心を新案5で計算する新案5Cを比較試作する。 / `centered-labels.js` に `officeComponent5(model)` を追加。位置座標が含まれる連続区域が1つだけのとき採用し、そこで既存の新案5を計算。欠落・区域外などは新案5Bにフォールバック / `density-app.js` と `density.html` に5C比較モードと田尻町ショートカット／診断表示を追加
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/95/files)（5ファイル）。主要変更先: `v2/data/national/office-reference-points.json`、`v2/national/centered-labels.js`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#100](https://github.com/Kussoon/kussoon.github.io/pull/100) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S21=B
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #96

- PR: [feat(v2): 大阪市24区の区役所住所・郵便番号と6リンク表示データを整備](https://github.com/Kussoon/kussoon.github.io/pull/96)／分類: 庁舎・公式URL／マージ: 2026-11-01T05:43:53Z
- 当時の仕様・目的（本文抜粋）: 大阪市24区の区役所所在地・庁舎専用郵便番号・地域公式URL・Wikipedia URLを `v2/data/offices/27.json` に追加。既存の北区データは維持し、残り23区を追加。大阪市役所は `27100-city` を全24区で参照する正規化構造のまま。 / 大阪市「各区役所・保健福祉センターの所在地・電話番号・アクセス」（2026年4月30日更新） https://www.city.osaka.lg.jp/fukushi/page/0000371237.html に記載された全24区の住所および郵便番号を照合。各区の `officialPage` には市の一覧から直接リンクされている各区役所ページを設定。 / `v2/data/offices/27.json` のみ
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/96/files)（1ファイル）。主要変更先: `v2/data/offices/27.json`。
- 後続変更: [#97](https://github.com/Kussoon/kussoon.github.io/pull/97) → [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S08=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #97

- PR: [feat(v2): 堺市役所と7区役所の住所・郵便番号・6リンク用データを整備](https://github.com/Kussoon/kussoon.github.io/pull/97)／分類: 庁舎・公式URL／マージ: 2026-11-01T05:45:27Z
- 当時の仕様・目的（本文抜粋）: 堺市役所1施設・堺市7区役所7施設と、堺市＋7行政区の地域情報を `v2/data/offices/27.json` に追加。政令指定都市として各区が `27140-city` の堺市役所を参照し、区役所・市役所それぞれの「公式サイト／Wikipedia／ここへ行く」計6リンクを表示する既存機構に対応する。 / 堺市「市役所・区役所」（2026年4月1日更新） https://www.city.sakai.lg.jp/yoyakuanai/bunrui/gyoseikikan/shiyakushokuyakusho.html に記載された全8施設の住所・郵便番号。市役所 https://www.city.sakai.lg.jp/shisei/gaiyo/annai/access.html も照合。各区の公式トップURLも公開実ページを確認。 / 地図データにある堺市7区のコードを全件照合：7/7
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/97/files)（1ファイル）。主要変更先: `v2/data/offices/27.json`。
- 後続変更: [#148](https://github.com/Kussoon/kussoon.github.io/pull/148)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S08=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #98

- PR: [feat(v2): 大阪府残り38市町村の庁舎情報を追加し74地域を完成](https://github.com/Kussoon/kussoon.github.io/pull/98)／分類: 庁舎・公式URL／マージ: 2026-11-01T05:47:56Z
- 当時の仕様・目的（本文抜粋）: 大阪府の未登録38市町村（30市・8町）について、市役所・町役場の郵便番号・住所・公式URL・Wikipediaリンクを `v2/data/offices/27.json` に追加。既存の大阪市24区、堺市7区、豊中市、能勢町、千早赤阪村等の記録は保持。 / 大阪府「大阪府内の市区町村選挙管理委員会」（2026年6月10日更新） https://www.pref.osaka.lg.jp/o190010/senkan/senkan/index.html / J-LIS「大阪府内市町村」 https://www.j-lis.go.jp/spd/code-address/kinki/cms_14814183.html （過去の役場所在地との整合確認）
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/98/files)（1ファイル）。主要変更先: `v2/data/offices/27.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #99

- PR: [feat(v2): 京都府37地域の市区町村役場・区役所情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/99)／分類: 庁舎・公式URL／マージ: 2026-11-01T05:54:37Z
- 当時の仕様・目的（本文抜粋）: 兵庫県（28）・大阪府（27）に続き、京都府（26）全域の庁舎所在地・郵便番号・地域公式URL・Wikipediaを共通V2ポップアップに追加。 / `v2/data/offices/26.json` を新設：京都市、京都市11区、その他25市町村の計37地域・37施設 / 京都市11区の各地域は区役所→京都市役所の順で `officeIds` を参照し、既存の2段6リンク仕様に対応。京都市役所の住所は1件だけ保持
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/99/files)（3ファイル）。主要変更先: `v2/data/offices/26.json`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #100

- PR: [feat(v2): 全国市区町村マップを5C・行政区表示を標準にして画面整理](https://github.com/Kussoon/kussoon.github.io/pull/100)／分類: ラベル・読み／基盤／マージ: 2026-11-01T06:22:56Z
- 当時の仕様・目的（本文抜粋）: ページ名・タイトル・説明を『全国市区町村マップ』へ更新 / 初期表示を試作5Cに設定、政令指定都市は区まで表示する `ward` モード、よみがなONを維持 / 診断用補助線を初期非表示。方式の比較、診断、旧実験と詳細文書は折りたたみセクションへ格納（削除なし）
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/100/files)（1ファイル）。主要変更先: `v2/national/density.html`。
- 後続変更: [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) → [#223](https://github.com/Kussoon/kussoon.github.io/pull/223) → [#225](https://github.com/Kussoon/kussoon.github.io/pull/225) → [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) → [#228](https://github.com/Kussoon/kussoon.github.io/pull/228) → [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S21=B, S27=A, S34=C
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #101

- PR: [feat(v2): 滋賀県19市町の役所・役場情報を登録](https://github.com/Kussoon/kussoon.github.io/pull/101)／分類: 庁舎・公式URL／マージ: 2026-11-01T06:25:27Z
- 当時の仕様・目的（本文抜粋）: 兵庫県・大阪府・京都府に続き、滋賀県19市町の市役所・町役場の郵便番号、住所、公式サイト、WikipediaをV2に追加。 / `v2/data/offices/25.json` を追加し、市13・町6の計19地域・19施設を記録 / 滋賀県の県教育委員会「におねっと」2026年5月14日現在の公式一覧 https://www.nionet.jp/shisetsulink/item_city.html にある住所・郵便番号・サイトリンクを採用
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/101/files)（3ファイル）。主要変更先: `v2/data/offices/25.json`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #102

- PR: [fix(v2): 選択区域の外郭線を単一描画にして太さを統一](https://github.com/Kussoon/kussoon.github.io/pull/102)／分類: ラベル・読み／基盤／マージ: 2026-11-01T06:32:49Z
- 当時の仕様・目的（本文抜粋）: 滋賀県の長浜市では南部の一部だけ境界が太く、多賀町・彦根市の選択時には外郭線の太さが異なって見えることが実機スクリーンショットで判明。 / 通常の `.land` 境界線（1.1px）、選択時 `.land.selected`（2px）、選択中 `.land.focused`（3.3px）に加え、府県外郭線 `.outline`（2.1px）を別SVGレイヤーで重ねている。 / 選択区域自身の `stroke` と府県の外郭線が、描画順・共有境界の位置で混在する。とくに選択色の塗りと境界線が同じpathにあるため、位置により選択境界の見え方が揃わない可能性がある。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/102/files)（2ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S35=C
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #103

- PR: [feat(v2): 奈良県39市町村の役所・役場情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/103)／分類: 庁舎・公式URL／マージ: 2026-11-01T06:38:04Z
- 当時の仕様・目的（本文抜粋）: 全国市区町村マップの庁舎情報を奈良県へ拡大。12市・15町・12村、合計39市町村の住所、郵便番号、公式サイト、Wikipedia、経路案内用の住所データを登録します。 / `v2/data/offices/29.json` を新設（39地域・39庁舎） / `density-app.js` の既存の府県別データ読み込みに `29` を追加（滋賀・京都・大阪・兵庫も維持）
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/103/files)（3ファイル）。主要変更先: `v2/data/offices/29.json`、`v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #104

- PR: [trial(v2): 大阪・奈良の共通境界表示を独立比較ページで検証](https://github.com/Kussoon/kussoon.github.io/pull/104)／分類: 境界・2026データ／マージ: 2026-11-01T07:52:56Z
- 当時の仕様・目的（本文抜粋）: 大阪府・奈良県境の別々に簡素化された外郭線がずれ、柏原市・三郷町・平群町周辺で濃青の二重線・隙間が生じる問題を切り分け、共通境界方式の視覚的有効性を実機で比較する。 / `v2/national/shared-border-pilot.html` と `shared-border-pilot.js` の2ファイルのみ追加 / 既存の2021年版大阪府27・奈良県29のTopoJSONを読み込み、111行政区域を同じ投影で表示
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/104/files)（2ファイル）。主要変更先: `v2/national/shared-border-pilot.html`、`v2/national/shared-border-pilot.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #105

- PR: [trial(v2): 大阪・奈良の共通ベクター境界を独立SVG比較ページで試作](https://github.com/Kussoon/kussoon.github.io/pull/105)／分類: 境界・2026データ／マージ: 2026-11-01T09:27:44Z
- 当時の仕様・目的（本文抜粋）: 前回の画素方式（PR #104）では二重線は減ったが、階段状の輪郭・茶色い点線が出た。今回、画素マスクではなく**ポリゴン演算とSVGベクター線**で比較する独立ページを追加する。 / `v2/national/shared-vector-pilot.html`：従来／共通ベクター切替、柏原・三郷・平群と太子・香芝の比較、選択地域の切替 / `v2/national/shared-vector-pilot.js`：2021年版大阪・奈良TopoJSONを取得し、polygon-clipping v0.15.7とTurf v7.2.0を使って、府県境付近の**重なりをベクター差分で解消**し、両府県に近い短い隙間（350mの試験バッファ内）をベクター加算する
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/105/files)（2ファイル）。主要変更先: `v2/national/shared-vector-pilot.html`、`v2/national/shared-vector-pilot.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #106

- PR: [fix(v2): 共通ベクター試作の読み込み停止を回避し地図を先に表示](https://github.com/Kussoon/kussoon.github.io/pull/106)／分類: 境界・2026データ／マージ: 2026-11-01T09:33:33Z
- 当時の仕様・目的（本文抜粋）: 試作 `v2/national/shared-vector-pilot.html` がiPhoneで開けないとの実機報告。元実装は、外部の地理演算ライブラリ（Turf＋polygon-clipping）がロードできなければ、元地図すら表示しない。全ポリゴン演算もメインスレッドで行うため、スマホ画面が固まる危険性があった。具体的な実機コンソールログはまだ取得していないため、原因は断定しない。 / 既存の軽量なTopoJSONクライアントだけをページの初期ロードで使用し、**従来のSVG地図を必ず先に描画**。 / 共通ベクター境界はユーザーが「試作」ボタンを押した時だけ専用Worker `shared-vector-worker.js` で計算。重い演算を画面スレッドから排除。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/106/files)（3ファイル）。主要変更先: `v2/national/shared-vector-pilot.html`、`v2/national/shared-vector-pilot.js`、`v2/national/shared-vector-worker.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #107

- PR: [feat(v2): 全国一括TopoJSON生成・共有府県境の検証基盤を追加](https://github.com/Kussoon/kussoon.github.io/pull/107)／分類: 境界・2026データ／マージ: 2026-11-01T09:43:29Z
- 当時の仕様・目的（本文抜粋）: 大阪府・奈良県境の二重線について、PR #105/#106 の暫定的な大阪府基準ベクター補正を一般化する前に、**正しい全国一括の元資料から共通トポロジーを一度だけ生成**する仕組みを導入する。 / `v2/tools/shared-topology/build.mjs`: 全国一括GeoJSONの行政区域コード `N03_007` で区域を集約し、全国でTopoJSONを1回だけ構築。共有アークのまま簡素化し、県別に**アークの同じ配列を保持**して出力する。大阪・奈良が含まれるのに共有アーク0なら失敗扱い。 / `validate.mjs`: 府県別出力で共有線の座標配列が完全一致するか、府県コード・地域コードと件数を全検査。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/107/files)（7ファイル）。主要変更先: `v2/tools/shared-topology/build.mjs`、`v2/tools/shared-topology/package.json`、`v2/tools/shared-topology/validate.mjs`。
- 後続変更: [#108](https://github.com/Kussoon/kussoon.github.io/pull/108) → [#114](https://github.com/Kussoon/kussoon.github.io/pull/114) → [#120](https://github.com/Kussoon/kussoon.github.io/pull/120) → [#127](https://github.com/Kussoon/kussoon.github.io/pull/127) → [#132](https://github.com/Kussoon/kussoon.github.io/pull/132) → [#134](https://github.com/Kussoon/kussoon.github.io/pull/134) → [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) → [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S38=要確認
- 回帰テスト: [v2/tools/shared-topology/test/build.test.mjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test/build.test.mjs)、[v2/tools/shared-topology/test/synthetic-two-prefectures.geojson](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test/synthetic-two-prefectures.geojson)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #108

- PR: [test(v2): 2026年公式N03実データで大阪・奈良の共通境界を自動生成・検証](https://github.com/Kussoon/kussoon.github.io/pull/108)／分類: 境界・2026データ／マージ: 2026-11-01T09:57:57Z
- 当時の仕様・目的（本文抜粋）: PR #107で実装した全国共通TopoJSONビルダーを、合成図形ではなく国土交通省2026年1月1日時点の**大阪府・奈良県の実行政界**で動かす自動検証を追加します。 / `prepare-2026-osaka-nara.py`：国交省公式ZIPを2府県分取得。含まれるSHP（またはGML）をGDALでEPSG:4326のGeoJSONに変換し、2026年のN03地域コードを確認して1つのFeatureCollectionへ統合。自治体コード欠損や不整合は失敗として報告。 / `.github/workflows/v2-2026-n03-osaka-nara.yml`：PR上のGitHub Actionsで2府県一括TopoJSON生成→県別へ切り出し→共有アーク検証を実行。生成物はActionsの一時Artifactに保存（GitHub Pages本体・公開地図を上書きしない）。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/108/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#114](https://github.com/Kussoon/kussoon.github.io/pull/114) → [#120](https://github.com/Kussoon/kussoon.github.io/pull/120) → [#127](https://github.com/Kussoon/kussoon.github.io/pull/127) → [#132](https://github.com/Kussoon/kussoon.github.io/pull/132) → [#134](https://github.com/Kussoon/kussoon.github.io/pull/134) → [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) → [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S38=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #109

- PR: [trial(v2): 2026年公式大阪・奈良共通TopoJSONと2021年版の比較地図](https://github.com/Kussoon/kussoon.github.io/pull/109)／分類: 境界・2026データ／マージ: 2026-11-01T10:05:29Z
- 当時の仕様・目的（本文抜粋）: PR #108で実データ（2026年版N03）の大阪・奈良111市町村と19共有アークを検証できたため、その実データを**独立したSVG比較ページ**に可視化する。全国市区町村マップ本体には変更しない。 / `v2/national/official-2026-border-compare.html`/`.js`：旧2021年府県別境界と新2026年一体化Topologyを同一位置・倍率で切替。柏原・三郷・平群、太子・香芝、府県境広域。選択区域を同じポリゴンから描画しタップで選択。 / `build.mjs`：全国生成の共通Topology本体を出力するオプション `--emit-combined` を追加（県別切り出し処理はそのまま）。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/109/files)（6ファイル）。主要変更先: `v2/national/official-2026-border-compare.html`、`v2/national/official-2026-border-compare.js`、`v2/tools/shared-topology/build.mjs`、`v2/tools/shared-topology/package.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #110

- PR: [V2: 2026年共通境界の5m・10m・20m比較試作](https://github.com/Kussoon/kussoon.github.io/pull/110)／分類: 境界・2026データ／マージ: 2026-11-01T11:17:48Z
- 当時の仕様・目的（本文抜粋）: 大阪・奈良111区域の既存精密TopoJSONをブラウザー内で読み込み、共有アークを距離許容差5m/10m/20mで一度だけDouglas–Peucker簡略化する独立ページを追加。地図範囲・縮尺固定、区域選択、頂点数・非圧縮JSON容量・生成時間・描画時間を比較。閉じたアークは島等の消失を避けるため保全。既存全国版・試作5C・PR #109のファイルは変更なし。 / 試作予定URL: https://kussoon.com/v2/national/official-2026-simplification-compare.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/110/files)（1ファイル）。主要変更先: `v2/national/official-2026-simplification-compare.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #111

- PR: [Fix: 2026簡略化比較のTopoJSON CDN依存を解消](https://github.com/Kussoon/kussoon.github.io/pull/111)／分類: 境界・2026データ／マージ: 2026-11-01T11:25:18Z
- 当時の仕様・目的（本文抜粋）: iPhone実機で『TopoJSONライブラリが利用できません』と表示される問題に対応。外部CDNからのTopoJSONクライアント読み込みを削除し、試作HTML内に必要なPolygon/MultiPolygon復元と共有アーク描画の最小実装を内蔵。新規試作HTMLのみ変更。実機の表示確認は未実施。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/111/files)（1ファイル）。主要変更先: `v2/national/official-2026-simplification-compare.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #112

- PR: [V2: 精密版輪郭の重ね合わせ比較を追加](https://github.com/Kussoon/kussoon.github.io/pull/112)／分類: 境界・2026データ／マージ: 2026-11-01T11:32:05Z
- 当時の仕様・目的（本文抜粋）: 5m/10m/20m簡略化版と精密版の輪郭を同じ縮尺で視覚比較するため、精密版の赤破線オーバーレイ切替を追加。独立試作HTMLだけ変更し、既存の全国版・試作5Cには触れない。iPhone実機での表示・操作確認は未実施。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/112/files)（1ファイル）。主要変更先: `v2/national/official-2026-simplification-compare.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #113

- PR: [V2: 境界簡略化の最大・平均ずれを数値検証](https://github.com/Kussoon/kussoon.github.io/pull/113)／分類: 境界・2026データ／マージ: 2026-11-01T11:42:20Z
- 当時の仕様・目的（本文抜粋）: 精密版の各頂点から5m/10m/20m簡略化折れ線への片方向最短距離を全共有アークで計測し、最大・平均ずれ、20m超の頂点数、評価頂点数を表示。距離は近似値。面積・飛び地・自己交差は未検証。初回表示後に計算し、途中でUIを譲る。既存全国版・試作5Cは変更なし。実機動作未確認。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/113/files)（1ファイル）。主要変更先: `v2/national/official-2026-simplification-compare.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #114

- PR: [V2: 大阪・奈良の20m軽量データを事前生成](https://github.com/Kussoon/kussoon.github.io/pull/114)／分類: 境界・2026データ／マージ: 2026-11-01T11:51:21Z
- 当時の仕様・目的（本文抜粋）: 20m共有アーク簡略化をGitHub Actionsで事前生成し、独立TopoJSONとして保存する試験。既存地図の配信先は未変更。GitHub Actionsが生成ファイルをコミットした後に、配信切替を別段階で行う。PythonによるDPは現行ブラウザ試作と同じ平面近似・共有アーク方式。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/114/files)（4ファイル）。主要変更先: `v2/national/official-2026-20m-fast-trial.html`。
- 後続変更: [#120](https://github.com/Kussoon/kussoon.github.io/pull/120) → [#125](https://github.com/Kussoon/kussoon.github.io/pull/125) → [#127](https://github.com/Kussoon/kussoon.github.io/pull/127) → [#132](https://github.com/Kussoon/kussoon.github.io/pull/132) → [#134](https://github.com/Kussoon/kussoon.github.io/pull/134) → [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) → [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) → [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231) → [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S20=要確認, S38=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #115

- PR: [20m軽量配信試作の説明文を訂正](https://github.com/Kussoon/kussoon.github.io/pull/115)／分類: 境界・2026データ／マージ: 2026-11-01T12:01:14Z
- 当時の仕様・目的（本文抜粋）: 精密版を読み込まない旨の誤記と戻りリンクの名称のみ修正。処理・地図データは変更しません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/115/files)（1ファイル）。主要変更先: `v2/national/official-2026-20m-fast-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #116

- PR: [V2: 20m軽量地図の共通生成ツールと運用方針](https://github.com/Kussoon/kussoon.github.io/pull/116)／分類: 境界・2026データ／マージ: 2026-11-01T12:06:45Z
- 当時の仕様・目的（本文抜粋）: 任意のTopoJSONを入力して共有アークを20m（変更可能）で簡略化する汎用CLIを追加。大阪・奈良の既存試作は変更しない。全国への展開手順を文書化。実データでの再実行検証は別途必要。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/116/files)（3ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #117

- PR: [V2: 府県別20m展開に向けた元データ棚卸し](https://github.com/Kussoon/kussoon.github.io/pull/117)／分類: サイト共通／対象外／マージ: 2026-11-01T12:56:46Z
- 当時の仕様・目的（本文抜粋）: V2内のTopoJSONファイルを読み取り専用で列挙し、容量・共有アーク数・頂点数・区域数をJSONレポート化。PR検証時にレポートをArtifactとして保存。地図データや公開ページは変更しません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/117/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #118

- PR: [V2: 滋賀・京都2026年版の共通境界と20m軽量化を検証](https://github.com/Kussoon/kussoon.github.io/pull/118)／分類: 境界・2026データ／マージ: 2026-11-01T13:02:17Z
- 当時の仕様・目的（本文抜粋）: 大阪・奈良に続く試作。国交省2026年N03の滋賀・京都を取得し、共通TopoJSON生成・府県分割検証・20m軽量化・ID整合検証をCIで実行。成果物はGitHub Actions artifactに保存し、公開サイトや既存データは変更しない。結果確認後に公開方法を決定する。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/118/files)（4ファイル）。主要変更先: `v2/national/official-2026-shiga-kyoto-20m-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #119

- PR: [V2: 兵庫県・和歌山県2026年版20m軽量データ試作](https://github.com/Kussoon/kussoon.github.io/pull/119)／分類: 境界・2026データ／マージ: 2026-11-01T13:14:01Z
- 当時の仕様・目的（本文抜粋）: 国交省2026 N03の兵庫・和歌山を取得し、共通TopoJSONと20m軽量版を生成・検証。両県は隣接しないため共有県境の検証対象ではなく、区域数・ID・アーク構造・軽量化を検証する。既存公開ページ・全国版は変更しない。CI成功時のみ軽量ファイルをPRブランチにコミット。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/119/files)（4ファイル）。主要変更先: `v2/national/official-2026-hyogo-wakayama-20m-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #120

- PR: [V2: 2026年近畿6府県の一体共通境界を検証](https://github.com/Kussoon/kussoon.github.io/pull/120)／分類: 境界・2026データ／マージ: 2026-11-01T13:18:31Z
- 当時の仕様・目的（本文抜粋）: 滋賀(25)・京都(26)・大阪(27)・兵庫(28)・奈良(29)・和歌山(30)の公式N03を単一GeoJSONへ統合し、共通TopoJSONを一度だけ構築する検証。共通アークの検証、20m軽量化、行政区域ID検証をGitHub Actionsで実施。大容量データはまずCI artifactのみで、公開地図や既存データは変更しない。CI合格後に配信分割と独立試作ページを設計する。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/120/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#127](https://github.com/Kussoon/kussoon.github.io/pull/127) → [#132](https://github.com/Kussoon/kussoon.github.io/pull/132) → [#134](https://github.com/Kussoon/kussoon.github.io/pull/134) → [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) → [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S38=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #121

- PR: [V2: 近畿6府県共通20m地図の独立配信試作](https://github.com/Kussoon/kussoon.github.io/pull/121)／分類: 境界・2026データ／マージ: 2026-11-01T13:21:20Z
- 当時の仕様・目的（本文抜粋）:
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/121/files)（3ファイル）。主要変更先: `v2/national/official-2026-kinki-six-20m-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #122

- PR: [V2: 四国4県2026年版共通境界・20m軽量地図試作](https://github.com/Kussoon/kussoon.github.io/pull/122)／分類: 境界・2026データ／マージ: 2026-11-01T13:28:49Z
- 当時の仕様・目的（本文抜粋）: 徳島(36)・香川(37)・愛媛(38)・高知(39)の国交省2026年版N03を一体化し、共通Topologyで県境アークを共有。20m軽量化のデータ・区域ID・県境一致をGitHub Actionsで検証し、独立ページで4県表示、区域選択、表示時間を試験。成功時のみ生成データをPRブランチへコミット。全国版および試作5Cは変更しません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/122/files)（4ファイル）。主要変更先: `v2/national/official-2026-shikoku-four-20m-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #123

- PR: [V2: 中国・四国9県 2026年版共通境界・20m軽量地図](https://github.com/Kussoon/kussoon.github.io/pull/123)／分類: 境界・2026データ／マージ: 2026-11-01T13:37:33Z
- 当時の仕様・目的（本文抜粋）: 鳥取・島根・岡山・広島・山口・徳島・香川・愛媛・高知の2026年国交省N03データを9県同時に共通TopoJSON化し、県境共有アーク・区域ID・20m軽量化の整合性をCIで検査します。成功時に独立試作ページ用の事前生成20mデータをPRブランチへコミット。既存全国版・試作5Cは変更しません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/123/files)（4ファイル）。主要変更先: `v2/national/official-2026-chugoku-shikoku-nine-20m-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #124

- PR: [V2: 九州7県・2026年版共通境界と20m軽量地図試作](https://github.com/Kussoon/kussoon.github.io/pull/124)／分類: 境界・2026データ／マージ: 2026-11-01T13:46:07Z
- 当時の仕様・目的（本文抜粋）: 2026年国交省N03（福岡40・佐賀41・長崎42・熊本43・大分44・宮崎45・鹿児島46）を一体のTopoJSONに生成し、共有県境・市区町村ID・20m軽量データをCIで検証。成功時に独立試作ページ用の事前生成データをPRへ追加。九州本土と島しょ部の表示範囲切替および区域選択を試験。既存全国版・試作5Cは変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/124/files)（4ファイル）。主要変更先: `v2/national/official-2026-kyushu-seven-20m-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #125

- PR: [V2: 九州2026年版を県別20m配信に変更し初期表示を軽量化](https://github.com/Kussoon/kussoon.github.io/pull/125)／分類: 境界・2026データ／マージ: 2026-11-01T13:52:04Z
- 当時の仕様・目的（本文抜粋）: 九州7県一括20m版が約61.9MBでiPhoneの初期読み込みが遅いため、**既存版を残したまま**県別オンデマンド配信を試す。公式2026年N03の7県一体TopoJSONから共通アークを保持した県別スライスを生成し、各スライスを20m簡略化。区域数（合計251）と共通境界を保つ生成工程をGitHub Actionsで検証する。試作ページは初回に福岡県だけ取得し、県切替時に該当県のみ取得、再選択はキャッシュ。全国版・試作5C・現行九州7県一括試作は変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/125/files)（9ファイル）。主要変更先: `v2/national/official-2026-kyushu-prefecture-20m-trial.html`。
- 後続変更: [#136](https://github.com/Kussoon/kussoon.github.io/pull/136) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S20=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #126

- PR: [V2: 九州・沖縄8県に沖縄2026年版20m地図を追加](https://github.com/Kussoon/kussoon.github.io/pull/126)／分類: 境界・2026データ／マージ: 2026-11-01T14:06:36Z
- 当時の仕様・目的（本文抜粋）: 公式2026年N03から沖縄県47の共通TopoJSONを生成し、20m軽量版を県別オンデマンド配信フォルダに追加。これまで実機確認済みの九州7県の地図・データは変更せず、新規の独立試作ページで九州・沖縄8県を切り替え可能にする。沖縄本島・宮古・八重山・大東諸島への表示範囲切替を設け、島しょ部の形状・市町村選択を検証。CI合格後にマージ。全国版および試作5Cは変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/126/files)（4ファイル）。主要変更先: `v2/national/official-2026-kyushu-okinawa-eight-20m-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #127

- PR: [V2: 東海4県2026年版の共通境界・県別20m軽量地図](https://github.com/Kussoon/kussoon.github.io/pull/127)／分類: 境界・2026データ／マージ: 2026-11-01T14:16:57Z
- 当時の仕様・目的（本文抜粋）: 岐阜(21)・静岡(22)・愛知(23)・三重(24)の国交省2026年版N03を一体化して共通県境を生成し、県別20m軽量地図をCIで検証・出力。初期表示で岐阜県のみ読み込み、県を切り替えた際に必要なデータを取得。区域選択・容量・描画時間計測を含む独立試作ページを追加。全国版と試作5C、従来の近畿・九州の地図は変更しません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/127/files)（7ファイル）。主要変更先: `v2/national/official-2026-tokai-four-20m-trial.html`。
- 後続変更: [#132](https://github.com/Kussoon/kussoon.github.io/pull/132) → [#134](https://github.com/Kussoon/kussoon.github.io/pull/134) → [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) → [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S38=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #128

- PR: [V2: 東海4県の市区町村境を一度だけ描画して部分的な太線を解消](https://github.com/Kussoon/kussoon.github.io/pull/128)／分類: 境界・2026データ／マージ: 2026-11-01T14:27:16Z
- 当時の仕様・目的（本文抜粋）: iPhoneのスクリーンショットで美濃市・大垣市・関市等の選択時に一部の市境が不自然に濃く・太くなる症状を確認。原因は各市区町村のpolygonへ個別strokeを適用し、共有辺を重ね描きしていたことと、選択領域が地図のDOM順序により他領域に覆われること。修正では区域パスは塗りのみ、共通TopoJSONのarcを一度だけ独立レイヤに描画、その上に選択区域の輪郭を描き、全周均一にする。データ・他の地域・試作5C・全国版は変更しません。独立の構造・構文テスト付き。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/128/files)（2ファイル）。主要変更先: `v2/national/official-2026-tokai-four-20m-trial.html`。
- 後続変更: [#129](https://github.com/Kussoon/kussoon.github.io/pull/129) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S35=C, S36=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #129

- PR: [V2: 選択時の太い強調輪郭を廃止し市区町村境を同じ線幅に統一](https://github.com/Kussoon/kussoon.github.io/pull/129)／分類: 境界・2026データ／マージ: 2026-11-01T14:36:37Z
- 当時の仕様・目的（本文抜粋）: iPhoneで関市・美濃市・大垣市などを選択すると輪郭の一部が濃く・太く見える問題を修正。前回PR #128では通常境界を一回描画にしたが、選択区域に別途描く茶色の強調輪郭が残っていたため、視覚的には解消しなかった。今回は選択をオレンジ塗りのみで示し、選択中も通常の市区町村と同じ白色0.9の共通TopoJSONアーク境界だけを一回描画。選択専用の二重ストロークを完全に廃止する。東海4県試作ページと回帰テストのみ変更し、データ、全国版、試作5C、他地域には変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/129/files)（3ファイル）。主要変更先: `v2/national/official-2026-tokai-four-20m-trial.html`。
- 後続変更: [#130](https://github.com/Kussoon/kussoon.github.io/pull/130) → [#131](https://github.com/Kussoon/kussoon.github.io/pull/131) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S06=A, S35=C, S36=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #130

- PR: [V2: 過去7本の2026年版試作地図に境界線の単一描画を展開](https://github.com/Kussoon/kussoon.github.io/pull/130)／分類: 境界・2026データ／マージ: 2026-11-01T14:44:18Z
- 当時の仕様・目的（本文抜粋）: 東海4県で実機合格したPR #129の描画方式を過去の2026年版試作へ反映。対象は九州7県県別・九州沖縄8県県別・近畿6府県・中国四国9県・四国4県・兵庫和歌山・滋賀京都の計7ページ。全て区域パスを塗りのみとし、境界を共通TopoJSONアークから単一レイヤーで1回だけストローク、選択中はオレンジ色の塗りのみで強調する。広域版の府県境の濃色線は維持。区域数・TopoJSON等の地図データ・全国版・試作5Cは変更しない。専用CIで構文・表示アーキテクチャを検証。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/130/files)（8ファイル）。主要変更先: `v2/national/official-2026-chugoku-shikoku-nine-20m-trial.html`、`v2/national/official-2026-hyogo-wakayama-20m-trial.html`、`v2/national/official-2026-kinki-six-20m-trial.html`、`v2/national/official-2026-kyushu-okinawa-eight-20m-trial.html` 他。
- 後続変更: [#131](https://github.com/Kussoon/kussoon.github.io/pull/131) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S35=C, S36=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #131

- PR: [V2: 市区町村境の単一描画を共通JavaScript化し3地域へ適用](https://github.com/Kussoon/kussoon.github.io/pull/131)／分類: 境界・2026データ／マージ: 2026-11-01T14:54:23Z
- 当時の仕様・目的（本文抜粋）: 今後の全国47都道府県展開のため、実機で改善を確認した市区町村境の単一描画を `v2/shared/municipality-renderer.js` に切り出す。共通TopoJSONアークを一回だけ描画し、選択区域は塗り色のみ変更。まず東海4県・九州7県・九州沖縄8県の県別配信試作に採用し、描画ロジック重複を撤去。DOMスタブによる同一境界の重複描画防止・選択状態・タップ妨害防止テストとページ統合テストを自動実行。今後の地域への適用前に挙動を確認できるようにする。地図データ、全国版、試作5C、広域試作版は変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/131/files)（9ファイル）。主要変更先: `v2/national/official-2026-kyushu-okinawa-eight-20m-trial.html`、`v2/national/official-2026-kyushu-prefecture-20m-trial.html`、`v2/national/official-2026-tokai-four-20m-trial.html`、`v2/shared/municipality-renderer.js`。
- 後続変更: [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S35=C, S36=A
- 回帰テスト: [v2/shared/test-municipality-renderer.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-municipality-renderer.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #132

- PR: [V2: 北陸・甲信越6県 2026年版共通境界・県別20m配信](https://github.com/Kussoon/kussoon.github.io/pull/132)／分類: 境界・2026データ／マージ: 2026-11-01T14:57:53Z
- 当時の仕様・目的（本文抜粋）: 全国展開の次地域として、新潟(15)・富山(16)・石川(17)・福井(18)・山梨(19)・長野(20)を国交省2026年版N03から一括生成。県境アークを共有したまま各県の20m事前生成データを配信し、独立試作ページで県切替・市区町村選択・容量と描画時間を確認。PR #131の共通描画部品 `v2/shared/municipality-renderer.js` を最初から適用。全国版・試作5Cおよび既存地域の地図は変更せず、CI合格後に公開。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/132/files)（9ファイル）。主要変更先: `v2/national/official-2026-hokuriku-koshinetsu-six-20m-trial.html`。
- 後続変更: [#134](https://github.com/Kussoon/kussoon.github.io/pull/134) → [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) → [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S38=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #133

- PR: [V2: 富山・石川・福井が切り替わらない区域数判定を修正](https://github.com/Kussoon/kussoon.github.io/pull/133)／分類: 境界・2026データ／マージ: 2026-11-01T15:12:29Z
- 当時の仕様・目的（本文抜粋）: 北陸・甲信越6県の試作で、区域数が20未満の県を誤って拒否していたため、富山15・石川19・福井17区域が表示されない不具合を修正。新潟37、山梨27、長野77も含め、2026年N03から実測した県別の正確な区域数で照合する。国交省由来の地図データや共有描画エンジン、他地域のページは変更しない。新たに6県計192区域と20未満の3県を検証する回帰テストを追加。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/133/files)（2ファイル）。主要変更先: `v2/national/official-2026-hokuriku-koshinetsu-six-20m-trial.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #134

- PR: [V2: 関東7都県2026年版の共通境界・県別20m軽量配信](https://github.com/Kussoon/kussoon.github.io/pull/134)／分類: 境界・2026データ／マージ: 2026-11-01T15:25:29Z
- 当時の仕様・目的（本文抜粋）: 茨城(08)、栃木(09)、群馬(10)、埼玉(11)、千葉(12)、東京(13)、神奈川(14)の2026年国交省N03データを一体の共通境界から生成し、必要な都県だけを20m軽量配信する独立試作を追加。市区町村の表示は共通JavaScript `municipality-renderer.js` を使用し、選択時の太線を防止。以前の北陸3県のように『20区域未満は不正』という固定下限を排除し、5桁区域コード・都県接頭辞・コード重複を検証。CIで各都県データ、全境界、軽量化、試作ページのJS構文をチェック。全国版・試作5Cと既存地域は変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/134/files)（11ファイル）。主要変更先: `v2/national/official-2026-kanto-seven-20m-trial.html`。
- 後続変更: [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) → [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S38=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #135

- PR: [V2: 関東7都県で市区町村を選ぶと地図中央へ自動拡大](https://github.com/Kussoon/kussoon.github.io/pull/135)／分類: 地図操作／マージ: 2026-11-01T15:34:47Z
- 当時の仕様・目的（本文抜粋）: 東京都の島しょ部の町村がどこにあるか把握できないという実機報告に対応。市区町村をドロップダウンまたは地図タップで選択すると、選んだ区域の地理範囲を中心に自動拡大。離島が遠くに点在する町村では最大の島を代表として中心表示し、極小の島も見える最低倍率を設定。東京都の本土・伊豆・小笠原などの表示範囲を手動切替した場合、選択を解除してプリセットに戻す。範囲計算を共通レンダラーの `focusBounds` として実装し、今後ほかの都道府県の試作にも再利用可能にする。東京都の境界線描画やGeoJSONデータは変更しない。小島・離島集合・通常区域の中心化、JS構文、UI検証をCIでテスト。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/135/files)（4ファイル）。主要変更先: `v2/national/official-2026-kanto-seven-20m-trial.html`、`v2/shared/municipality-renderer.js`。
- 後続変更: [#137](https://github.com/Kussoon/kussoon.github.io/pull/137) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S18=要確認
- 回帰テスト: [v2/shared/test-municipality-renderer.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-municipality-renderer.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #136

- PR: [V2: 関東7都県の地図をピンチ拡大・ドラッグ移動・ボタン操作に対応](https://github.com/Kussoon/kussoon.github.io/pull/136)／分類: 地図操作／マージ: 2026-11-01T15:43:44Z
- 当時の仕様・目的（本文抜粋）: 東京都の離島で市区町村を選べても小さすぎて選択色が分からないという実機報告に対応。地図上でiPhoneピンチ拡大縮小、指ドラッグ移動、＋／−、全体に戻す、ダブルタップ相当のダブルクリック拡大、PCホイール拡大を利用可能にする。地図はSVG viewBoxを操作するため、ジェスチャーのたびに数MBのTopoJSONを再解析せず軽快に動作。選択中のオレンジ色と細い共通境界線を維持し、タップとドラッグを区別。全国へ流用できる `v2/shared/map-viewport.js` を追加。まず関東版に限定し、既存地図の描画コードとデータは変更しない。Node.jsでズーム基準点、ピンチ、ドラッグ、ホイール、リセット、UI統合を回帰テスト。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/136/files)（4ファイル）。主要変更先: `v2/national/official-2026-kanto-seven-20m-trial.html`、`v2/shared/map-viewport.js`。
- 後続変更: [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#224](https://github.com/Kussoon/kussoon.github.io/pull/224) → [#228](https://github.com/Kussoon/kussoon.github.io/pull/228) → [#239](https://github.com/Kussoon/kussoon.github.io/pull/239) → [#240](https://github.com/Kussoon/kussoon.github.io/pull/240) → [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S14=A, S17=A, S19=要確認, S20=要確認, S23=B
- 回帰テスト: [v2/shared/test-map-viewport.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-map-viewport.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #137

- PR: [V2: 東北6県2026年版の共通境界・県別20m軽量地図](https://github.com/Kussoon/kussoon.github.io/pull/137)／分類: 境界・2026データ／マージ: 2026-11-01T15:51:17Z
- 当時の仕様・目的（本文抜粋）: 青森(02)・岩手(03)・宮城(04)・秋田(05)・山形(06)・福島(07)の2026年国交省N03公式データを一体生成。都道府県境の共有アークを検証したうえで県ごとの20m軽量データを公開。共通市区町村描画エンジンで境界線を一度だけ描画し、選択時はオレンジ塗りのみ。関東版で追加した市区町村の自動中央表示とピンチ・ドラッグ・＋／−／全体表示を最初から導入。コード重複や区域数の一律下限判定は使わず県コード・重複を検証。従来の全国版・試作5C・他地方の地図は変更しない。専用CIで地図生成・表示ページ・JavaScriptを検査。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/137/files)（10ファイル）。主要変更先: `v2/national/official-2026-tohoku-six-20m-trial.html`。
- 後続変更: [#138](https://github.com/Kussoon/kussoon.github.io/pull/138) → [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S18=要確認, S38=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #138

- PR: [V2: 北海道2026年版の公式市区町村境界と20m軽量試作地図](https://github.com/Kussoon/kussoon.github.io/pull/138)／分類: 境界・2026データ／マージ: 2026-11-01T15:59:04Z
- 当時の仕様・目的（本文抜粋）: 全国47都道府県試作の最後として、国土交通省N03-2026北海道(01)を公式原データから生成し、20m簡略化の共通アークを検証。北海道の全市区町村（札幌市各区など行政区域コード単位）と離島を維持し、県別相当の単独20mデータを公開。市区町村選択の自動中央表示、共通の境界1回描画、iPhoneピンチ・ドラッグ・＋／−・全体ボタンを導入。区域コード・重複を検証し、固定の区域数下限は使わない。既存の全国版/試作5C/他地方には変更なし。公式N03ダウンロード・トポロジー生成・検証・配信用ファイル作成をCI実施。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/138/files)（5ファイル）。主要変更先: `v2/national/official-2026-hokkaido-20m-trial.html`。
- 後続変更: [#139](https://github.com/Kussoon/kussoon.github.io/pull/139) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S38=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #139

- PR: [V2: 全国47都道府県から市区町村へ進める2026年版統合試作](https://github.com/Kussoon/kussoon.github.io/pull/139)／分類: 境界・2026データ／マージ: 2026-11-01T16:15:43Z
- 当時の仕様・目的（本文抜粋）: 全国47都道府県の2026年版V2試作を一つの入口に統合。軽量な全国都道府県輪郭を最初に表示し、都道府県を選ぶと対応する詳細20m TopoJSONだけをオンデマンド配信。市区町村の選択・中央表示・オレンジ塗り、ピンチ拡大・パン、都道府県全体／日本全国に戻る操作、全国位置の小地図を搭載。既存の地方版を正本として再利用し、県別20mデータがなかった近畿6府県・中国四国9県は既存の合成TopoJSONから境界アークを変えずに個別抽出。GitHub Actionsで全国の軽量輪郭と必要な15県分の詳細データを生成、全47都道府県の存在・行政区域コード数・遷移先を検査。全国地図の表示用輪郭はナビゲーション目的の簡略化で、地方間をまたぐ県境の厳密な一致（全国一体トポロジー）は今回の対象外として別途検証し、既存公開ページや試作5Cは変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/139/files)（21ファイル）。主要変更先: `v2/data/national/2026-common/national-2026-pilot/manifest.json`、`v2/national/official-2026-nationwide-pilot.html`、`v2/tools/shared-topology/build-national-2026-pilot.mjs`。
- 後続変更: [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231) → [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S02=B, S05=要確認, S18=要確認, S20=要確認, S38=要確認
- 回帰テスト: [v2/tools/shared-topology/test-national-navigation.mjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test-national-navigation.mjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #140

- PR: [V2: 全国2026年版の地方間県境を読み取り専用で診断](https://github.com/Kussoon/kussoon.github.io/pull/140)／分類: 境界・2026データ／マージ: 2026-11-01T21:04:01Z
- 当時の仕様・目的（本文抜粋）: 47都道府県の統合入口完成後の次段階。これまで別々に生成した東北・関東・北陸甲信越・東海・近畿・中国四国等のTopoJSON間で、県境の一致を調べる読み取り専用ツールを追加。実測可能な陸上県境の組（例：福島—茨城・新潟、富山—岐阜、福井—滋賀、兵庫—鳥取・岡山）を対象に、各県の市区町村境界のうち外郭アークを抽出して互いの最短距離を測定し、中央値・95パーセンタイル・20m以内割合をJSONレポートとしてGitHub Actionsの成果物に記録。県境は既存の公式2026年データのまま変更せず、厳密一致の保証とは区別して地方間のずれを診断する。公開全国地図・試作5C・各県のデータは変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/140/files)（3ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#141](https://github.com/Kussoon/kussoon.github.io/pull/141) → [#187](https://github.com/Kussoon/kussoon.github.io/pull/187) → [#230](https://github.com/Kussoon/kussoon.github.io/pull/230) → [#233](https://github.com/Kussoon/kussoon.github.io/pull/233) → [#234](https://github.com/Kussoon/kussoon.github.io/pull/234) → [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) → [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) → [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S39=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #141

- PR: [V2: 地方間県境5組の100m間隔詳細診断と重ね合わせ地図](https://github.com/Kussoon/kussoon.github.io/pull/141)／分類: 境界・2026データ／マージ: 2026-11-01T21:15:11Z
- 当時の仕様・目的（本文抜粋）: PR #140の初期診断で追加調査対象になった5県境（山形―新潟、兵庫―岡山、兵庫―鳥取、福島―茨城、福島―新潟）を対象に、既存の2026年版20m行政区域TopoJSONの県外郭線を抽出し、相手県外郭線までの距離を100m間隔で測定する読み取り専用の診断を追加。計測値の中央値・95パーセンタイル・300m以内の最大観測値、20m以内の割合をJSON化。対になる県境を青と橙で重ね、ずれの大きい測定地点を赤点で表示するWeb試作を追加し、地図タップ・地点選択・ピンチ拡大で確認できるようにする。300m以内の近接点しか集計しないため、法的県境・全線最大値・完全一致は証明できないことを明記。GitHub Actionsで診断GeoJSONを生成しテストしてからPRにコミット。既存の47都道府県の市区町村データや全国統合版は変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/141/files)（10ファイル）。主要変更先: `v2/data/national/2026-common/cross-region-detail/index.json`、`v2/national/official-2026-cross-region-border-detail.html`。
- 後続変更: [#187](https://github.com/Kussoon/kussoon.github.io/pull/187) → [#230](https://github.com/Kussoon/kussoon.github.io/pull/230) → [#233](https://github.com/Kussoon/kussoon.github.io/pull/233) → [#234](https://github.com/Kussoon/kussoon.github.io/pull/234) → [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) → [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) → [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S39=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #142

- PR: [V2 全国統合試作：市区町村の地名検索とラベル表示を追加](https://github.com/Kussoon/kussoon.github.io/pull/142)／分類: 検索／マージ: 2026-11-01T21:26:08Z
- 当時の仕様・目的（本文抜粋）: 境界精度の深掘りはここで一区切りとし、市区町村を見つけて学びやすくする最初のUX改善。全国統合試作に地名検索入力と検索結果のボタンを設け、全国表示中は47都道府県名を検索、県を表示中はその県の市区町村名・5桁行政区域コードを検索して選択し、地図の中央に表示できるようにする。選択中の市区町村名ラベルは地図に常時表示、任意のチェックで全区域の名前を表示。地名正規化・最大ポリゴンへの代表点配置・読み仮名の任意表示は共通JS部品化。出典未確認の読みを推測したり、公式に存在しない読み仮名を表示したりしない。既存の詳細TopoJSONや他の公開地図は変更しない。対応するJavaScript回帰テストと全国UIの検索スモークテストを追加。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/142/files)（5ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`、`v2/shared/place-labels.js`。
- 後続変更: [#144](https://github.com/Kussoon/kussoon.github.io/pull/144) → [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) → [#148](https://github.com/Kussoon/kussoon.github.io/pull/148) → [#204](https://github.com/Kussoon/kussoon.github.io/pull/204)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S04=要確認, S30=要確認
- 回帰テスト: [v2/shared/test-place-labels.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-place-labels.cjs)、[v2/tools/shared-topology/test-national-navigation.mjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test-national-navigation.mjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #143

- PR: [V2: 全国市区町村ラベルを凹形・飛び地でも区域の中心寄りに配置](https://github.com/Kussoon/kussoon.github.io/pull/143)／分類: ラベル・読み／基盤／マージ: 2026-11-01T22:12:51Z
- 当時の仕様・目的（本文抜粋）: 全国統合V2の地名表示改善。従来は最大ポリゴンのバウンディングボックス中央に機械的に配置していたため、L字型・三日月形・内部に穴がある区域ではラベルが他市区町村や水域に載るおそれがあった。最大の陸地ポリゴンを選ぶ原則と重なり許容を維持しつつ、bbox中央が区域外なら区域内部の9×9候補を評価し、外周への距離と中央への近さを両立する代表点を選択。分離した小島へラベルが飛ばないようにし、弱参照キャッシュで描画ごとに繰り返し座標計算しない。L字型・穴あき・離島・四角形の回帰テストを追加。フォントサイズやラベルの重なりを強制的に減らすことはせず、境界TopoJSONと公開済みページのHTMLは変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/143/files)（2ファイル）。主要変更先: `v2/shared/place-labels.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: [v2/shared/test-place-labels.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-place-labels.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #144

- PR: [V2全国統合版：確認済み読み仮名の再利用と漢字・読み切替](https://github.com/Kussoon/kussoon.github.io/pull/144)／分類: ラベル・読み／基盤／マージ: 2026-11-01T22:32:39Z
- 当時の仕様・目的（本文抜粋）: 全国統合V2の2026年版市区町村マップで、既存の2021年版試作用535件のCC0自治体読みデータを使って『漢字＋読み仮名／漢字のみ』を切り替え可能にする。5桁行政区域コードと表示名が一致した自治体にだけ読みを付与し、不一致・未収録は漢字のまま。政令市区では親市の名前・読み、区の名前・読みを4行で表示。市町村の漢字本体の縦位置を読みのON/OFFで動かさない。地名検索にも確認済み読みを使い、都道府県ごとに一致・未収録・名称不一致の件数を見える化する。読みデータは既存の v2/data/national/municipality-readings.json を再利用し、独立して遅延取得。旧データに存在しても2026年に名称変更された区へ古い読みを誤適用しない。全国共通の読み対応モジュールと回帰テスト、統合UIテストを追加。既存の地図境界・他ページ・正式公開版は変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/144/files)（7ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`、`v2/shared/place-labels.js`、`v2/shared/reading-bridge.js`。
- 後続変更: [#145](https://github.com/Kussoon/kussoon.github.io/pull/145) → [#146](https://github.com/Kussoon/kussoon.github.io/pull/146) → [#170](https://github.com/Kussoon/kussoon.github.io/pull/170) → [#204](https://github.com/Kussoon/kussoon.github.io/pull/204) → [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S24=B, S26=B, S28=A, S30=要確認, S31=B
- 回帰テスト: [v2/shared/test-place-labels.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-place-labels.cjs)、[v2/shared/test-reading-bridge.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-reading-bridge.cjs)、[v2/tools/shared-topology/test-national-navigation.mjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test-national-navigation.mjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #145

- PR: [V2: 全国47都道府県の読み仮名データをCC0正本から拡充・照合](https://github.com/Kussoon/kussoon.github.io/pull/145)／分類: ラベル・読み／基盤／マージ: 2026-11-01T22:50:42Z
- 当時の仕様・目的（本文抜粋）: 前段PR #144の535件のみの読み仮名表示を、code4fukui/localgovjpのCC0全国1916レコード（取得時のGit blob SHAを記録したスナップショット）へ拡充。lgcodeの5桁自治体キーと明示的な氏名・読みのみを保存し、2026年版公式TopoJSONの全47都道府県・1905区域と5桁コードおよび市区町村名を照合する。名称不一致・未収録は読みを表示せず、すべての不一致と都道府県別カバー率を自動生成レポートへ記録。政令指定都市の区は親市名＋区名を厳格に確認し、読みの分割がない場合は未確認扱い。既存の2021年用535件の読みデータは変更しない。全国統合版は新しい読みデータを必要時だけ読み込み、行政区域の境界・市区町村名・正式公開ページは一切変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/145/files)（7ファイル）。主要変更先: `v2/data/national/municipality-readings-2026-coverage.json`、`v2/data/national/municipality-readings-all-source.json`、`v2/national/official-2026-nationwide-pilot.html`、`v2/shared/reading-bridge.js`。
- 後続変更: [#170](https://github.com/Kussoon/kussoon.github.io/pull/170) → [#204](https://github.com/Kussoon/kussoon.github.io/pull/204) → [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S28=A, S30=要確認, S31=B
- 回帰テスト: [v2/shared/test-reading-bridge.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-reading-bridge.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #146

- PR: [V2全国統合版：従来のラベル配置エンジンを復帰し市区町村の正式名称を保持](https://github.com/Kussoon/kussoon.github.io/pull/146)／分類: ラベル・読み／基盤／マージ: 2026-11-02T00:10:18Z
- 当時の仕様・目的（本文抜粋）: 全国統合2026年版で暫定の9×9候補ラベル処理を利用していた問題を修正し、旧V2で磨き込んだ label-engine.js / readable-labels.js / collision-refinement.js / region-fit.js をそのまま読み込んで再利用する変換アダプターを追加。2026年TopoJSONを描画時のSVG投影座標に変換し、中心バランス→衝突緩和→文字箱5x5区域内判定→境界余白の順に共通規則を適用。札幌市北区(01102)・熱海市(22205)の実2026年データによる回帰テストを追加。個別市町村の手動座標や元TopoJSONの変更なし。選択した区の map label は親市＋区を読み仮名付きで表示する一方、メニュー・検索・パンくずは正式な『静岡市葵区』などの fullName を使う。既存の県別遷移・検索・ピンチ拡大の動作を維持。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/146/files)（8ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`、`v2/shared/established-label-adapter.js`、`v2/shared/place-labels.js`、`v2/shared/reading-bridge.js`。
- 後続変更: [#225](https://github.com/Kussoon/kussoon.github.io/pull/225) → [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S21=B, S24=B, S29=要確認
- 回帰テスト: [v2/shared/test-established-label-adapter.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-established-label-adapter.cjs)、[v2/shared/test-reading-bridge.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-reading-bridge.cjs)、[v2/tools/shared-topology/test-national-navigation.mjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test-national-navigation.mjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #147

- PR: [V2全国統合版：市区町村名を覚える10問4択・地図クイズの第1試作](https://github.com/Kussoon/kussoon.github.io/pull/147)／分類: クイズ／マージ: 2026-11-02T01:54:58Z
- 当時の仕様・目的（本文抜粋）: 2026年公式TopoJSON・47都道府県の県別読み込み・正式市区町村名・従来V2ラベル配置エンジンをそのまま利用して、市区町村名を覚える4択クイズを追加。まず都道府県を選び、オレンジ色に示された区域を見て市区町村の正式名称を4つから選択（10問、同一区域の重複出題なし、正解数表示）。政令市の区は『静岡市葵区』の正式名で選択。所属未定地は出題対象外。クイズ中は正解ラベル・読み仮名やマップのホバータイトルを隠し、検索や区域選択から答えが分からないようにする。『次の問題へ』『クイズを終了』で状態を戻す。クイズを終えれば検索・区域選択・ズームなど既存操作に復帰。共通 quiz.js を独立させ、回答・スコア・停止・クイズと通常地図の切替を回帰テスト。行政区域座標・共通境界・通常の地名検索等は変更しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/147/files)（6ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`、`v2/shared/municipality-quiz.js`、`v2/shared/municipality-renderer.js`。
- 後続変更: [#149](https://github.com/Kussoon/kussoon.github.io/pull/149) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S32=C
- 回帰テスト: [v2/shared/test-municipality-quiz.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-municipality-quiz.cjs)、[v2/tools/shared-topology/test-national-navigation.mjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test-national-navigation.mjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #148

- PR: [V2全国統合版：従来の役所・役場吹き出しを近畿5府県から復帰](https://github.com/Kussoon/kussoon.github.io/pull/148)／分類: 選択・吹き出し／マージ: 2026-11-02T02:00:14Z
- 当時の仕様・目的（本文抜粋）: 既存の `v2/common/js/office-directory.js` と `v2/data/offices/25.json`〜`29.json` を再利用。全国版で市区町村を選ぶと、庁舎名・郵便番号・住所・公式サイト・Wikipedia・経路案内を表示。区は従来どおり区役所と市役所を両方表示可能。再タップで選択解除、×で吹き出しだけ閉じます。クイズ中は非表示。未整備の42都道府県には架空の住所を表示せず、後続拡張待ちと明記。5府県のデータだけ遅延読込。地図・ラベルエンジン・公式境界データは変更しません。既存全国試作ページ1ファイルのみの変更です。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/148/files)（2ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#204](https://github.com/Kussoon/kussoon.github.io/pull/204) → [#245](https://github.com/Kussoon/kussoon.github.io/pull/245)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S01=A, S02=B, S03=A, S04=要確認, S05=要確認, S07=A, S08=A
- 回帰テスト: [v2/tools/shared-topology/test-national-navigation.mjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test-national-navigation.mjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #149

- PR: [V2全国統合版：クイズ表示を保留し庁舎情報を優先](https://github.com/Kussoon/kussoon.github.io/pull/149)／分類: クイズ／マージ: 2026-11-02T02:01:40Z
- 当時の仕様・目的（本文抜粋）: 全国版クイズのUIのみ非表示にします。クイズ共通コードと既存テストは将来の再開に備えて保存します。全国版の市区町村選択・役所吹き出し・データには手を加えません。宝塚市等でクイズを先に完成させた後に再公開します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/149/files)（1ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S32=C
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #150

- PR: [V2全国庁舎データ整備：共通検証を追加](https://github.com/Kussoon/kussoon.github.io/pull/150)／分類: ラベル・読み／基盤／マージ: 2026-11-02T02:08:17Z
- 当時の仕様・目的（本文抜粋）: 全国47都道府県の自治体情報整備の前提として、庁舎住所データの形式を検証する回帰テストを追加します。既存5府県のコード、庁舎参照、親都市、郵便番号、住所、リンク形式を検証し、将来の都道府県ファイルも自動的に対象に含めます。2026行政区域・全国地図・クイズ機能の変更なし。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/150/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#151](https://github.com/Kussoon/kussoon.github.io/pull/151) → [#185](https://github.com/Kussoon/kussoon.github.io/pull/185)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S11=A
- 回帰テスト: [v2/common/js/test-office-directory-data.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/common/js/test-office-directory-data.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #151

- PR: [V2全国自治体情報：和歌山県30市町村の庁舎住所とリンクを追加](https://github.com/Kussoon/kussoon.github.io/pull/151)／分類: 庁舎・公式URL／マージ: 2026-11-02T02:10:59Z
- 当時の仕様・目的（本文抜粋）: 和歌山県の県公式『市町村役場の所在地一覧』を一次出典として、全30市町村の名称・郵便番号・住所・公式ホームページを登録。J-LIS自治体コード一覧と5桁コードを照合。Wikipediaリンク、経路案内は共通office-directory.jsで表示。30.jsonを県選択時だけ読み込み。クイズ・地図形状・ラベル配置には変更を加えません。出典：https://www.pref.wakayama.lg.jp/prefg/010600/02_gyosei/shichosonyakuba.html / https://www.j-lis.go.jp/spd/code-address/kinki/cms_15114183.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/151/files)（2ファイル）。主要変更先: `v2/data/offices/30.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#185](https://github.com/Kussoon/kussoon.github.io/pull/185)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S11=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #152

- PR: [V2全国自治体情報：三重県29市町の役所・役場データ追加](https://github.com/Kussoon/kussoon.github.io/pull/152)／分類: 庁舎・公式URL／マージ: 2026-11-02T02:47:34Z
- 当時の仕様・目的（本文抜粋）: 三重県29市町を既存office-directory.jsの共通形式で追加。所在地・郵便番号・5桁行政区域コードはJ-LIS及び三重県公式一覧、公式サイトは関西広域連合の自治体リンクを参照。Wikipedia・Googleマップへの導線は既存の共通吹き出しを再利用します。地図・ラベル配置・クイズを変更せず、24.jsonを県別遅延読み込みします。出典：https://www.j-lis.go.jp/spd/code-address/kinki/cms_14514183.html / https://www.pref.mie.lg.jp/SHICHOS/HP/23057019610.htm / https://www.kouiki-kansai.jp/koikirengo/jisijimu/bosai/bosaiportal/shicyoson/1522.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/152/files)（2ファイル）。主要変更先: `v2/data/offices/24.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #153

- PR: [V2全国自治体情報：鳥取・島根38市町村の庁舎情報を一括追加](https://github.com/Kussoon/kussoon.github.io/pull/153)／分類: 庁舎・公式URL／マージ: 2026-11-02T02:52:08Z
- 当時の仕様・目的（本文抜粋）: 鳥取県19市町村・島根県19市町村を既存庁舎ディレクトリの形式で追加。住所・郵便番号・5桁団体コードはJ-LIS、鳥取の所在地は鳥取県公式一覧とも照合、自治体公式サイトは両県公式リンク集を参照。Wikipediaは同名自治体を誤って案内しないよう県名付き記事検索を使用。既存office-directory.jsで経路案内・住所表示を再利用。県選択時の遅延読み込みのみ有効化し、地図形状・ラベル・クイズは変更なし。出典：https://www.j-lis.go.jp/spd/code-address/chuugoku/cms_15214184.html ; https://www.j-lis.go.jp/spd/code-address/chuugoku/cms_15314184.html ; https://www.pref.tottori.lg.jp/12510.htm ; https://www.pref.tottori.lg.jp/9577.htm ; https://www.pref.shimane.lg.jp/link01.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/153/files)（3ファイル）。主要変更先: `v2/data/offices/31.json`、`v2/data/offices/32.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #154

- PR: [V2全国自治体情報：岡山31・山口19区域の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/154)／分類: 庁舎・公式URL／マージ: 2026-11-02T02:55:13Z
- 当時の仕様・目的（本文抜粋）: 岡山県27市町村+岡山市4区（庁舎情報31区域、岡山市本体も含む）、山口県19市町を登録。J-LIS自治体コード・郵便番号・所在地の一覧と両県公式の自治体サイトリンク集を使用。岡山市4区には市役所・区役所2施設を表示できるようparentCodeを設定。全国試作の遅延読込対象を2県拡大。地図・クイズ・ラベル配置に変更なし。資料：https://www.j-lis.go.jp/spd/code-address/chuugoku/cms_15414184.html https://www.j-lis.go.jp/spd/code-address/chuugoku/cms_15614184.html https://www.pref.okayama.jp/page/kanrenlink.html https://www.pref.yamaguchi.lg.jp/soshiki/21/26969.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/154/files)（3ファイル）。主要変更先: `v2/data/offices/33.json`、`v2/data/offices/35.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #155

- PR: [V2全国自治体情報：広島県31区域の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/155)／分類: 庁舎・公式URL／マージ: 2026-11-02T02:56:34Z
- 当時の仕様・目的（本文抜粋）: 広島県内の市町および広島市8区について、J-LISの所在地・郵便番号・自治体コードと広島県の公式リンク集を参照し庁舎情報を登録。政令市区では区役所と市役所をともに表示します。県別遅延読み込みのみ追加し、地図形状・ラベル・クイズには変更を加えません。参考資料: https://www.j-lis.go.jp/spd/code-address/chuugoku/cms_15514184.html および https://www.pref.hiroshima.lg.jp/site/kankeikikanlink/1172556346224.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/155/files)（2ファイル）。主要変更先: `v2/data/offices/34.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #156

- PR: [V2全国自治体情報：徳島24・香川17市町村の庁舎データ追加](https://github.com/Kussoon/kussoon.github.io/pull/156)／分類: 庁舎・公式URL／マージ: 2026-11-02T02:59:40Z
- 当時の仕様・目的（本文抜粋）: 四国第1セット。徳島県24自治体・香川県17自治体に、役所住所・郵便番号・自治体コード・公式ウェブサイト・Wikipedia検索リンクを登録。県選択時のみ各県のJSONを読み込むようにします。徳島県は県公式の所在地・公式サイトリンクを正本として採用（J-LIS掲載後の三好市移転住所も反映）。香川県はJ-LIS住所・高松市公式リンク集を使用。既存の地図形状・ラベル・クイズ・地図操作UIは変更なし。資料：https://www.pref.tokushima.lg.jp/kenseijoho/kanrennochiiki/shichouson/ https://www.j-lis.go.jp/spd/code-address/shikoku/cms_15714186.html https://www.j-lis.go.jp/spd/code-address/shikoku/cms_15814186.html https://www.city.takamatsu.kagawa.jp/homepage/link/ken.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/156/files)（3ファイル）。主要変更先: `v2/data/offices/36.json`、`v2/data/offices/37.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #157

- PR: [V2全国自治体情報：愛媛20・高知34市町村の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/157)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:01:23Z
- 当時の仕様・目的（本文抜粋）: 四国第2セットとして、愛媛県20市町・高知県34市町村の所在地、郵便番号、公式サイトリンク、地図経路案内用データを追加。J-LIS市町村コード所在地一覧、愛媛県の自治体リンク集、高知県の市町村所在地資料とJ-LIS自治体リンク集を使用。共通庁舎吹き出しへの遅延読み込みを有効化。地図境界・ラベル・クイズ・地図右下操作は変更なし。資料：https://www.j-lis.go.jp/spd/code-address/shikoku/cms_15914186.html https://www.pref.ehime.jp/page/14990.html https://www.j-lis.go.jp/spd/code-address/shikoku/cms_16014186.html https://www.j-lis.go.jp/spd/map-search/shikoku/cms_166469148.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/157/files)（3ファイル）。主要変更先: `v2/data/offices/38.json`、`v2/data/offices/39.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #158

- PR: [V2全国自治体情報：佐賀20・長崎21市町の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/158)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:04:03Z
- 当時の仕様・目的（本文抜粋）: 九州の第1セット、佐賀県20市町・長崎県21市町の役所/役場名称、住所、郵便番号、5桁自治体コード、公式サイト、Wikipediaリンクを登録。既存の庁舎吹き出しと県別遅延読み込みを利用。佐賀県公式所在地・リンク一覧、長崎県公式リンク一覧、J-LIS、2026年更新の全国町村会所在地等で照合し、白石町・波佐見町などは更新資料を優先しました。地図形状・ラベル・クイズ・操作ボタンの変更なし。出典：https://www.pref.saga.lg.jp/kiji0034791/index.html https://www.pref.nagasaki.jp/pages/page-31.html https://www.j-lis.go.jp/spd/code-address/kyuusyuu/cms_16214187.html https://www.j-lis.go.jp/spd/code-address/kyuusyuu/cms_16314187.html https://www.zck.or.jp/soshiki/2/4029.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/158/files)（3ファイル）。主要変更先: `v2/data/offices/41.json`、`v2/data/offices/42.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #159

- PR: [V2全国自治体情報：熊本50・大分18区域の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/159)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:06:45Z
- 当時の仕様・目的（本文抜粋）: 九州第2セット。熊本県の45市町村＋熊本市5区＝50区域、大分県18市町村に郵便番号・所在地・庁舎名・公式サイト・Wikipediaへの導線を追加します。J-LIS自治体所在地・公式サイトリンク、熊本県主要市町村一覧、大分県公式リンク集に基づきます。熊本市5区は区役所＋市役所の両方を表示。地図境界・読み仮名・クイズ・地図操作UIは変更なし。出典：https://www.j-lis.go.jp/spd/code-address/kyuusyuu/cms_16414187.html ; https://www.j-lis.go.jp/spd/code-address/kyuusyuu/cms_16514187.html ; https://www.j-lis.go.jp/spd/map-search/kyuusyuu/cms_166969149.html ; https://www.pref.oita.jp/soshiki/75008/kennai-sityoson.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/159/files)（3ファイル）。主要変更先: `v2/data/offices/43.json`、`v2/data/offices/44.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #160

- PR: [V2全国自治体情報：宮崎26・鹿児島43市町村の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/160)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:10:04Z
- 当時の仕様・目的（本文抜粋）: 九州第3セットとして宮崎県26市町村・鹿児島県43市町村（離島町村を含む）に、庁舎住所・郵便番号・市町村コード・公式ホームページ・Wikipedia検索リンクを登録します。住所は宮崎県J-LISと鹿児島県公式2026年10月16日更新所在地一覧を参照し、公式サイトはJ-LIS自治体リンク一覧と照合しました。三島村・十島村は所在地が鹿児島市内にあることも正しく反映。県別遅延読込のみ追加し、地図・ラベル・クイズ・地図操作UIの変更なし。出典：https://www.j-lis.go.jp/spd/code-address/kyuusyuu/cms_16614187.html https://www.pref.kagoshima.jp/ab08/kensei/shityoson/gyosei/sityosonitiran.html https://www.j-lis.go.jp/spd/map-search/kyuusyuu/cms_167169149.html https://www.j-lis.go.jp/spd/map-search/kyuusyuu/cms_167269149.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/160/files)（3ファイル）。主要変更先: `v2/data/offices/45.json`、`v2/data/offices/46.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #161

- PR: [V2全国自治体情報：沖縄県41市町村の役所・役場データ追加](https://github.com/Kussoon/kussoon.github.io/pull/161)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:13:36Z
- 当時の仕様・目的（本文抜粋）: 沖縄県41市町村の郵便番号・所在地・行政区域コード・公式サイトを、J-LIS所在地一覧（2025年8月更新）と自治体リンク集に基づいて登録。竹富町役場が石垣市内に所在することも住所に反映。県選択時のみ追加JSONを読み込み、既存の共通吹き出しを使用します。地図形状・ラベル・クイズは変更しません。出典：https://www.j-lis.go.jp/spd/code-address/kyuusyuu/cms_16814187.html https://www.j-lis.go.jp/spd/map-search/kyuusyuu/cms_167369149.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/161/files)（2ファイル）。主要変更先: `v2/data/offices/47.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #162

- PR: [V2全国自治体情報：福岡県74市区町村の役所・区役所データを追加](https://github.com/Kussoon/kussoon.github.io/pull/162)／分類: 庁舎・公式URL／マージ: なし（closed）
- 当時の仕様・目的（本文抜粋）: 沖縄県PR #161の先行マージにより、officeReadyの同一行に競合が発生しました。福岡県74区域の同じ登録内容を最新mainから作成したPR #163へ移し、こちらは重複防止のためクローズします。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/162/files)（2ファイル）。主要変更先: `v2/data/offices/40.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#163](https://github.com/Kussoon/kussoon.github.io/pull/163) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 未採用（確定仕様ではない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #163

- PR: [V2全国自治体情報：福岡県74区域の庁舎情報を追加（競合解消）](https://github.com/Kussoon/kussoon.github.io/pull/163)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:14:56Z
- 当時の仕様・目的（本文抜粋）: PR #162 の変更を、沖縄県PR #161マージ後のmainを基点として再構成した競合解消版です。福岡県60市町村と北九州市・福岡市の14区、計74区域のデータを追加。沖縄県のofficeReadyを保持します。J-LISの2026年1月22日更新市町村所在地一覧・公式自治体リンク集を参照し、区役所と市役所を共に表示。地図・ラベル・クイズへの変更なし。https://www.j-lis.go.jp/spd/code-address/kyuusyuu/cms_16114187.html https://www.j-lis.go.jp/spd/map-search/kyuusyuu/cms_166669149.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/163/files)（2ファイル）。主要変更先: `v2/data/offices/40.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #164

- PR: [V2全国自治体情報：富山15・石川19市町村の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/164)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:22:34Z
- 当時の仕様・目的（本文抜粋）: 北陸2県の34市町村の郵便番号、自治体コード、役所・役場所在地、公式サイトリンクを登録。富山県はJ-LIS2024年住所表および富山県公式リンク集を参照。石川県は石川県公式2026年2月更新住所表・公式リンク一覧を優先し、能登地域も照合。県選択時の遅延読込だけ追加。地図形状・ラベル・クイズ・地図操作UIに変更なし。出典：https://www.j-lis.go.jp/spd/code-address/tyuubu/cms_13714182.html https://www.pref.toyama.jp/1021/kensei/kenseiunei/kensei/gaiyou/profile/city.html https://www.pref.ishikawa.lg.jp/sichousien/kennaiichiran2.html https://www.pref.ishikawa.lg.jp/link/
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/164/files)（3ファイル）。主要変更先: `v2/data/offices/16.json`、`v2/data/offices/17.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #165

- PR: [V2全国自治体情報：福井17・新潟38区域の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/165)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:25:17Z
- 当時の仕様・目的（本文抜粋）: 福井県17市町、新潟県30市町村＋新潟市8区（市本体の情報を含めると38区域）の庁舎名称・所在地・郵便番号・自治体コード・公式サイトを追加。福井県は県公式リンク集（住所併記）、新潟県はJ-LIS所在地一覧と公式リンク集を参照。新潟市8区には区役所＋市役所の両施設を表示する既存方式を適用。J-LIS新潟所在地一覧は2021年公開のため、今後の最新住所再検証が必要。県別JSONの遅延読み込みを追加し、地図・ラベル・クイズ・操作UIは変更なし。出典：https://www.pref.fukui.lg.jp/doc/dx-suishin/shimachi_list.html https://www.j-lis.go.jp/spd/code-address/tyuubu/cms_13614182.html https://www.j-lis.go.jp/spd/map-search/tyuubu/cms_163769145.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/165/files)（3ファイル）。主要変更先: `v2/data/offices/15.json`、`v2/data/offices/18.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #166

- PR: [V2全国自治体情報：山梨県27市町村の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/166)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:29:22Z
- 当時の仕様・目的（本文抜粋）: 山梨県27市町村の住所・郵便番号・自治体コード・公式サイトをJ-LIS住所一覧と自治体公式リンク、2026年全国町村会情報から登録します。既存共通庁舎吹き出しの読み込みのみ追加。地図・クイズ・ラベルには変更なし。出典: https://www.j-lis.go.jp/spd/code-address/tyuubu/cms_14014182.html https://www.j-lis.go.jp/spd/map-search/tyuubu/cms_164169145.html https://www.zck.or.jp/soshiki/2/4003.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/166/files)（2ファイル）。主要変更先: `v2/data/offices/19.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #167

- PR: [V2全国自治体情報：長野県77市町村の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/167)／分類: 庁舎・公式URL／マージ: なし（closed）
- 当時の仕様・目的（本文抜粋）: 山梨県PR #166が先にmainへマージされ、全国版のofficeReady行に競合するため、同内容を最新mainに再構成したPR #168へ移管しました。本PRは重複防止でクローズします。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/167/files)（2ファイル）。主要変更先: `v2/data/offices/20.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#168](https://github.com/Kussoon/kussoon.github.io/pull/168) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 未採用（確定仕様ではない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #168

- PR: [V2全国自治体情報：長野77市町村データ（山梨県反映後の競合解消）](https://github.com/Kussoon/kussoon.github.io/pull/168)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:30:27Z
- 当時の仕様・目的（本文抜粋）: PR #167の変更を山梨県PR #166マージ後のmainで作り直した競合解消版です。長野県77市町村の役所住所・郵便番号・自治体コード・公式サイトを登録。山梨県のofficeReady設定を保持し、全国試作の遅延読込のみ変更。長野県2026年10月16日更新公式一覧、J-LIS所在地、長野県市町村振興協会リンク一覧を参照。地図・ラベル・クイズ変更なし。出典：https://www.pref.nagano.lg.jp/shichoson/kensei/shichoson/gappei/gappei/mejiiko/ichiran/ https://www.j-lis.go.jp/spd/code-address/tyuubu/cms_14114182.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/168/files)（2ファイル）。主要変更先: `v2/data/offices/20.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #169

- PR: [V2全国自治体情報：岐阜県42市町村の庁舎情報を登録](https://github.com/Kussoon/kussoon.github.io/pull/169)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:33:05Z
- 当時の仕様・目的（本文抜粋）: 岐阜県42市町村の自治体コード・役所住所・郵便番号・公式サイトとWikipedia検索を共通office-directory形式で登録。2026年10月21日更新の岐阜県公式市町村一覧を住所の主な参照元とし、J-LISの5桁自治体コード・郵便番号と照合。全国版の県別遅延読込のみ追加し、2026行政境界・ラベル・クイズは変更なし。出典：https://www.pref.gifu.lg.jp/page/6058.html https://www.j-lis.go.jp/spd/code-address/tyuubu/cms_14214182.html https://www.gaic.or.jp/link/
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/169/files)（2ファイル）。主要変更先: `v2/data/offices/21.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #170

- PR: [V2全国自治体情報：静岡県41区域（静岡・浜松6区含む）庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/170)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:34:39Z
- 当時の仕様・目的（本文抜粋）: 静岡県35市町・静岡市3区・浜松市3区の計41区域に、庁舎住所・郵便番号・自治体コード・自治体公式サイトを登録。2024年以降の浜松市中央・浜名・天竜の3区に対応し、旧7区を登録しない。指定都市の区を選ぶと市役所と区役所の両方を表示。静岡県公式2024年2月所在地一覧・J-LIS区対応一覧・両政令市公式庁舎案内に基づく。地図形状・ラベル・クイズには変更なし。資料：https://www.pref.shizuoka.jp/kensei/shichozaisei/1044883/1012124.html https://www.j-lis.go.jp/spd/code-address/tyuubu/cms_14314182.html https://www.city.hamamatsu.shizuoka.jp/kikaku/kuseido/ https://www.city.shizuoka.lg.jp/s006303.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/170/files)（2ファイル）。主要変更先: `v2/data/offices/22.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#204](https://github.com/Kussoon/kussoon.github.io/pull/204) → [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S31=B
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #171

- PR: [V2全国自治体情報：愛知県70区域の役所・区役所情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/171)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:37:21Z
- 当時の仕様・目的（本文抜粋）: 愛知県54市町村（名古屋市含む）＋名古屋市16区、計70区域の5桁コード・役所住所・郵便番号・公式サイト・Wikipedia検索リンクを登録。J-LISと愛知県市役所・町村役場一覧を照合し、名古屋市千種区の庁舎所在地は名古屋市2026年1月更新の市公式一覧を優先。区選択時は区役所と名古屋市役所を両方表示。県別遅延ロードを有効化。地図境界・読み仮名・クイズ・右下ボタンには変更なし。県の元データは2023年時点のため、最新の庁舎所在地・公式リンクの個別確認は継続課題。出典 https://www.pref.aichi.jp/soshiki/shichoson/0000000276.html https://www.j-lis.go.jp/spd/code-address/tyuubu/cms_14414182.html https://www.city.nagoya.jp/kurashi/easyjapanese/1017897/1017899.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/171/files)（2ファイル）。主要変更先: `v2/data/offices/23.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #172

- PR: [V2全国自治体情報：栃木県25市町の庁舎データを追加](https://github.com/Kussoon/kussoon.github.io/pull/172)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:40:07Z
- 当時の仕様・目的（本文抜粋）: 関東地方第1弾。栃木県14市・11町の庁舎所在地、郵便番号、自治体コード、公式サイトおよびWikipedia検索リンクを登録。J-LISの2023年所在地コード一覧と栃木県公式所在地一覧、全国町村会2026年更新版を参照。全国試作の県別遅延読み込みだけ追加。地図・ラベル・クイズ・操作ボタンの変更なし。住所/公式URLの個別最新性とiPhone実機操作は別途監査対象。出典：https://www.j-lis.go.jp/spd/code-address/kantou/cms_13014181.html https://www.zck.or.jp/soshiki/2/4039.html https://www.pref.tochigi.lg.jp/c05/intro/tochigi/link/lkshityouson.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/172/files)（2ファイル）。主要変更先: `v2/data/offices/09.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #173

- PR: [V2全国自治体情報：茨城県44市町村の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/173)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:41:30Z
- 当時の仕様・目的（本文抜粋）: 関東地方第2セット。茨城県32市・12町村の庁舎名称、住所・郵便番号、自治体コード、公式サイト・Wikipedia検索リンクを登録。J-LIS2023年所在地コード一覧、茨城県公式所在地一覧、2026年全国町村会リンク集を参照。2023年に移転した大子町役場の現所在地も登録。栃木県PR #172マージ後のmainから作成し、茨城・栃木両県の遅延ロードを保持。地図・ラベル・クイズ・地図操作UIの変更なし。出典：https://www.j-lis.go.jp/spd/code-address/kantou/cms_12914181.html https://www.zck.or.jp/soshiki/2/4038.html https://www.pref.ibaraki.jp/towns/
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/173/files)（2ファイル）。主要変更先: `v2/data/offices/08.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #174

- PR: [V2全国自治体情報：群馬県35市町村の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/174)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:43:47Z
- 当時の仕様・目的（本文抜粋）: 群馬県35市町村の役所・役場住所、郵便番号、5桁市町村コード、公式サイト・Wikipedia検索リンクを登録。群馬県公式2026年8月10日更新「市町村役場等所在地一覧」を正本とし、群馬県町村会2026年4月30日一覧を併用。県別JSONを遅延読込し既存ポップアップに接続。地図形状・ラベル・クイズ・地図操作ボタンに変更なし。出典：https://www.pref.gunma.jp/page/14524.html https://gck.gr.jp/about/chousonchou
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/174/files)（2ファイル）。主要変更先: `v2/data/offices/10.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #175

- PR: [V2全国自治体情報：埼玉県73市区町村の庁舎情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/175)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:45:41Z
- 当時の仕様・目的（本文抜粋）: 埼玉県63市町村（さいたま市を含む）と、さいたま市10区の計73区域について役所所在地、郵便番号、地方公共団体コード、公式サイトを追加。さいたま市の区選択時は区役所と市役所を併記。J-LISの2024年1月24日更新所在地・自治体コード一覧とさいたま市公式区役所庁舎一覧、埼玉県公式市町村資料、朝霞市公式サイトリンクを参照。所在地一覧に古い可能性があるため全自治体の現在地・公式URL確認は別途監査対象。全国地図・ラベル・クイズ・地図操作ボタンは変更なし。資料：https://www.j-lis.go.jp/spd/code-address/kantou/cms_13214181.html https://www.city.saitama.lg.jp/008/001/p002685.html https://www.pref.saitama.lg.jp/a0107/jyuuminnokatahe/sityousondate.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/175/files)（2ファイル）。主要変更先: `v2/data/offices/11.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #176

- PR: [V2全国自治体情報：千葉県60区域（千葉市6区含む）庁舎データ追加](https://github.com/Kussoon/kussoon.github.io/pull/176)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:47:57Z
- 当時の仕様・目的（本文抜粋）: 千葉県54市町村＋千葉市6区の60区域の役所名・郵便番号・住所・地方公共団体コード・公式サイトを登録。千葉県公式2025年4月更新の自治体住所・公式リンク一覧を優先し、J-LIS2022年一覧とコード照合、2026年9月時点の町村会所在地とも照合。特に千葉市中央区の更新住所「中央3-10-8」を採用。県別officeReady遅延ロードを追加し、地図形状・ラベル・クイズ・操作UIは変更しない。出典：https://www.pref.chiba.lg.jp/kouhou/ichiran.html https://www.j-lis.go.jp/spd/code-address/kantou/cms_13314181.html https://www.chiba-chousonkai.jp/outline/member.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/176/files)（2ファイル）。主要変更先: `v2/data/offices/12.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #177

- PR: [V2全国自治体情報：神奈川県61区域の市役所・区役所情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/177)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:49:31Z
- 当時の仕様・目的（本文抜粋）: 神奈川県33市町村（横浜市・川崎市・相模原市含む）＋政令指定都市の28区、計61区域を登録。横浜市18区・川崎市7区・相模原市3区の区役所と親市役所を併記するofficeIdsを設定。住所・郵便番号・公式URLは神奈川県公式市町村一覧（2023年5月更新）とJ-LIS2023年9月一覧を照合。行政区の現所在地は最新改修の可能性もあるため公開後に再点検。千葉県を含む既存officeReady設定を保持。地図境界・ラベル・クイズ・操作ボタンへの変更なし。出典：https://www.pref.kanagawa.jp/docs/ie2/cnt/f530001/p780102.html https://www.j-lis.go.jp/spd/code-address/kantou/cms_13514181.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/177/files)（2ファイル）。主要変更先: `v2/data/offices/14.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #178

- PR: [V2全国自治体情報：東京都62区市町村の役所・役場情報を追加](https://github.com/Kussoon/kussoon.github.io/pull/178)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:52:46Z
- 当時の仕様・目的（本文抜粋）: 東京都の特別区23・市26・町5・村8、計62区市町村の庁舎所在地・郵便番号・5桁自治体コード・公式ホームページ・Wikipedia検索を登録。J-LIS 2025年12月26日更新の所在地コード一覧を正本とし、東京都の官公署一覧・2026年8月更新の公式区市町村リンク集を参照。東京23特別区は政令指定都市の行政区とは異なる独立自治体として、親市役所なし・区役所1件の表示。利島・御蔵島・青ヶ島・小笠原など島しょ部も含む。日野市の郵便番号は都庁の官公署一覧に従い191-8686を採用。地図境界・読み仮名・クイズ・地図操作は変更なし。出典：https://www.j-lis.go.jp/spd/code-address/kantou/cms_13414181.html https://www.metro.tokyo.lg.jp/tosei/iken-sodan/sodan/ichiran https://www.metro.tokyo.lg.jp/sitemap/link/link04
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/178/files)（2ファイル）。主要変更先: `v2/data/offices/13.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #179

- PR: [V2全国自治体情報：青森県40市町村の庁舎データ追加](https://github.com/Kussoon/kussoon.github.io/pull/179)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:56:17Z
- 当時の仕様・目的（本文抜粋）: J-LIS2026年7月更新の5桁コード・庁舎所在地一覧と、全国町村会2026年6月更新町村住所・公式URL一覧を照合し、青森県10市30町村の庁舎名・郵便番号・住所・公式サイトを登録。蓬田村・藤崎町・大間町・風間浦村はJ-LISと町村会で住所や郵便番号に差があり、全国町村会の2026年情報を採用。全国版遅延読込のみ変更、地図・ラベル・クイズは変更なし。出典：https://www.j-lis.go.jp/spd/code-address/touhoku/cms_12314180.html https://www.zck.or.jp/soshiki/2/4004.html https://www.pref.aomori.lg.jp/soshiki/zaimu/shichoson/shichoson.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/179/files)（2ファイル）。主要変更先: `v2/data/offices/02.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #180

- PR: [V2全国自治体情報：岩手県33市町村の庁舎データ追加](https://github.com/Kussoon/kussoon.github.io/pull/180)／分類: 庁舎・公式URL／マージ: 2026-11-02T03:57:30Z
- 当時の仕様・目的（本文抜粋）: 岩手県14市19町村の5桁市町村コード、役場名称、郵便番号・所在地・自治体公式URLを登録。J-LIS2022年12月27日更新所在地一覧を参照し、町村について全国町村会2026年6月11日更新所在地一覧を優先して照合。県公式の市町村ホームページ一覧をURL検査資料に使用。青森県の反映済みmainから作成し02・03両県の遅延読込を保持。地図・ラベル・クイズ・操作UIの変更なし。出典：https://www.j-lis.go.jp/spd/code-address/touhoku/cms_12414180.html https://www.zck.or.jp/soshiki/2/4015.html https://www.pref.iwate.jp/kensei/toukei/toukei/1012206.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/180/files)（2ファイル）。主要変更先: `v2/data/offices/03.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #181

- PR: [V2全国自治体情報：宮城県40区域（仙台市5区含む）庁舎情報の追加](https://github.com/Kussoon/kussoon.github.io/pull/181)／分類: 庁舎・公式URL／マージ: 2026-11-02T04:06:13Z
- 当時の仕様・目的（本文抜粋）: 宮城県35市町村・仙台市5区の計40区域に市区役所・町村役場の所在地、郵便番号、自治体コード、公式サイト・Wikipedia検索を登録。仙台市5区では区役所・仙台市役所を併記。J-LIS宮城県内市町村コード・住所一覧、宮城県公式市区役所所在地・自治体公式リンク集、仙台市公式市役所区役所案内を参照。地図形状・ラベル・クイズ・操作UIの変更なし。住所や公式URLの最新性・実機確認は別途全県最終監査で実施。資料：https://www.j-lis.go.jp/spd/code-address/touhoku/cms_12514180.html https://www.pref.miyagi.jp/soshiki/sichouson/syozaiti.html https://www.pref.miyagi.jp/soshiki/kohou/link01.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/181/files)（2ファイル）。主要変更先: `v2/data/offices/04.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #182

- PR: [V2全国自治体情報：秋田県25市町村の役所・役場データを追加](https://github.com/Kussoon/kussoon.github.io/pull/182)／分類: 庁舎・公式URL／マージ: 2026-11-02T04:07:24Z
- 当時の仕様・目的（本文抜粋）: 秋田県13市12町村の5桁自治体コード・役所住所・郵便番号・自治体公式サイトリンク・Wikipedia検索を登録。J-LIS秋田県内市町村住所一覧、秋田県公式2025年12月25日更新の市町村ホームページ一覧を参照。宮城県PR #181マージ後のmainに対して県別遅延ロードを追加し既存データを保持。行政境界・ラベル・クイズ・操作ボタンの変更なし。個別庁舎住所とURLの最新性は全国最終監査で検証。資料：https://www.j-lis.go.jp/spd/code-address/touhoku/cms_12614180.html https://www.pref.akita.lg.jp/pages/archive/569 https://www.j-lis.go.jp/spd/map-search/touhoku/cms_162569144.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/182/files)（2ファイル）。主要変更先: `v2/data/offices/05.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #183

- PR: [V2全国自治体情報：山形県35市町村の庁舎情報を登録](https://github.com/Kussoon/kussoon.github.io/pull/183)／分類: 庁舎・公式URL／マージ: 2026-11-02T04:26:56Z
- 当時の仕様・目的（本文抜粋）: 山形県35市町村の5桁自治体コード、役所・役場所在地、郵便番号、公式サイトとWikipedia検索リンクを追加。J-LIS2025年8月更新所在地一覧と山形県2026年6月更新公式市町村一覧、全国町村会2026年6月更新町村所在地を参考に登録。全国統合版の県別遅延読込だけ追加し、行政区域・ラベル・クイズには変更なし。公式URL個別到達と住所の最新性は最終監査で再点検。出典 https://www.pref.yamagata.jp/020024/kensei/information/gaiyo/murayama/index.html https://www.j-lis.go.jp/spd/code-address/touhoku/cms_12714180.html https://www.zck.or.jp/soshiki/2/4036.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/183/files)（2ファイル）。主要変更先: `v2/data/offices/06.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #184

- PR: [V2全国自治体情報：福島県59市町村の庁舎情報を登録](https://github.com/Kussoon/kussoon.github.io/pull/184)／分類: 庁舎・公式URL／マージ: 2026-11-02T04:28:27Z
- 当時の仕様・目的（本文抜粋）: 福島県59市町村の自治体コード、役所・役場所在地、郵便番号、公式サイト・Wikipedia検索を登録し、全国統合版の県別遅延読込に追加。J-LIS2022年住所一覧および福島県公式2026年1月22日更新の市役所・町村役場一覧を参照。双葉郡・相馬郡などの庁舎所在地も県公式の新しい掲載情報を優先して確認。市町村の個別公式URL到達・個別住所の最新性は最終監査課題として残す。行政区画・ラベル・クイズ・地図ボタン変更なし。出典：https://www.pref.fukushima.lg.jp/sec/01145a/yakuba.html https://www.j-lis.go.jp/spd/code-address/touhoku/cms_12814180.html https://www.j-lis.go.jp/spd/map-search/touhoku/cms_162769144.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/184/files)（2ファイル）。主要変更先: `v2/data/offices/07.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #185

- PR: [V2全国自治体情報：北海道189区域を登録し47都道府県を完備](https://github.com/Kussoon/kussoon.github.io/pull/185)／分類: 庁舎・公式URL／マージ: 2026-11-02T04:33:21Z
- 当時の仕様・目的（本文抜粋）: 北海道179市町村＋札幌市10区の合計189区域について、地方公共団体コード・役所所在地・郵便番号・市町村公式サイト・Wikipedia検索を登録。2026年2月24日更新J-LIS北海道自治体住所一覧から住所とコードを取得し、北海道公式『道内179市町村／50音別』から市町村別公式URLを自動照合・生成（生成スクリプトを再利用可能な形で同梱）。札幌市中央区役所は札幌市公式2025年2月25日更新住所『南3条西11丁目330番地2』を優先。札幌市10区は市役所と区役所を併記。生成段階で189地域・189施設、179公式サイト、札幌10区の親市紐付け、郵便番号・コード形式を検査。全国試作のofficeReadyを01〜47すべて有効化し、全47都道府県の庁舎JSONデータ登録完了。地図形状・ラベル・クイズには変更なし。生成用ワークフローは自動作成後削除済み。全県リンク到達・住所最新性およびiPhone操作は最終監査対象。出典：https://www.j-lis.go.jp/spd/code-address/hokkaido/cms_12214179.html https://www.pref.hokkaido.lg.jp/link/shichoson/aiueo.html https://www.city.sapporo.jp/shimin/koseki/toiawase.html
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/185/files)（3ファイル）。主要変更先: `v2/data/offices/01.json`、`v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S11=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #186

- PR: [V2全国監査：47都道府県の地図と庁舎データのコード完全照合](https://github.com/Kussoon/kussoon.github.io/pull/186)／分類: 庁舎・公式URL／マージ: 2026-11-02T04:40:09Z
- 当時の仕様・目的（本文抜粋）: 47都道府県の20m全国地図（計1,905ポリゴン）と庁舎データ（計1,912施設）を区域コード単位で直接照合しました。差分は地図専用の13区域（北方領土6村と所属未定地7区域）、庁舎データ専用の政令指定都市20市（行政区とは別に市役所の情報が必要）だけで、想定外不一致は0です。コード照合スクリプト v2/scripts/audit-office-map-codes.cjs と機械読取可能な全県詳細結果 v2/audit/office-map-coverage-20261102.json を追加し、将来の差分監査を再実行可能にしました。各政令指定都市の親市役所が実際に区のofficeIdsから参照されていることも検証。既存データ・地図描画・ポップアップUIは一切変更しません。なお自治体の住所最新性、公式サイトのリンク到達、iPhone実機での表示・操作はこのコード照合では保証されないため別途Workによる実ブラウザ監査を推奨します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/186/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S40=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #187

- PR: [V2: 全国共通トポロジーの県境比較試作を追加](https://github.com/Kussoon/kussoon.github.io/pull/187)／分類: 庁舎・公式URL／マージ: 2026-11-02T05:48:05Z
- 当時の仕様・目的（本文抜粋）: 2026年版の国土数値情報を全国一括でTopoJSON化し、既存の県別データと県境を重ねて比較する独立試作です。 / 国交省の2026年行政区域データ47県分をCI実行時に取得・変換 / 全国一括で topology / 20m向け簡略化を行ってから県別TopoJSONへ切り分け
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/187/files)（6ファイル）。主要変更先: `v2/data/national/2026-common/national-shared-border-pilot/manifest.json`、`v2/national/official-2026-nationwide-shared-border-pilot.html`、`v2/tools/shared-topology/extract-national-border-pilot.mjs`。
- 後続変更: [#230](https://github.com/Kussoon/kussoon.github.io/pull/230) → [#233](https://github.com/Kussoon/kussoon.github.io/pull/233) → [#234](https://github.com/Kussoon/kussoon.github.io/pull/234) → [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) → [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) → [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S39=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #188

- PR: [V2全国監査：47都道府県の自治体公式サイトURL到達性検査](https://github.com/Kussoon/kussoon.github.io/pull/188)／分類: 庁舎・公式URL／マージ: 2026-11-02T06:54:23Z
- 当時の仕様・目的（本文抜粋）: 全国47都道府県の1,912区域に登録された自治体公式サイトURLを重複排除してHTTP GETで照合する再実行可能な監査スクリプトを追加。外部サイトへの通信は最大10並列・10秒タイムアウト、404/410をリンク切れ候補、403/429をアクセス制限・要再確認、5xx・タイムアウトを暫定的な通信失敗として分類。区役所・市役所等の重複リンクは1回だけアクセスし、全区域の対応関係は結果に保持。GitHub Actionsの一時ワークフローで結果をレポートJSONに保存し、結果確認後にワークフローを削除する方針。今回の監査では公開ページ・地図・庁舎JSONは修正しない。HTTP到達は公式URLの自治体との正当な対応関係までは保証しない。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/188/files)（3ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #189

- PR: [V2全国自治体情報：公式URL監査で判明した6自治体のリンクを修正](https://github.com/Kussoon/kussoon.github.io/pull/189)／分類: 庁舎・公式URL／マージ: 2026-11-02T06:56:30Z
- 当時の仕様・目的（本文抜粋）: PR #188の全件HTTP監査（登録区域1,912／固有URL1,792、HTTP 2xx=1,713、接続等の要再確認79件）に続き、自治体自身の2026年公開公式サイトをWeb上で個別確認できた6件について、公式サイトのURLのみ更新。対象：北海道滝川市01225 https://www.city.takikawa.lg.jp/、宮城県松島町04401 https://www.town.miyagi-matsushima.lg.jp/、秋田県八峰町05349 https://www.town.happo.lg.jp/、山形県最上町06362 https://town.mogami.lg.jp/、長野県大桑村20430 https://www.vill.okuwa.lg.jp/、熊本県高森町43428 https://www.town.kumamoto-takamori.lg.jp/。住所・郵便番号・Wikipedia・経路・地図形状・ラベル・クイズは変更なし。他の73件（SSL・タイムアウト・アクセス制限など）は証拠不十分のため無変更。元データ47ファイルのうち6ファイルのofficial項目だけ修正。代表公式サイトは2026年新着情報等を表示し現在運営中であることを確認。PR #188監査レポートを正本とし、残余は段階的に再監査する。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/189/files)（6ファイル）。主要変更先: `v2/data/offices/01.json`、`v2/data/offices/04.json`、`v2/data/offices/05.json`、`v2/data/offices/06.json` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #190

- PR: [V2全国監査・公式サイトの現行URLへ更新（第2弾6自治体）](https://github.com/Kussoon/kussoon.github.io/pull/190)／分類: 庁舎・公式URL／マージ: 2026-11-02T07:01:21Z
- 当時の仕様・目的（本文抜粋）: 全国URL到達性監査 PR #188／第1弾修正 PR #189 の次段階。要再確認73件をSSL証明書・TLS・DNS・403・5xx・タイムアウトに分類し、自治体の最新公式サイトを公開Webで個別照合。明確に現行公式URLを確認できた6件のregions[*].officialのみを変更：岐阜県白川村 21604 https://www.vill.shirakawa.lg.jp/ ／和歌山県御坊市 30205 https://www.city.gobo.lg.jp/ ／高知県梼原町 39405 https://www.town.yusuhara.lg.jp/ ／静岡県東伊豆町 22301 https://www.town.higashiizu.lg.jp/ ／北海道標茶町 01664 https://town.shibecha.hokkaido.jp/ ／群馬県南牧村 10383 https://nanmoku.ne.jp/ 。実際の自治体公式サイトのページ内容・2026年更新記事を確認。旧URLがSSL失敗でも現行のまま公式サイトとして閲覧できる自治体は変更せず。自治体コード・郵便番号・住所・Wikipedia・地図・クイズ・UIを変更しない。出典：https://www.vill.shirakawa.lg.jp/ https://www.city.gobo.lg.jp/ https://www.town.yusuhara.lg.jp/ https://www.town.h
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/190/files)（6ファイル）。主要変更先: `v2/data/offices/01.json`、`v2/data/offices/10.json`、`v2/data/offices/21.json`、`v2/data/offices/22.json` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #191

- PR: [V2全国URL監査・第3弾：自治体公式サイト4件の現行URLへ更新](https://github.com/Kussoon/kussoon.github.io/pull/191)／分類: 庁舎・公式URL／マージ: 2026-11-02T07:32:27Z
- 当時の仕様・目的（本文抜粋）: PR #188の全国公式URL監査で要確認となったURLのうち、2026年現在の自治体公式ホームページを個別に検索・確認できた4件だけを修正します。紋別市01219（旧mombetsu.jp→www.mombetsu.jp）、田子町02443（旧town.takko.aomori.jp→town.takko.lg.jp）、久慈市03207（旧city.kuji.iwate.jp→city.kuji.lg.jp）、海南市30202（旧city.kainan.wakayama.jp→city.kainan.lg.jp）。公式URLの値以外は一切変更せず、住所・郵便番号・地図・吹き出し・クイズへの影響を避けます。検証根拠：紋別市公式サイトの2026年10月更新記事（https://www.mombetsu.jp/）、田子町公式トップ（https://www.town.takko.lg.jp/）、久慈市公式ページ（https://www.city.kuji.lg.jp/kurashi_tetsuzuki/johotsushin/4863.html）、海南市公式2026年更新サイト（https://www.city.kainan.lg.jp/）。他のHTTP通信エラーは未確認であるため無変更。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/191/files)（4ファイル）。主要変更先: `v2/data/offices/01.json`、`v2/data/offices/02.json`、`v2/data/offices/03.json`、`v2/data/offices/30.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #192

- PR: [V2公式サイトURL監査・第4弾：宇陀市と九度山町の現行公式URLを反映](https://github.com/Kussoon/kussoon.github.io/pull/192)／分類: 庁舎・公式URL／マージ: 2026-11-02T07:34:18Z
- 当時の仕様・目的（本文抜粋）: 2026年11月2日時点の自治体公式トップページにて更新情報を確認し、従来ドメインのTLS・証明書エラーによって機械検査が失敗した2件を現行の公式ドメインへ変更。宇陀市(29212) https://www.city.uda.lg.jp/、九度山町(30343) https://www.town.kudoyama.lg.jp/。公式サイト側の2026年11月2日更新記事で実在を確認。各県のoffice JSON regions[*].officialのみ変更し、地図・住所・郵便番号・UI・クイズ等は無変更。参照資料：https://www.city.uda.lg.jp/ https://www.town.kudoyama.lg.jp/。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/192/files)（2ファイル）。主要変更先: `v2/data/offices/29.json`、`v2/data/offices/30.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #193

- PR: [V2全国公式URL監査：確認済み9自治体の公式URLを更新](https://github.com/Kussoon/kussoon.github.io/pull/193)／分類: 庁舎・公式URL／マージ: 2026-11-02T08:21:34Z
- 当時の仕様・目的（本文抜粋）: PR #188の要確認61自治体について、実ブラウザで現行公式ページが表示され、自治体名・役所情報を確認できた9件のみを更新します。 / 各新URLは実ブラウザで開き、ページ名や自治体自身の公式ページの情報を確認しました。監査全件結果は別PRで保存します。全国版CIの合格を確認後にSquash and mergeします。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/193/files)（7ファイル）。主要変更先: `v2/data/offices/01.json`、`v2/data/offices/10.json`、`v2/data/offices/21.json`、`v2/data/offices/24.json` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #194

- PR: [V2全国公式URL監査：残り61件のA/B/C判定を記録](https://github.com/Kussoon/kussoon.github.io/pull/194)／分類: 庁舎・公式URL／マージ: 2026-11-02T08:23:11Z
- 当時の仕様・目的（本文抜粋）: PR #188の要確認79件から、PR #189〜#192で修正済みの18自治体を自治体コードで除外した61件について、登録URLの実ブラウザ確認、機械監査結果、A/B/C判定、確認根拠と日時をJSONに記録します。 / 集計：A（登録URLで利用可）6件、B（現行公式URLを実ブラウザで確認し修正）9件、C（恒久移転先・到達性を確定できず保留）46件。 / 修正済み9件はPR #193でmainへマージ済みです。Cは通信エラーだけでリンク切れと断定せず、メンテナンスや一時停止を含め未確認理由を記録しています。今回のPRは監査記録のJSONファイル1件のみです。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/194/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #195

- PR: [Refresh nationwide office data cache key](https://github.com/Kussoon/kussoon.github.io/pull/195)／分類: 庁舎・公式URL／マージ: 2026-11-02T08:44:48Z
- 当時の仕様・目的（本文抜粋）: 全国版試作ページの庁舎JSON取得URLのキャッシュキーを `v=2` から `v=3` に更新します。 / PR #193で修正した公式サイトURLが、ブラウザに残る旧 `?v=2` データにより吹き出しへ反映されない問題への対応です。HTMLの該当箇所1か所のみ変更しています。 / 公開版では、中津川市（21206）の吹き出しが旧URLを表示し、新しいURLへ切り替わらないことを確認済みです。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/195/files)（1ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #196

- PR: [Update official URLs for Toyako and Urakawa](https://github.com/Kussoon/kussoon.github.io/pull/196)／分類: 庁舎・公式URL／マージ: 2026-11-02T14:33:13Z
- 当時の仕様・目的（本文抜粋）: 北海道洞爺湖町（01584）の公式URLを町公式サイトの現行URLへ更新 / 北海道浦河町（01607）の公式URLを町公式サイトの現行URLへ更新 / follow-up監査JSONの2件をCからBに更新（合計 A=6 / B=11 / C=44）
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/196/files)（2ファイル）。主要変更先: `v2/data/offices/01.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #197

- PR: [Refresh nationwide office cache after Hokkaido URL updates](https://github.com/Kussoon/kussoon.github.io/pull/197)／分類: 庁舎・公式URL／マージ: 2026-11-02T14:35:10Z
- 当時の仕様・目的（本文抜粋）: 全国版試作ページの庁舎JSON取得キーを `v=3` から `v=4` に更新します。PR #196で修正した洞爺湖町・浦河町のURLが、旧 `?v=3` データを読む公開ページに反映されていないことを確認したためです。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/197/files)（1ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #198

- PR: [Record browser follow-up for unresolved official URLs](https://github.com/Kussoon/kussoon.github.io/pull/198)／分類: 庁舎・公式URL／マージ: 2026-11-02T14:46:14Z
- 当時の仕様・目的（本文抜粋）: Add dated follow-up observations for 11 C-class municipalities. / Preserve the original A/B/C classifications and counts; no official URLs or office data are changed. / Record temporary notices and connection failures observed in the public browser, plus the current Aomori prefecture directory references.
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/198/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #199

- PR: [Reclassify verified official URLs for Miyaki and Shiroishi](https://github.com/Kussoon/kussoon.github.io/pull/199)／分類: 庁舎・公式URL／マージ: 2026-11-02T14:56:47Z
- 当時の仕様・目的（本文抜粋）: Recheck the registered URLs for Miyaki Town (41346) and Shiroishi Town (41425) in the public browser. / Reclassify both from C to A because their registered official pages load and show municipality updates and office information. / Keep official URL data unchanged; update only the audit JSON and its counts (A 8, B 11, C 42).
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/199/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #200

- PR: [Record follow-up checks for eight Hokkaido URLs](https://github.com/Kussoon/kussoon.github.io/pull/200)／分類: 庁舎・公式URL／マージ: 2026-11-02T15:00:04Z
- 当時の仕様・目的（本文抜粋）: Record browser rechecks for eight Hokkaido municipalities provided in the follow-up list. / Keep all eight as C because the pages either failed to load, timed out, or showed an official temporary suspension notice. / Preserve current URL values and the audit counts (A 8, B 11, C 42).
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/200/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #201

- PR: [Record four municipality screenshot checks](https://github.com/Kussoon/kussoon.github.io/pull/201)／分類: 庁舎・公式URL／マージ: 2026-11-02T16:30:27Z
- 当時の仕様・目的（本文抜粋）: Record user-provided Safari screenshots for Kohoku, Hyuga, Ibusuki, and Minamitane. / Reclassify Kohoku and Minamitane from C to A based on visible official site content at registered hosts. / Keep Hyuga and Ibusuki at C because the screenshots show temporary outage notices rather than a normal homepage.
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/201/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #202

- PR: [Record Rishiri official site screenshot evidence](https://github.com/Kussoon/kussoon.github.io/pull/202)／分類: 庁舎・公式URL／マージ: 2026-11-02T16:33:31Z
- 当時の仕様・目的（本文抜粋）: Record the user-provided Safari screenshot showing the Rishiri Town official site at https://rishiri-town.jp/. / Reclassify Rishiri Town from C to B: the current official host is visible, while redirect from the registered URL is not established by the screenshot. / Update totals to A 10 / B 12 / C 39.
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/202/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #203

- PR: [Reclassify screenshot-verified municipality sites](https://github.com/Kussoon/kussoon.github.io/pull/203)／分類: 庁舎・公式URL／マージ: 2026-11-02T16:38:25Z
- 当時の仕様・目的（本文抜粋）: Reconcile the audit with the user's Safari screenshots and screen recording. / Reclassify 31 municipalities from C/B to A where the official site or an official notice is visibly confirmed, including Kashima City and Rishiri Town. / Keep Hyuga City at C because the screenshot shows a temporary page and does not establish the regular homepage URL.
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/203/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #204

- PR: [V2全国統合版：全国表示から市区町村名・読み仮名・コードで直接検索](https://github.com/Kussoon/kussoon.github.io/pull/204)／分類: 検索／マージ: 2026-11-02T17:02:06Z
- 当時の仕様・目的（本文抜粋）: ユーザーから『中津川市と入力しても岐阜県を先に選ばなければ検索できない』との指摘。現状は全国表示中に都道府県名のみ検索。すでに使っている2026年全国自治体名称・読み仮名データ（municipality-readings-all-source.json）の1916レコードを軽量な遅延読み込み検索インデックスとして活用。全国表示中に自治体名・読み仮名・5桁コードを入力した場合も検索結果に都道府県名を併記し、候補タップで該当県の20m地図だけロードして該当自治体を選択／中央表示。既存県選択時の検索は維持。政令指定都市の親市は地図ポリゴンが存在しないため全国候補から除外し、行政区を候補に表示。大量の県別TopoJSONを先読みせず、iPhoneのメモリ負荷を維持。検索データ取得エラー時は従来の県選択に誘導。庁舎データや公式URL、地図、ラベル計算、クイズロジックは変更なし。 / 全国表示で『中津川市』『なかつがわし』『21206』→岐阜県＞中津川市の候補→選択後吹き出しと公式サイトリンク / 『西宮市』『芦屋市』『北海道』での検索、同名自治体の県名併記、区の検索
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/204/files)（1ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#231](https://github.com/Kussoon/kussoon.github.io/pull/231)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S04=要確認, S30=要確認, S31=B
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #205

- PR: [監査進行中：全国1,912区域の公式URL台帳を追加](https://github.com/Kussoon/kussoon.github.io/pull/205)／分類: 庁舎・公式URL／マージ: 2026-11-03T10:53:58Z
- 当時の仕様・目的（本文抜粋）: 庁舎データ1,912区域を自治体コードで管理する全国公式URL監査台帳です。地図の1,905区域とは対象定義を区別しています。 / 現在の状態（2026-11-03） / 未判定：3（既存61件内3件＋その他0件）
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/205/files)（1ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#212](https://github.com/Kussoon/kussoon.github.io/pull/212)
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S09=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #206

- PR: [fix(v2): 東吉野村の公式サイトURLからwwwを除去](https://github.com/Kussoon/kussoon.github.io/pull/206)／分類: 庁舎・公式URL／マージ: 2026-11-02T23:12:24Z
- 当時の仕様・目的（本文抜粋）: 東吉野村 (29453) の `regions["29453"].official` を安全に表示できる `https://vill.higashiyoshino.nara.jp/` に変更します。旧 `https://www.vill.higashiyoshino.nara.jp/` はユーザーのiPhone Safariで証明書警告、今回のWeb取得でもエラーとなりました。新URLは東吉野村公式トップ、2026年のお知らせ、村役場の住所・電話番号を確認済みです。 / GitHub Actions合格と差分精査後にSquash and merge対象。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/206/files)（1ファイル）。主要変更先: `v2/data/offices/29.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #207

- PR: [fix(v2): 利尻町の登録公式サイトURLを現行ドメインへ変更](https://github.com/Kussoon/kussoon.github.io/pull/207)／分類: 庁舎・公式URL／マージ: 2026-11-02T23:17:07Z
- 当時の仕様・目的（本文抜粋）: 自治体コード01518。ユーザー実機で https://rishiri-town.jp/ の利尻町公式サイトを確認し、国立国会図書館WARPでも発行者・現行起点URLを利尻町 / https://rishiri-town.jp/ と確認。現行トップには2026年11月2日のお知らせと役場連絡先が掲載。旧登録 https://www.town.rishiri.hokkaido.jp/ は今回のアクセスでタイムアウトし、現在の正常到達を確認できませんでした。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/207/files)（1ファイル）。主要変更先: `v2/data/offices/01.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #208

- PR: [fix(v2): 由良町の公式サイトURLを現行ドメインへ更新](https://github.com/Kussoon/kussoon.github.io/pull/208)／分類: 庁舎・公式URL／マージ: 2026-11-02T23:41:49Z
- 当時の仕様・目的（本文抜粋）: 自治体コード30383（由良町）の `regions["30383"].official` を現行の町公式サイト `https://www.town.yura.lg.jp/` に更新 / 現行の由良町公式サイト: https://www.town.yura.lg.jp/ / 和歌山県日高振興局の市町リンク: https://www.pref.wakayama.lg.jp/prefg/130500/
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/208/files)（1ファイル）。主要変更先: `v2/data/offices/30.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #209

- PR: [fix(v2): 日向市の公式サイトURLを現行ドメインへ更新](https://github.com/Kussoon/kussoon.github.io/pull/209)／分類: 庁舎・公式URL／マージ: 2026-11-02T23:46:40Z
- 当時の仕様・目的（本文抜粋）: 自治体コード45206（日向市）の `regions["45206"].official` を現行の公式URL `https://www.hyugacity.jp/` に更新 / 日向市公式ホームページの停止案内（現在の公式ドメイン）: https://www.hyugacity.jp/ / 日向市公式ホームページリニューアル等業務委託仕様書（現行公式ホームページのURLを記載）: https://www.hyugacity.jp/tempimg/20260611184204.pdf
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/209/files)（1ファイル）。主要変更先: `v2/data/offices/45.json`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #210

- PR: [fix(v2): refresh nationwide office JSON cache key](https://github.com/Kussoon/kussoon.github.io/pull/210)／分類: 庁舎・公式URL／マージ: 2026-11-02T23:50:50Z
- 当時の仕様・目的（本文抜粋）: 全国地図ページの庁舎JSON取得URLのキャッシュキーを `v=4` から `v=5` に更新します。 / PR #209で日向市の公式URLを修正後、公開ページから参照される `v=4` のJSONに旧URLが残っていることを確認したため、修正を反映する目的です。 / 表示・検索・地図処理は変更していません
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/210/files)（1ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #211

- PR: [工夫・アイデア001：クセなし版clock1と多機能版clock2を同じフォルダに配置](https://github.com/Kussoon/kussoon.github.io/pull/211)／分類: サイト共通／対象外／マージ: 2026-11-03T05:44:20Z
- 当時の仕様・目的（本文抜粋）: `ideas/001/clock1.html`：新規「クセなし版」。時分秒、年月日・曜日、西暦と令和、60本バータイマー、テンキー、開始/一時停止/リセット、横縦切替、全画面、明るさ切替 / `ideas/001/clock2.html`：既存の多機能版を保全し、canonicalとホーム画面の名前を調整。タイマー点滅の再帰呼び出し不具合を修正 / `ideas/001/clock.html`：従来のブックマーク・既存URLを`clock2.html`へクエリ付きで転送
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/211/files)（4ファイル）。主要変更先: `ideas/001/clock.html`、`ideas/001/clock1.html`、`ideas/001/clock2.html`、`ideas/001/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #212

- PR: [全国地図：公式サイトボタンをA判定に限定](https://github.com/Kussoon/kussoon.github.io/pull/212)／分類: 庁舎・公式URL／マージ: 2026-11-03T10:54:12Z
- 当時の仕様・目的（本文抜粋）: 全国自治体の公式サイトリンクに、監査台帳の判定結果を反映します。 / 1,912区域すべてに `officialAuditStatus` を追加（A 1,907、B 1、C 1、未判定 3） / 地図ポップアップの「公式サイト」は、A判定かつ安全なURLがある場合だけ表示
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/212/files)（50ファイル）。主要変更先: `v2/common/js/office-directory.js`、`v2/data/offices/01.json`、`v2/data/offices/02.json`、`v2/data/offices/03.json` 他。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: `getOffices → KussoonOfficeDirectory.resolve/render`。現在の47県台帳の形式検査・URL分類照合は合格。個別住所の最新性と外部到達は未再監査。
- 判定: 仕様別: S09=A
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #213

- PR: [全国市区町村名表示マップの試作を追加](https://github.com/Kussoon/kussoon.github.io/pull/213)／分類: ラベル・読み／基盤／マージ: 2026-11-03T14:09:41Z
- 当時の仕様・目的（本文抜粋）: PR #91付近の「関西・中国・四国15府県」地図の操作感を参考に、全国47都道府県・1,902区域の市区町村地図をV2内で試作します。 / `density.html?area=japan` で全国47都道府県を一枚に表示 / 全国表示は縮尺に応じてラベルを増やし、広域では都道府県庁所在地・大きな区域から優先表示
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/213/files)（34ファイル）。主要変更先: `v2/data/national/catalog.json`、`v2/national/density-app.js`、`v2/national/density-labels.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #214

- PR: [fix(v2): allow missing readings on national map](https://github.com/Kussoon/kussoon.github.io/pull/214)／分類: ラベル・読み／基盤／マージ: 2026-11-03T14:12:11Z
- 当時の仕様・目的（本文抜粋）: 全国1,902区域のうち既存の読み仮名データに含まれない自治体があっても、地図全体の読み込みを止めないようにします。読み仮名が未収録の区域は漢字ラベルを表示します。関西等の既存範囲ではこれまでどおり読み仮名を厳密照合します。 / 読み仮名は現在の収録範囲内のみ表示する旨を案内
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/214/files)（2ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #215

- PR: [fix(v2): refresh nationwide map script cache](https://github.com/Kussoon/kussoon.github.io/pull/215)／分類: ラベル・読み／基盤／マージ: 2026-11-03T14:12:38Z
- 当時の仕様・目的（本文抜粋）: 全国地図のラベル固定・境界描画・未収録読み仮名へのフォールバックを公開環境へ反映するため、`density-labels.js` と `density-app.js` のキャッシュバージョンを更新します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/215/files)（1ファイル）。主要変更先: `v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #216

- PR: [feat(v2): add direct nationwide map entry](https://github.com/Kussoon/kussoon.github.io/pull/216)／分類: ラベル・読み／基盤／マージ: 2026-11-03T14:14:18Z
- 当時の仕様・目的（本文抜粋）: `/v2/national/japan.html?area=japan` を全国市区町村地図への直接入口として追加します。既存のdensity.htmlと同じ地図アプリを使い、最新の全国ラベル・境界・吹き出し修正を含めます。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/216/files)（1ファイル）。主要変更先: `v2/national/japan.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #217

- PR: [fix(v2): keep nationwide labels compact when zooming](https://github.com/Kussoon/kussoon.github.io/pull/217)／分類: ラベル・読み／基盤／マージ: 2026-11-04T05:36:14Z
- 当時の仕様・目的（本文抜粋）: 全国地図を拡大したときにラベルが地図を覆わないよう、全国表示の文字サイズを7〜13画面pxに抑えます。区域内の基準位置と縮尺に応じた表示順は維持します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/217/files)（1ファイル）。主要変更先: `v2/national/density-app.js`。
- 後続変更: [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)
- 現在の実装: 2026統合版の有効経路はS-ID参照。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 仕様別: S22=B
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #218

- PR: [fix(v2): refresh nationwide label script cache](https://github.com/Kussoon/kussoon.github.io/pull/218)／分類: ラベル・読み／基盤／マージ: 2026-11-04T05:40:25Z
- 当時の仕様・目的（本文抜粋）: 全国地図のHTMLが、前回のラベル縮小修正を含む `density-app.js` を新しいキャッシュキーで取得するように更新します。 / ラベル計算の修正は main に反映済みでしたが、HTML側のクエリ文字列が古いままで、ブラウザーが以前のJavaScriptを再利用する可能性がありました。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/218/files)（1ファイル）。主要変更先: `v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #219

- PR: [fix(v2): improve nationwide labels in Edge](https://github.com/Kussoon/kussoon.github.io/pull/219)／分類: ラベル・読み／基盤／マージ: 2026-11-04T05:54:03Z
- 当時の仕様・目的（本文抜粋）: Edgeなどのダーク表示で配色が反転しないよう、全国地図の色 scheme をライト固定にします。 / 全国表示は拡大率と区域の画面上の大きさに応じて、ラベルの重なりを段階的に許容します。初期表示は従来どおり重なりを避け、拡大すると同じ位置から追加ラベルが現れます。 / 更新したラベルスクリプトに新しいキャッシュキーを設定します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/219/files)（2ファイル）。主要変更先: `v2/national/density-labels.js`、`v2/national/density.html`。
- 後続変更: [#221](https://github.com/Kussoon/kussoon.github.io/pull/221) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #220

- PR: [fix(v2): show more labels when zoomed](https://github.com/Kussoon/kussoon.github.io/pull/220)／分類: ラベル・読み／基盤／マージ: 2026-11-04T05:57:19Z
- 当時の仕様・目的（本文抜粋）: 全国表示では、全体表示の間は従来どおり重なりを抑えます。2倍以上に拡大したら、画面内にある固定位置のラベルを重なりを許容して表示します。拡大時にラベルがほとんど増えなかった問題を解消します。ラベルの基準位置と地図形状は変更しません。 / ラベル用スクリプトのキャッシュキーも更新します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/220/files)（2ファイル）。主要変更先: `v2/national/density-labels.js`、`v2/national/density.html`。
- 後続変更: [#221](https://github.com/Kussoon/kussoon.github.io/pull/221) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #221

- PR: [fix(v2): tune progressive nationwide labels](https://github.com/Kussoon/kussoon.github.io/pull/221)／分類: ラベル・読み／基盤／マージ: 2026-11-04T06:01:07Z
- 当時の仕様・目的（本文抜粋）: 全国地図の拡大でラベルが増える動作を、区域の画面上の大きさに応じて段階化します。 / 前回の調整では倍率2.25で795件まで表示され、重なりが過剰でした。区域が一定以上の大きさに見える場合だけ重なりを許容し、拡大するほど条件を緩めます。全体表示の密度、ラベル位置、地図形状は維持します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/221/files)（2ファイル）。主要変更先: `v2/national/density-labels.js`、`v2/national/density.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（履歴・差分照合済み、当該PRの全動作を独立再実行していない）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #222

- PR: [Fix national labels freezing above 6× when readings are missing](https://github.com/Kussoon/kussoon.github.io/pull/222)／分類: ラベル・読み／基盤／マージ: 2026-11-04T06:11:08Z
- 当時の仕様・目的（本文抜粋）: At zoom 6× the national map enables readings, but municipalities without readingParts throw in NR.boxFor and abort every subsequent label render. Use the existing kanji layout for those municipalities in both layout passes, matching the existing paint fallback. Bump the app asset key so browsers load the fix. / Observed on the public map: Reading lines missing: 前橋市; label status froze at 5.06× while geometry continued to zoom. Existing 96× zoom limit is retained.
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/222/files)（2ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#226](https://github.com/Kussoon/kussoon.github.io/pull/226) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 要確認（比較・中間方式。後続採用を優先）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #223

- PR: [Restore missing city labels and default readings off](https://github.com/Kussoon/kussoon.github.io/pull/223)／分類: ラベル・読み／基盤／マージ: 2026-11-04T06:17:27Z
- 当時の仕様・目的（本文抜粋）: Single-row national city labels started with only x/y. Administrative boxFor preserves single-row input, so these labels never received a box and density arrangement excluded them at every zoom. Supply base single-row geometry before county/ward layout so cities including 津市 and 松阪市 remain eligible with readings OFF or unavailable. / Default readings to OFF and label the toolbar state explicitly. Bump app cache key.
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/223/files)（2ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#239](https://github.com/Kussoon/kussoon.github.io/pull/239) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 仕様別: S27=A, S34=C
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #224

- PR: [Show labels across portrait viewport and extend national zoom to 768×](https://github.com/Kussoon/kussoon.github.io/pull/224)／分類: 地図操作／マージ: 2026-11-04T06:24:23Z
- 当時の仕様・目的（本文抜粋）: Portrait SVGs preserve the nationwide viewBox aspect ratio, leaving additional visible map geometry above/below its nominal bounds. Label culling used the nominal bounds and hid names in those visible bands. Compute the actual visible world rectangle using the SVG meet scale and pass it to national label arrangement. / Raise the nationwide zoom cap from 96× to 768× for dense city wards. Bump app asset key and correct the default-reading description.
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/224/files)（2ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)
- 現在の実装: 2026統合版の有効経路はS-ID参照。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 仕様別: S23=B
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #225

- PR: [Apply accepted 5C placement to all national labels including Tajiri](https://github.com/Kussoon/kussoon.github.io/pull/225)／分類: ラベル・読み／基盤／マージ: 2026-11-04T06:36:25Z
- 当時の仕様・目的（本文抜粋）: National loading bypassed the accepted placement engine, pre-seeding every anchor with Polylabel and skipping 5C calculation. Compute officeComponent5 once for all national models and cache those anchors. Its existing verified-office component selection handles Tajiri code 27362 using the sourced town-hall point; missing or invalid office points use 5B largest-component placement. Both apply the north/south midpoint and longest horizontal interval midpoint. / Zoom, pan, reading toggle and selection retain these anchors. No municipality-specific manual label positions are introduced. Tested office-containing small mainland versus larger discon
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/225/files)（2ファイル）。主要変更先: `v2/national/density-app.js`、`v2/national/density.html`。
- 後続変更: [#228](https://github.com/Kussoon/kussoon.github.io/pull/228)
- 現在の実装: 2026統合版の有効経路はS-ID参照。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 仕様別: S21=B
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #226

- PR: [Complete kana coverage for all 1,902 national map units](https://github.com/Kussoon/kussoon.github.io/pull/226)／分類: ラベル・読み／基盤／マージ: 2026-11-04T06:51:03Z
- 当時の仕様・目的（本文抜粋）: Reading data covered only 17 prefectures and national labels additionally hid readings below 6×. Expand municipal readings from localgovjp (CC0), preserve legacy 2021 geometry names, and add prefecture-qualified county readings from Geolonia (MIT notice included). Six northern-territory units retained by the map are sourced separately from Cabinet Office/Hokkaido documents. Scope county lookup by prefecture to handle homonyms. / Honor the ON/OFF toggle at every zoom; default remains OFF. Validate code/name/reading attachment for all 1,902 geometry units across 47 prefectures: zero failures, including Nagano 77, Gifu 42 and Mie 29. Placement c
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/226/files)（5ファイル）。主要変更先: `v2/common/js/national-readings.js`、`v2/data/national/county-readings.json`、`v2/data/national/municipality-readings.json`、`v2/national/density-app.js` 他。
- 後続変更: [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)
- 現在の実装: 2026統合版の有効経路はS-ID参照。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 仕様別: S25=B, S27=A, S28=A, S34=C
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #227

- PR: [週刊第3号（10/26〜11/1）を追加しニュース一覧を更新](https://github.com/Kussoon/kussoon.github.io/pull/227)／分類: サイト共通／対象外／マージ: 2026-11-04T07:04:55Z
- 当時の仕様・目的（本文抜粋）: 週刊第3号のHTMLを追加し、第2号のデザイン・共通フッター・Umamiタグを適用。ニュース一覧の先頭に第3号を追加。mainは変更せずレビュー用PRとして提出。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/227/files)（2ファイル）。主要変更先: `driving/news/20261026.html`、`driving/news/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #228

- PR: [test(v2): 全国地図の合意済み仕様を回帰テストで保護](https://github.com/Kussoon/kussoon.github.io/pull/228)／分類: ラベル・読み／基盤／マージ: 2026-11-04T07:35:08Z
- 当時の仕様・目的（本文抜粋）: 全国地図の県境修正に先立ち、過去PRで確定した細かな仕様を後続の変更で壊さないためのCIを追加します。 / よみがな初期OFF（表示操作もOFF） / 全国最大倍率768、ラベル最大13画面px
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/228/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。 #213以降のdensity/japan系は2021年1902区域。2026統合版とは別経路。
- 判定: 仕様別: S21=B, S22=B, S23=B
- 回帰テスト: [v2/national/test-density-contract.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/national/test-density-contract.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #229

- PR: [ニュース一覧に号数自動連動のページ内目次を追加](https://github.com/Kussoon/kussoon.github.io/pull/229)／分類: サイト共通／対象外／マージ: 2026-11-04T07:38:04Z
- 当時の仕様・目的（本文抜粋）: タイトル直下に週刊ニュース各号およびガイド2件へのページ内リンクを追加。号数は本文内の週刊記事カードから自動生成（将来の追加号にも追従）。既存の共通フッター・Umamiは維持。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/229/files)（1ファイル）。主要変更先: `driving/news/index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #230

- PR: [test(v2): 全国共有県境の再発防止テストを共通CIに追加](https://github.com/Kussoon/kussoon.github.io/pull/230)／分類: 境界・2026データ／マージ: 2026-11-04T07:47:00Z
- 当時の仕様・目的（本文抜粋）: PR #131（共有アークの単一描画）とPR #187（全国47都道府県を一体のTopoJSONで生成、陸上県境22組の共有アークを検証）の成果を将来の修正でも失わないために、監査済みマニフェストと生成器、共有レンダラーの条件を回帰検査します。 / 全国2026年版は47都道府県・1,905区域・共有県境22組、共有アークID・件数の整合を確認 / 既存の全国地図は2021年版・1,902区域を使用中であることを明示的に保護し、データの無断混在を検出
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/230/files)（3ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#233](https://github.com/Kussoon/kussoon.github.io/pull/233) → [#234](https://github.com/Kussoon/kussoon.github.io/pull/234) → [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) → [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) → [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S39=要確認
- 回帰テスト: [v2/national/test-shared-border-contract.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/national/test-shared-border-contract.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #231

- PR: [audit(v2): 2021→2026全国行政区域コード・庁舎対応を47県照合](https://github.com/Kussoon/kussoon.github.io/pull/231)／分類: 境界・2026データ／マージ: 2026-11-04T07:56:33Z
- 当時の仕様・目的（本文抜粋）: 全国共有境界への切替前に、現行2021年版地図（1,902区域）と既存2026年版データ（1,905区域）および庁舎台帳（1,912区域）の対応を機械照合する診断用PRです。 / manifest記載の47県分の2026年TopoJSONを実読込し、2021年TopoJSONと5桁自治体コード集合を比較 / 2021年にのみあるコード・2026年にのみあるコード・2026年地図に庁舎台帳がないコードを県別列挙
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/231/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S31=B, S38=要確認, S40=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #232

- PR: [総合トップをコンテンツ一覧型に改善（5分類・多数の直接リンク）](https://github.com/Kussoon/kussoon.github.io/pull/232)／分類: サイト共通／対象外／マージ: 2026-11-04T08:03:20Z
- 当時の仕様・目的（本文抜粋）: 西宮市トップの一覧構成を参考に、総合トップの5つの大きなカードと8件のクイックリンクを、5カテゴリ配下のコンパクトな直接リンク一覧へ置き換えました。 / 合計 40 個のコンテンツリンク（カテゴリー一覧への入口を含む） / スマートフォンは2列、PCは3列
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/232/files)（1ファイル）。主要変更先: `index.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: このPRの変更先から2026統合HTMLへの接続を自動推定しない。
- 判定: 対象外（簡潔分類のみ）
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #233

- PR: [audit(v2): 2026年版47都道府県の県境一致診断をCI追加](https://github.com/Kussoon/kussoon.github.io/pull/233)／分類: 境界・2026データ／マージ: 2026-11-04T08:40:19Z
- 当時の仕様・目的（本文抜粋）: PR #231の行政区域コード照合とは独立して、既存の2026年版47県TopoJSONの外周辺を機械比較し、県境の二重線再発を防ぐための診断データを作成します。 / `v2/national/audit-2026-prefecture-seams.cjs` を新設。県ごとの外周アークから辺・頂点の一致を診断し、候補県ペアをJSON化 / `.github/workflows/v2-national-prefecture-seams.yml` を新設。Node構文チェック・合成した共通辺とずれた辺の自己試験・47県の読取専用診断を実行
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/233/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#234](https://github.com/Kussoon/kussoon.github.io/pull/234) → [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) → [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) → [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S39=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #234

- PR: [trial(v2): 2026年版の県間共有線を一重で出力する診断データ](https://github.com/Kussoon/kussoon.github.io/pull/234)／分類: 境界・2026データ／マージ: 2026-11-04T08:44:39Z
- 当時の仕様・目的（本文抜粋）: PR #231のコード整合・PR #233の辺一致診断を引き継ぎ、県間で完全一致する境界辺を重複なく1回だけGeoJSONに出力する、描画前段階の試作です。 / 47都道府県の2026年版TopoJSONから各県の外周を抽出 / 同じ辺が異なる2県に現れる場合にのみ、県ペアを添えた1本の共有線に統合
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/234/files)（2ファイル）。主要変更先: `v2/national/build-2026-shared-prefecture-seams.cjs`。
- 後続変更: [#235](https://github.com/Kussoon/kussoon.github.io/pull/235) → [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) → [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S39=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #235

- PR: [audit(v2): 県境共有線29,440本の欠落・重複を独立照合](https://github.com/Kussoon/kussoon.github.io/pull/235)／分類: 境界・2026データ／マージ: 2026-11-04T08:51:14Z
- 当時の仕様・目的（本文抜粋）: PR #231（自治体コード）・#233（県境一致診断）・#234（共有線抽出）の成果を踏まえ、抽出した共有線が元の47都道府県データに対して欠落・重複・誤所属していないかを別ロジックで検証します。 / 元の47県TopoJSONから各県の外周辺を独立再抽出 / 異なる県が同じ辺を持つ場合、その辺がGeoJSONに厳密に1回だけ記録されているか確認
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/235/files)（2ファイル）。主要変更先: 文書・CI等。
- 後続変更: [#236](https://github.com/Kussoon/kussoon.github.io/pull/236) → [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S39=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #236

- PR: [trial(v2): 県境の一致・未一致線分を比較する独立地図](https://github.com/Kussoon/kussoon.github.io/pull/236)／分類: 境界・2026データ／マージ: 2026-11-04T08:54:04Z
- 当時の仕様・目的（本文抜粋）: PR #231・#233〜#235の検査結果を目視確認できるようにします。2026年版県別TopoJSONから両県の外周線を読み、厳密に一致する辺を緑色で1回だけ描画します。 / `/v2/national/prefecture-seam-visual.html`（noindex） / 大阪／奈良、大阪／兵庫、京都／兵庫、京都／奈良、岐阜／愛知、静岡／愛知の6組
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/236/files)（3ファイル）。主要変更先: `v2/national/prefecture-seam-visual.html`、`v2/national/prefecture-seam-visual.js`。
- 後続変更: [#237](https://github.com/Kussoon/kussoon.github.io/pull/237) → [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S39=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #237

- PR: [trial(v2): 全国60組の2026年版共有県境を独立ビューアで比較](https://github.com/Kussoon/kussoon.github.io/pull/237)／分類: 境界・2026データ／マージ: 2026-11-04T09:00:45Z
- 当時の仕様・目的（本文抜粋）: 県境太さが不自然にならないことを基準に、既存PR #231, #233〜#236で確立した県境の成果を全国へ広げるための目視試験ページを追加します。 / `v2/national/prefecture-seam-national-visual.html`（noindex）に、共有辺が検出された60組の県ペアを追加 / 県別の外周と、一致した県間共有線分を一重表示する方式を切替可能
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/237/files)（3ファイル）。主要変更先: `v2/national/prefecture-seam-national-visual.html`、`v2/national/prefecture-seam-national-visual.js`。
- 後続変更: [#238](https://github.com/Kussoon/kussoon.github.io/pull/238)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S39=要確認
- 回帰テスト: このPR差分にテストファイルなし。テスト不存在全般を意味しない。。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #238

- PR: [perf(v2): 全国2026年版の県境を一回描画・一定線幅に固定](https://github.com/Kussoon/kussoon.github.io/pull/238)／分類: 境界・2026データ／マージ: 2026-11-04T09:08:01Z
- 当時の仕様・目的（本文抜粋）: ユーザー方針は『多少線が太くてもよいので描画負荷を増やさない』。PR #233〜#237の29,440共有線を追加のDOM/描画レイヤーにしない方針です。 / 既存 `KussoonV2MunicipalRenderer` が自治体の塗りと**単一の境界path**を描く設計をそのまま再利用。レンダラー本体は変更しない / 2026年全国試作の `.borders` に `vector-effect:non-scaling-stroke` を追加。ピンチ・ズーム時の画面上の線幅を一定に保持（0.9px）
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/238/files)（3ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#239](https://github.com/Kussoon/kussoon.github.io/pull/239)
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S06=A, S35=C, S36=A, S37=要確認, S39=要確認
- 回帰テスト: [v2/national/test-2026-single-stroke.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/national/test-2026-single-stroke.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #239

- PR: [fix(v2): 全国拡大時の濃紺県境太線を修正し地図右下に4ボタン追加](https://github.com/Kussoon/kussoon.github.io/pull/239)／分類: 地図操作／マージ: 2026-11-04T09:19:03Z
- 当時の仕様・目的（本文抜粋）: 全国表示では正常だが、全国地図の県をタップ・拡大すると濃紺の太い線が現れる。県を選び詳細表示すると正常。全国一覧 `.prefecture:focus` の濃紺2px strokeが倍率に従ってSVG拡大されることが原因候補。 / `.prefecture` に `vector-effect:non-scaling-stroke`、タッチによるフォーカス（`:focus:not(:focus-visible)`）は通常の白0.75px。キーボード操作の `:focus-visible` は濃紺2pxを維持し画面上の線幅を固定 / 全国検証用地図の右下へ本体 `density.html` と同じ4種のボタンを設置：＋拡大／－縮小／全体表示／よみがなOFF/ON
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/239/files)（3ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S19=要確認, S27=A, S34=C, S37=要確認
- 回帰テスト: [v2/national/test-2026-overview-focus-toolbar.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/national/test-2026-overview-focus-toolbar.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #240

- PR: [fix(v2): iPhoneの地図ドラッグが途中で途切れる問題への対策](https://github.com/Kussoon/kussoon.github.io/pull/240)／分類: 地図操作／マージ: 2026-11-04T10:02:32Z
- 当時の仕様・目的（本文抜粋）: 全国表示の指ドラッグが短距離しか動かない実機報告に対応。共通map-viewport.jsでタッチのドラッグ判定を5pxから1pxに変更し、SVG境界を越える際にpointermoveを取り逃しにくくします。マウスの閾値、単純タップによる都道府県選択、ピンチ操作は維持。Nodeの合成イベントで長距離パン、タップ保持、マウス挙動を回帰テスト。地図データや描画・ラベルは変更しません。これが実機問題の唯一の原因であるとは未確認のため、iPhone実機確認前の正式合格判定は保留します。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/240/files)（3ファイル）。主要変更先: `v2/shared/map-viewport.js`。
- 後続変更: [#241](https://github.com/Kussoon/kussoon.github.io/pull/241) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S14=A
- 回帰テスト: [v2/shared/test-map-viewport-touch-pan.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-map-viewport-touch-pan.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #241

- PR: [fix(v2): iPhoneでドラッグが少ししか動かない問題の根本原因を修正](https://github.com/Kussoon/kussoon.github.io/pull/241)／分類: 地図操作／マージ: 2026-11-04T10:28:07Z
- 当時の仕様・目的（本文抜粋）: PR #240後も、全国表示と選択した県・市町村の両方でドラッグが少ししか動かない。 / iOS Safariは指が触れたSVGの県・市町村pathへ暗黙のpointer captureを設定することがあります。ドラッグ開始時に親SVGがcaptureを取得すると、元の子pathから`lostpointercapture`イベントが**親SVGへバブリング**します。従来コードは親SVGに届いたすべての`lostpointercapture`を`pointerUp`として処理し、ドラッグの途中で追跡中のpointerIdを消してしまいます。 / イベントの`target`が地図SVG自身ではなく子pathであれば無視し、SVG自身がcaptureを失ったときだけ終了するよう変更しました。指の移動処理そのもの、地図の移動制限、タップによる県選択、ピンチ、拡大縮小、境界データ、線幅、ラベルには触れません。
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/241/files)（2ファイル）。主要変更先: `v2/shared/map-viewport.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S15=A
- 回帰テスト: [v2/shared/test-map-viewport-touch-pan.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-map-viewport-touch-pan.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #242

- PR: [fix(v2): iPhoneの自治体吹き出しが左にはみ出す問題を修正](https://github.com/Kussoon/kussoon.github.io/pull/242)／分類: 選択・吹き出し／マージ: 2026-11-04T10:55:06Z
- 当時の仕様・目的（本文抜粋）: 兵庫県内で市町村を選択した際、自治体情報の吹き出しが画面の左側にはみ出し、名称・住所・公式サイトリンクが切れる。 / PR #239で右下に操作ツールバーを新設した際、吹き出しへ `right:112px` と `width:min(350px,calc(100% - 16px))` を同時に指定。狭いiPhone表示では合計幅が親地図を超え、CSS絶対配置で吹き出しの左端が負になる。 / 通常幅では吹き出しを `left:8px` 基準で配置
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/242/files)（3ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#244](https://github.com/Kussoon/kussoon.github.io/pull/244) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S12=要確認
- 回帰テスト: [v2/national/test-2026-mobile-popup.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/national/test-2026-mobile-popup.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #243

- PR: [fix(v2): 小さなiPhone画面でも吹き出しと右下4ボタンを両立](https://github.com/Kussoon/kussoon.github.io/pull/243)／分類: 選択・吹き出し／マージ: 2026-11-04T10:57:32Z
- 当時の仕様・目的（本文抜粋）: PR #242で吹き出しの左側はみ出しを修正したものの、画面幅600px以下で `bottom:230px; max-height:calc(100% - 242px)` としていたため、地図領域の縦幅が短いiPhoneでは吹き出しがほぼ表示できなくなる危険が残っていました。 / スマートフォンでは吹き出しを地図の左側領域に収め、操作ツールバー用の右108pxを常時確保 / 吹き出しの上下を8pxに固定し、内部スクロールで住所と3リンクを表示。画面の高さが短くても高さが負にならない
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/243/files)（2ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: [#244](https://github.com/Kussoon/kussoon.github.io/pull/244) の本文・差分を優先。ただしPR全体の全項目を廃止したという意味ではない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S12=要確認, S13=要確認
- 回帰テスト: [v2/national/test-2026-mobile-popup.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/national/test-2026-mobile-popup.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #244

- PR: [fix(v2): 自治体吹き出しの高さを右側4ボタンにそろえる](https://github.com/Kussoon/kussoon.github.io/pull/244)／分類: 選択・吹き出し／マージ: 2026-11-04T12:24:35Z
- 当時の仕様・目的（本文抜粋）: PR #242・#243で吹き出しは画面内に収まった一方、三田市の吹き出しが地図上下いっぱいに伸びて余白が大きい。ユーザー確認のとおり、高さを右側4ボタン全体にそろえる修正が残っていました。 / 幅600px以下の画面では吹き出しを地図左側に配置したまま、下端を4ボタンとそろえ、吹き出しの高さを**実際の4ボタン群の高さ**にそろえる / `ResizeObserver`でボタン群の高さを取得しCSS変数に反映。画面幅変更時にも一致し、ドラッグやズームごとの再計算はなし
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/244/files)（2ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S12=要確認, S13=要確認
- 回帰テスト: [v2/national/test-2026-mobile-popup.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/national/test-2026-mobile-popup.cjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

### PR #245

- PR: [fix(v2): 吹き出しを閉じた後の上下ドラッグ制限を修正し過去の操作規則を維持](https://github.com/Kussoon/kussoon.github.io/pull/245)／分類: 地図操作／マージ: 2026-11-04T13:35:07Z
- 当時の仕様・目的（本文抜粋）: 兵庫県の多可町を選択し、自治体情報吹き出しを×で閉じた後、右方向にはドラッグできるが下方向には動かなくなる。 / 市町村選択時は該当区域を画面中心へ投影し直すため、同じ県のほかの区域は初期SVG枠(850×700)の外側にも広がる。一方、共通 `map-viewport.js` は初期枠だけを基準に縦横ドラッグを制限していた。選択後の県の投影範囲と移動制限が食い違っていた。 / 共通viewportへ `setContentBounds` を追加。選択中の県の既存地理bboxを、現在の投影関数でSVG座標へ変換して移動制限へ反映
- 差分根拠: [Files changed](https://github.com/Kussoon/kussoon.github.io/pull/245/files)（4ファイル）。主要変更先: `v2/national/official-2026-nationwide-pilot.html`、`v2/shared/map-viewport.js`。
- 後続変更: 明示的後続変更の個別特定は未完。廃止と推測しない。
- 現在の実装: 2026統合版の有効経路はS-ID参照。
- 判定: 仕様別: S01=A, S02=B, S16=A, S20=要確認
- 回帰テスト: [v2/shared/test-map-viewport-touch-pan.cjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/shared/test-map-viewport-touch-pan.cjs)、[v2/tools/shared-topology/test-national-navigation.mjs](https://github.com/Kussoon/kussoon.github.io/blob/c69c970c982724b20d9a327e1fd1c223f356aebd/v2/tools/shared-topology/test-national-navigation.mjs)。実行範囲・不足は[テスト計画](v2-national-regression-test-plan-20261104.md)参照。

## APIでpatchが省略された変更

これらはファイル名・SHA・変更量まで取得し、原形状の全差分を読了したとは扱わない。必要なら各PRのbase/head blobを取得して再照合する。

|PR|ファイル|変更行数|
|---|---|---|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`01hokkaido.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`02aomori.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`03iwate.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`04miyagi.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`05akita.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`06yamagata.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`07fukushima.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`08ibaraki.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`09tochigi.html`|47|
|[#2](https://github.com/Kussoon/kussoon.github.io/pull/2/files)|`10gunma.html`|47|
|[#109](https://github.com/Kussoon/kussoon.github.io/pull/109/files)|`v2/data/national/2026-common/osaka-nara.topojson`|1|
|[#114](https://github.com/Kussoon/kussoon.github.io/pull/114/files)|`v2/data/national/2026-common/osaka-nara-20m.topojson`|1|
|[#118](https://github.com/Kussoon/kussoon.github.io/pull/118/files)|`v2/data/national/2026-common/shiga-kyoto-20m.topojson`|1|
|[#119](https://github.com/Kussoon/kussoon.github.io/pull/119/files)|`v2/data/national/2026-common/hyogo-wakayama-20m.topojson`|1|
|[#121](https://github.com/Kussoon/kussoon.github.io/pull/121/files)|`v2/data/national/2026-common/kinki-six-20m.topojson`|1|
|[#122](https://github.com/Kussoon/kussoon.github.io/pull/122/files)|`v2/data/national/2026-common/shikoku-four-20m.topojson`|1|
|[#123](https://github.com/Kussoon/kussoon.github.io/pull/123/files)|`v2/data/national/2026-common/chugoku-shikoku-nine-20m.topojson`|1|
|[#124](https://github.com/Kussoon/kussoon.github.io/pull/124/files)|`v2/data/national/2026-common/kyushu-seven-20m.topojson`|1|
|[#125](https://github.com/Kussoon/kussoon.github.io/pull/125/files)|`v2/data/national/2026-common/kyushu-prefecture-20m/40.topojson`|1|
|[#125](https://github.com/Kussoon/kussoon.github.io/pull/125/files)|`v2/data/national/2026-common/kyushu-prefecture-20m/41.topojson`|1|
|[#125](https://github.com/Kussoon/kussoon.github.io/pull/125/files)|`v2/data/national/2026-common/kyushu-prefecture-20m/42.topojson`|1|
|[#125](https://github.com/Kussoon/kussoon.github.io/pull/125/files)|`v2/data/national/2026-common/kyushu-prefecture-20m/43.topojson`|1|
|[#125](https://github.com/Kussoon/kussoon.github.io/pull/125/files)|`v2/data/national/2026-common/kyushu-prefecture-20m/44.topojson`|1|
|[#125](https://github.com/Kussoon/kussoon.github.io/pull/125/files)|`v2/data/national/2026-common/kyushu-prefecture-20m/45.topojson`|1|
|[#125](https://github.com/Kussoon/kussoon.github.io/pull/125/files)|`v2/data/national/2026-common/kyushu-prefecture-20m/46.topojson`|1|
|[#126](https://github.com/Kussoon/kussoon.github.io/pull/126/files)|`v2/data/national/2026-common/kyushu-prefecture-20m/47.topojson`|1|
|[#127](https://github.com/Kussoon/kussoon.github.io/pull/127/files)|`v2/data/national/2026-common/tokai-prefecture-20m/21.topojson`|1|
|[#127](https://github.com/Kussoon/kussoon.github.io/pull/127/files)|`v2/data/national/2026-common/tokai-prefecture-20m/22.topojson`|1|
|[#127](https://github.com/Kussoon/kussoon.github.io/pull/127/files)|`v2/data/national/2026-common/tokai-prefecture-20m/23.topojson`|1|
|[#127](https://github.com/Kussoon/kussoon.github.io/pull/127/files)|`v2/data/national/2026-common/tokai-prefecture-20m/24.topojson`|1|
|[#132](https://github.com/Kussoon/kussoon.github.io/pull/132/files)|`v2/data/national/2026-common/hokuriku-koshinetsu-prefecture-20m/15.topojson`|1|
|[#132](https://github.com/Kussoon/kussoon.github.io/pull/132/files)|`v2/data/national/2026-common/hokuriku-koshinetsu-prefecture-20m/16.topojson`|1|
|[#132](https://github.com/Kussoon/kussoon.github.io/pull/132/files)|`v2/data/national/2026-common/hokuriku-koshinetsu-prefecture-20m/17.topojson`|1|
|[#132](https://github.com/Kussoon/kussoon.github.io/pull/132/files)|`v2/data/national/2026-common/hokuriku-koshinetsu-prefecture-20m/18.topojson`|1|
|[#132](https://github.com/Kussoon/kussoon.github.io/pull/132/files)|`v2/data/national/2026-common/hokuriku-koshinetsu-prefecture-20m/19.topojson`|1|
|[#132](https://github.com/Kussoon/kussoon.github.io/pull/132/files)|`v2/data/national/2026-common/hokuriku-koshinetsu-prefecture-20m/20.topojson`|1|
|[#134](https://github.com/Kussoon/kussoon.github.io/pull/134/files)|`v2/data/national/2026-common/kanto-prefecture-20m/08.topojson`|1|
|[#134](https://github.com/Kussoon/kussoon.github.io/pull/134/files)|`v2/data/national/2026-common/kanto-prefecture-20m/09.topojson`|1|
|[#134](https://github.com/Kussoon/kussoon.github.io/pull/134/files)|`v2/data/national/2026-common/kanto-prefecture-20m/10.topojson`|1|
|[#134](https://github.com/Kussoon/kussoon.github.io/pull/134/files)|`v2/data/national/2026-common/kanto-prefecture-20m/11.topojson`|1|
|[#134](https://github.com/Kussoon/kussoon.github.io/pull/134/files)|`v2/data/national/2026-common/kanto-prefecture-20m/12.topojson`|1|
|[#134](https://github.com/Kussoon/kussoon.github.io/pull/134/files)|`v2/data/national/2026-common/kanto-prefecture-20m/13.topojson`|1|
|[#134](https://github.com/Kussoon/kussoon.github.io/pull/134/files)|`v2/data/national/2026-common/kanto-prefecture-20m/14.topojson`|1|
|[#137](https://github.com/Kussoon/kussoon.github.io/pull/137/files)|`v2/data/national/2026-common/tohoku-prefecture-20m/02.topojson`|1|
|[#137](https://github.com/Kussoon/kussoon.github.io/pull/137/files)|`v2/data/national/2026-common/tohoku-prefecture-20m/03.topojson`|1|
|[#137](https://github.com/Kussoon/kussoon.github.io/pull/137/files)|`v2/data/national/2026-common/tohoku-prefecture-20m/04.topojson`|1|
|[#137](https://github.com/Kussoon/kussoon.github.io/pull/137/files)|`v2/data/national/2026-common/tohoku-prefecture-20m/05.topojson`|1|
|[#137](https://github.com/Kussoon/kussoon.github.io/pull/137/files)|`v2/data/national/2026-common/tohoku-prefecture-20m/06.topojson`|1|
|[#137](https://github.com/Kussoon/kussoon.github.io/pull/137/files)|`v2/data/national/2026-common/tohoku-prefecture-20m/07.topojson`|1|
|[#138](https://github.com/Kussoon/kussoon.github.io/pull/138/files)|`v2/data/national/2026-common/hokkaido-prefecture-20m/01.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/25.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/26.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/27.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/28.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/29.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/30.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/31.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/32.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/33.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/34.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/35.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/36.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/37.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/38.topojson`|1|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139/files)|`v2/data/national/2026-common/national-2026-pilot/39.topojson`|1|
|[#141](https://github.com/Kussoon/kussoon.github.io/pull/141/files)|`v2/data/national/2026-common/cross-region-detail/06-15.geojson`|1|
|[#141](https://github.com/Kussoon/kussoon.github.io/pull/141/files)|`v2/data/national/2026-common/cross-region-detail/07-08.geojson`|1|
|[#141](https://github.com/Kussoon/kussoon.github.io/pull/141/files)|`v2/data/national/2026-common/cross-region-detail/07-15.geojson`|1|
|[#141](https://github.com/Kussoon/kussoon.github.io/pull/141/files)|`v2/data/national/2026-common/cross-region-detail/28-31.geojson`|1|
|[#141](https://github.com/Kussoon/kussoon.github.io/pull/141/files)|`v2/data/national/2026-common/cross-region-detail/28-33.geojson`|1|
|[#145](https://github.com/Kussoon/kussoon.github.io/pull/145/files)|`v2/data/national/municipality-readings-all-source.json`|7676|
|[#187](https://github.com/Kussoon/kussoon.github.io/pull/187/files)|`v2/data/national/2026-common/national-shared-border-pilot/border-comparison.geojson`|1|
|[#188](https://github.com/Kussoon/kussoon.github.io/pull/188/files)|`v2/audit/official-url-reachability-20261102.json`|27498|
|[#203](https://github.com/Kussoon/kussoon.github.io/pull/203/files)|`v2/audit/official-url-followup-20261102.json`|937|
|[#205](https://github.com/Kussoon/kussoon.github.io/pull/205/files)|`v2/audit/official-url-nationwide-classification-20261103.json`|1|
|[#213](https://github.com/Kussoon/kussoon.github.io/pull/213/files)|`v2/data/national/2021/01.topojson`|1|
|[#226](https://github.com/Kussoon/kussoon.github.io/pull/226/files)|`v2/data/national/municipality-readings.json`|8765|

対象外PR 27件、V2関連 218件。未マージ 5件。patch省略 77ファイル。分類や仕様数は推定で水増ししない。


## pilot UI是正の後続PR（過去245件の集計とは別）

- [#259](https://github.com/Kussoon/kussoon.github.io/pull/259): S08/S12/S13/S19。高さ175px制約によるリンク/親市の見切れを是正。S12の高さ一致は今回の明示要件に従い置換。map-firstとdebugフラグ退避。Chromium/WebKit新2スイートと既存17コマンド/既存5スイート、画像は正式仕様・回帰計画参照。
- [#260](https://github.com/Kussoon/kussoon.github.io/pull/260): S21〜S26のB6件を維持し、配置前の対象フィルターによる周辺名非表示を是正。県内周辺名初期ON、4県各配置段の件数維持、パン/ズーム再計算なし、同じ浜松2026形状の現行/旧5C比較。隣県先読み・手動座標・旧方式全面復帰はしない。

作業開始main `958fe45` → 作業中main `301371c`（差分はPokémonページのみ）を#259へ取り込み、全国版の既存マージ済み修正を維持。推奨は#259→#260。自動マージなし。

<a id="behavior-pr-trace"></a>

## 補完監査：段階表示の追跡と過去監査の不足

既存のPR #1〜#245レコードを削除せず、下記の有効経路と対応仕様を補う。旧40項目への要約で失った動作は新規S41〜S49として正式仕様表へ追加した。PR件数の列挙と、利用者向け動作の抽出完了を同一視しない。

|PR|最終規則/後続との関係|仕様と今回の判断|コード/diff根拠|
|---|---|---|---|
|[#66](https://github.com/Kussoon/kussoon.github.io/pull/66)、[#67](https://github.com/Kussoon/kussoon.github.io/pull/67)|一般densityの検索Enter/Escape、地図keyboard、空白解除。全国focus UIの検索は後に非表示|S44/S45/S46は新版に同じ操作なし。6倍で読む旧実験条件は#226後の最終ではない|[66差分](https://github.com/Kussoon/kussoon.github.io/pull/66/files)、[67差分](https://github.com/Kussoon/kussoon.github.io/pull/67/files)。blame bbf00bb/478a162|
|[#139](https://github.com/Kussoon/kussoon.github.io/pull/139)|2026県別ドリルダウンの意図的導入。地図の継続一括ロードとは別|県別ロードは正当。後発S41/S42の廃止承認は確認できない。空白/市区keyboardは当初から未接続|[固定9bec871](https://github.com/Kussoon/kussoon.github.io/blob/9bec871da5d46aacb59edf71f828f9e7a68c2b48/v2/national/official-2026-nationwide-pilot.html)|
|[#146](https://github.com/Kussoon/kussoon.github.io/pull/146)|balanced/全文字箱fitの共通engine再利用|座標engine再利用は可視性・文字px・ズーム状態機械の継承証明ではない|[715ca671](https://github.com/Kussoon/kussoon.github.io/blob/715ca671bced108beee88106677eb063ac4238f6/v2/shared/established-label-adapter.js)|
|[#213](https://github.com/Kussoon/kussoon.github.io/pull/213)|旧2021の全国1902モデルと縮尺別ラベル|S41/S42の始点。新版#139より後の別経路改善|[ce988157](https://github.com/Kussoon/kussoon.github.io/commit/ce9881575bb70a1a4f4fedb632251cfaa90505a4)|
|[#217](https://github.com/Kussoon/kussoon.github.io/pull/217)|画面文字7〜13px|S22 B。旧18pxテスト期待はこの変更を追跡していない|[4eb4d6cb](https://github.com/Kussoon/kussoon.github.io/commit/4eb4d6cbd8bb3286e9c53b10a021121f42a158a5)|
|[#219](https://github.com/Kussoon/kussoon.github.io/pull/219)→[#220](https://github.com/Kussoon/kussoon.github.io/pull/220)→[#221](https://github.com/Kussoon/kussoon.github.io/pull/221)|重なりの段階許容。一律2倍を面積/倍率依存へ変更|S41 B。#221式が最終、#220だけを再適用しない。Edge配色はS47要確認|[d6468e8差分](https://github.com/Kussoon/kussoon.github.io/commit/d6468e86970e6e7a1ec124c902709f518d6138c6)|
|[#222](https://github.com/Kussoon/kussoon.github.io/pull/222)→[#223](https://github.com/Kussoon/kussoon.github.io/pull/223)|欠けたreadingPartsで6倍から停止する経路を修正。通常市にも文字箱を与え、初期読みOFF|S27/S28だけでなく、全zoomの非停止と単行市の表示許可が必要|[222差分](https://github.com/Kussoon/kussoon.github.io/pull/222/files)、[223差分](https://github.com/Kussoon/kussoon.github.io/pull/223/files)|
|[#224](https://github.com/Kussoon/kussoon.github.io/pull/224)|実可視帯のculling/全国768倍|S43は県内観測A、S23/S42はB。縦長画面の余白帯も判定する|[c67c19bf](https://github.com/Kussoon/kussoon.github.io/commit/c67c19bf252d1162fb089633852c089be0b9cecd)|
|[#225](https://github.com/Kussoon/kussoon.github.io/pull/225)|全国1902の5Cを一度計算/cache|S21 BとS20/S41性能境界。ズームで文字を更新しないという契約ではない|[45accd99](https://github.com/Kussoon/kussoon.github.io/commit/45accd99823bd4ace0a28469910a171e3cba8b1f)|
|[#226](https://github.com/Kussoon/kussoon.github.io/pull/226)|全国1902読み、北方6を出典付き補完、6倍ゲート撤廃|S48 B。新版別sourceには北方6がなく、13件例外の内訳を読み検査へ渡さなかった|[369e20e8](https://github.com/Kussoon/kussoon.github.io/commit/369e20e8e4b0ffc2924bc7a72afd265f137ef86e)|
|[#228](https://github.com/Kussoon/kussoon.github.io/pull/228)|旧静的保護の追加|5C/13px/768等は検査するが段階表示は検査していなかった|[静的契約](../national/test-density-contract.cjs)|
|[#248](https://github.com/Kussoon/kussoon.github.io/pull/248)|台帳統合・実データ/実ブラウザCI|旧densityの実ブラウザ対照/段階表示を含まず、40契約の分母に抜け|[既存runner](../tests/run-national-contracts.cjs)|
|[#249](https://github.com/Kussoon/kussoon.github.io/pull/249)|Pokémonタイプ相性|対象外。番号範囲に含まれるが全国地図監査とは別|[249変更](https://github.com/Kussoon/kussoon.github.io/pull/249/files)|
|[#250](https://github.com/Kussoon/kussoon.github.io/pull/250)〜[#252](https://github.com/Kussoon/kussoon.github.io/pull/252)|再タップ/浜松検索/庁舎テストの個別保護|当該動作の有用な検査。空白/keyboard/全国zoom/北方読みの網羅保証へ拡張しない|[実再タップ](../tests/nationwide-retap.browser.cjs)、[検索](../tests/nationwide-search.browser.cjs)、[庁舎](../tests/office-directory.test.cjs)|
|[#253](https://github.com/Kussoon/kussoon.github.io/pull/253)|選択1ラベル同形状比較と実タッチ|段階可視性/全国到達/全件性能は検査していない。7例に増えても同じ境界|[比較](../tests/compare-2026-labels.browser.cjs)|
|[#259](https://github.com/Kussoon/kussoon.github.io/pull/259)|吹き出し可変高・map-first・debug退避|S12/S13/S19保護は維持。S49は意図的UI変更。全面的な機能廃止とは扱わない|[UI検査](../tests/pilot-map-ui.browser.cjs)|
|[#260](https://github.com/Kussoon/kussoon.github.io/pull/260)|県内周辺名初期ON・段別件数|県内全件生成の検査はS41/S42の全国段階表示を検出しない。layout呼出し不変だけでは不十分|[scope検査](../tests/pilot-label-scope.browser.cjs)|

今回調査した追加仕様は、廃止を示す根拠がないものを勝手にCへ移さずB/要確認に残す。既存40の操作・zoom・状態・性能の検証範囲は[正式仕様の再評価行列](v2-national-current-spec-20261104.md#behavior-reassessment)へ明記。採用/修正は別PRで判断し、本監査PRでは適用しない。

補完成果のPR: [#261](https://github.com/Kussoon/kussoon.github.io/pull/261)。監査資料・観測専用スクリプト・証拠のみ。既存テスト/CI/本体/データを修正せず、24失敗と未確認範囲をそのまま記録する。自動マージしない。


## 2026-11-05追補：PR #246〜#290 と公開版の優先判断

基準main `476a6f91dbb7a95a99bb10caf571c125411ca9d2`。実在43 PR（地図関連29／別コンテンツ14）。#267/#282はPR番号ではない。各行は本文・マージ状態・取得可能な差分を確認した分類。大容量データの形状差分、レビュー全件、実機原本の逐条確認は未実施。**現行規則の正本**は[MAINTENANCE_RULES.md](../national/MAINTENANCE_RULES.md)のR01〜R34。旧S-IDのA/B/Cは当時のpilotの記録として保持する。

|PR|マージ|分類・当時の決定／現在の位置付け|
|---|---|---|
|[#290](https://github.com/Kussoon/kussoon.github.io/pull/290) 全国マップ：単独市町村でも吹き出し下端を切らず内容に合わせて表示|済|R15 全施設可変高・現行|
|[#289](https://github.com/Kussoon/kussoon.github.io/pull/289) 全国マップ：選択区域を白と元の県別色で0.5秒交互点滅|済|R10 白↔県色0.5秒・現行|
|[#288](https://github.com/Kussoon/kussoon.github.io/pull/288) PR #259の例外規則を復元：市役所＋区役所の吹き出し高さ制限を解除|済|R15 二施設暫定例外（#290で置換）|
|[#287](https://github.com/Kussoon/kussoon.github.io/pull/287) 全国マップ：0.5秒ごとの2色点滅と吹き出し余白修正|済|R10 黄赤0.5秒／R15高さ回帰（#289/#290で置換）|
|[#286](https://github.com/Kussoon/kussoon.github.io/pull/286) 全国市区町村マップ：選択区域を2色交互点滅に変更|済|R10 黄赤0.6秒（#289で置換）|
|[#285](https://github.com/Kussoon/kussoon.github.io/pull/285) feat(maps): 全国市区町村マップ移動＋注意書き＋総合トップ「地図」区分|済|R19 /maps/へ移動|
|[#284](https://github.com/Kussoon/kussoon.github.io/pull/284) release(v2): 全国市区町村マップ2026を正式公開し総合・地域トップに掲載|済|R01/R19 正式公開|
|[#283](https://github.com/Kussoon/kussoon.github.io/pull/283) release(v2): 全国市区町村マップ2026 RC1と全国→兵庫→西宮→近畿の展開計画|済|R03/R07/R09 RC1|
|[#281](https://github.com/Kussoon/kussoon.github.io/pull/281) trial(v2): 全国47県の淡色塗分けと選択市区町村の元色明滅|済|R09 県色・脈動試作|
|[#280](https://github.com/Kussoon/kussoon.github.io/pull/280) ポケモンの相性マスターの旧V2 URLを新gamesページへ転送|済|対象外：ポケモン相性等の別コンテンツ|
|[#279](https://github.com/Kussoon/kussoon.github.io/pull/279) trial(v2): 7県の全国共通境界を段階表示に接続した独立iPhone試験ページ（S39）|済|R02 7県段階試験|
|[#278](https://github.com/Kussoon/kussoon.github.io/pull/278) ポケモンの相性マスター：全4ページのタイトル・共通フッター・バージョン統一|済|対象外：ポケモン相性等の別コンテンツ|
|[#277](https://github.com/Kussoon/kussoon.github.io/pull/277) trial(v2): 2026全国共通県境をiPhoneで旧版と切替比較する独立ページ|済|R02 7県比較、正式版未適用|
|[#276](https://github.com/Kussoon/kussoon.github.io/pull/276) 18タイプ相性トレーニング v1.0 正式公開・回帰テスト整備|済|対象外：ポケモン相性等の別コンテンツ|
|[#275](https://github.com/Kussoon/kussoon.github.io/pull/275) trial(v2): S39 全国共通境界の同位置切替比較ページと7県サンプル|未|R02 比較候補、未マージ|
|[#274](https://github.com/Kussoon/kussoon.github.io/pull/274) タイプ相性トレーニング 第6段階：上級6択・10問クイズ|済|対象外：ポケモン相性等の別コンテンツ|
|[#273](https://github.com/Kussoon/kussoon.github.io/pull/273) タイプ相性トレーニング 第5段階：れんしゅう上級（1攻撃×2防御）|済|対象外：ポケモン相性等の別コンテンツ|
|[#272](https://github.com/Kussoon/kussoon.github.io/pull/272) trial(v2): 全国共通境界の軽量化を0.5%／0.2%で比較・形状検査（S39）|未|R02 簡略化候補、未マージ|
|[#271](https://github.com/Kussoon/kussoon.github.io/pull/271) 上級ボタン無反応を回避：独立した上級学習ページへ直接移動|済|対象外：ポケモン相性等の別コンテンツ|
|[#270](https://github.com/Kussoon/kussoon.github.io/pull/270) trial(v2): 2026年全国47県を一括トポロジー化し安全なArtifactへ出力（S39）|未|R02 全国一括候補、未マージ|
|[#269](https://github.com/Kussoon/kussoon.github.io/pull/269) 「上級：2タイプ」ボタンの切り替えを独立・堅牢化|済|対象外：ポケモン相性等の別コンテンツ|
|[#268](https://github.com/Kussoon/kussoon.github.io/pull/268) audit(v2): S39 全国47県の概要・詳細境界の混在差分を計測|済|R02 S39診断|
|[#266](https://github.com/Kussoon/kussoon.github.io/pull/266) fix(v2): restore county + town labels in isolated progressive preview (S25)|済|R07 郡名922件限定|
|[#265](https://github.com/Kussoon/kussoon.github.io/pull/265) test(v2): iPhone用・全国段階ラベル表示の独立試験ページ|済|R03 試験ページ|
|[#264](https://github.com/Kussoon/kussoon.github.io/pull/264) 18タイプ相性トレーニング 第4段階：まなぶ上級（複合タイプ）|済|対象外：ポケモン相性等の別コンテンツ|
|[#263](https://github.com/Kussoon/kussoon.github.io/pull/263) [Draft] V2全国段階ラベルの復元・境界計算Worker化と回帰検査|未|Worker/pilot opt-in、未マージ|
|[#262](https://github.com/Kussoon/kussoon.github.io/pull/262) docs(v2): 段階ラベル復元の設計と実装前の同縮尺・メモリ比較|済|R03/R04 事前設計|
|[#261](https://github.com/Kussoon/kussoon.github.io/pull/261) docs(v2): 段階ラベル継承の監査漏れを補完し、49仕様を操作・状態・性能で再評価|済|S41〜S49 追加監査|
|[#260](https://github.com/Kussoon/kussoon.github.io/pull/260) fix(v2): 現行ラベル配置を維持して県内周辺名を初期表示し、段別回帰を追加|済|R05 県内ラベル初期表示|
|[#259](https://github.com/Kussoon/kussoon.github.io/pull/259) fix(v2): pilotを地図中心のUIへ整理し、区・親市の6リンク見切れを解消|済|R14–R16 可変高・全体表示|
|[#258](https://github.com/Kussoon/kussoon.github.io/pull/258) iPhone SEでもクイズ全体が収まる小型画面レイアウト|済|対象外：ポケモン相性等の別コンテンツ|
|[#257](https://github.com/Kussoon/kussoon.github.io/pull/257) クイズ中の問題数を画面最上部に固定し縦幅を節約|済|対象外：ポケモン相性等の別コンテンツ|
|[#256](https://github.com/Kussoon/kussoon.github.io/pull/256) 18タイプ相性トレーニング 第3段階：4択クイズと復習|済|対象外：ポケモン相性等の別コンテンツ|
|[#255](https://github.com/Kussoon/kussoon.github.io/pull/255) 18タイプ相性トレーニング：学習・練習画面の漢字にふりがな追加|済|対象外：ポケモン相性等の別コンテンツ|
|[#254](https://github.com/Kussoon/kussoon.github.io/pull/254) 18タイプ相性トレーニング 第2段階：アイコンと練習モード|済|対象外：ポケモン相性等の別コンテンツ|
|[#253](https://github.com/Kussoon/kussoon.github.io/pull/253) test(v2): 2026実形状で現行/5Cラベルを比較し実タッチ回帰を追加|済|R06/R13 ラベル・タッチ比較|
|[#252](https://github.com/Kussoon/kussoon.github.io/pull/252) test(v2): 庁舎の旧期待値2件を現行3/6リンク仕様へ更新しCIへ接続|済|R17/R23 庁舎テスト|
|[#251](https://github.com/Kussoon/kussoon.github.io/pull/251) fix(v2): 全国検索に浜松の現行3区を反映し旧7区を除外|済|R01/R18 浜松検索|
|[#250](https://github.com/Kussoon/kussoon.github.io/pull/250) fix(v2): 同一市域の再タップ解除で投影・表示位置・パン範囲を保持|済|R11 再タップ修正|
|[#249](https://github.com/Kussoon/kussoon.github.io/pull/249) 試作: 18タイプ相性トレーニング 第1段階（学習モード）|済|対象外：ポケモン相性等の別コンテンツ|
|[#248](https://github.com/Kussoon/kussoon.github.io/pull/248) test(v2): 監査台帳を一本化し全国2026の実データ・実ブラウザ回帰CIを追加|済|監査台帳/既存S01〜S40|
|[#247](https://github.com/Kussoon/kussoon.github.io/pull/247) docs(v2): PR245件の監査・回帰計画を既存資料名へ統合（未完事項あり）|未|旧監査案→#248へ統合|
|[#246](https://github.com/Kussoon/kussoon.github.io/pull/246) docs(v2): 全国統合版の初回仕様監査と回帰防止記録|未|旧監査案→#248へ統合|

#91→#244→#259→#287→#288→#290のCSS・JS差分により、#290が単独/二施設ともtoolbar高さ上限を撤去した最終決定と確認した。公開コードは`maps/national-municipalities.html`。#289は#281の脈動と#286/#287の黄赤交互を公開版で置換した。#270/#272/#275/#263は未マージ、#277/#279は独立試験のみ。#283/284/285により正式入口は`/maps/national-municipalities.html`、旧pilotは比較対象である。

<a id="regional-pr-trace"></a>

## 2026-11-06 地域学習マップの別リポジトリ追補（日本時間）

公開地域6リポジトリのPR一覧を最初から最新まで確認。計59件のうち、操作・描画・地名学習に関わる19件は本文・差分とマージ状態を確認し、40件は共通案内・計測・別テーマとして一覧分類した。地図PR以前の直コミットや、各地域の全ページ実機確認は別範囲。地域サイトへのV2移行の可否は正本のR28〜R34を参照。

|リポジトリ|実在PR|詳細照合|一覧分類のみ|
|---|---:|---:|---:|
|nishinomiya|22|9|13|
|takarazuka|7|3|4|
|hyogo|4|0|4|
|amagasaki|12|4|8|
|ashiya|9|1|8|
|itami|5|2|3|

|PR|マージ|現在の位置付け|
|---|---|---|
|[nishinomiya #14](https://github.com/Kussoon/nishinomiya/pull/14) 芦原の場所当てクイズでPCの地図操作を改善|済|R29|
|[nishinomiya #15](https://github.com/Kussoon/nishinomiya/pull/15) 全域場所当てクイズのPC地図表示を拡大|済|R34（全域クイズの広幅レイアウト）|
|[nishinomiya #16](https://github.com/Kussoon/nishinomiya/pull/16) 26コミュニティ場所当てに地図ホイール操作を導入|済|R29|
|[nishinomiya #17](https://github.com/Kussoon/nishinomiya/pull/17) 地域別場所当てクイズ21ページの地図操作を改善|済|R29|
|[nishinomiya #18](https://github.com/Kussoon/nishinomiya/pull/18) 上ヶ原・西宮浜・広田の場所当て地図操作を改善|済|R29|
|[nishinomiya #19](https://github.com/Kussoon/nishinomiya/pull/19) 甲東の場所当てに地図ホイール操作を導入|済|R29|
|[nishinomiya #20](https://github.com/Kussoon/nishinomiya/pull/20) 甲東クイズのホイール案内を地図ボタンから離す|済|R29|
|[nishinomiya #21](https://github.com/Kussoon/nishinomiya/pull/21) 西宮市町名検索に地図ホイール操作モードを追加|済|R28|
|[nishinomiya #22](https://github.com/Kussoon/nishinomiya/pull/22) 町名検索の地図上で町域を直接選択できるようにする|済|R28|
|[takarazuka #5](https://github.com/Kussoon/takarazuka/pull/5) 宝塚コミュニティ場所当ての地図ホイール操作を改善|済|R29|
|[takarazuka #6](https://github.com/Kussoon/takarazuka/pull/6) 仁川の場所当てクイズの地図操作を改善|済|R29|
|[takarazuka #7](https://github.com/Kussoon/takarazuka/pull/7) 宝塚市町名検索のSVG地図にホイール操作モードを追加|済|R28|
|[amagasaki #9](https://github.com/Kussoon/amagasaki/pull/9) 尼崎市町名検索のSVG地図にホイール操作モードを追加|済|R28|
|[amagasaki #10](https://github.com/Kussoon/amagasaki/pull/10) 塚口町の選択表示で内部境界線を目立たなくする|済|R30（塚口町・選択のみ。後続で拡張）|
|[amagasaki #11](https://github.com/Kussoon/amagasaki/pull/11) 町域の選択時の内部境界とタッチ時の表示を改善|済|R30（全町選択とhover）|
|[amagasaki #12](https://github.com/Kussoon/amagasaki/pull/12) 通常の町名地図で町内の丁目境界線を非表示にする|済|R30（通常表示も対象）|
|[ashiya #9](https://github.com/Kussoon/ashiya/pull/9) 芦屋市町名検索のSVG地図にホイール操作モードを追加|済|R28|
|[itami #4](https://github.com/Kussoon/itami/pull/4) 伊丹市町名検索のSVG地図にホイール操作モードを追加|済|R28|
|[itami #5](https://github.com/Kussoon/itami/pull/5) 町名検索で地図上の町域を直接選択できるようにする|済|R28|

既存棚卸しに加え、各市の `town-search.html`、西宮・宝塚の `community-map-quiz.html` と甲東・仁川の代表回答ページ、西宮の全域場所当て、兵庫県の `study-all.html` を各mainから読み取った。試験ページ側のアンカー設定と地域公開版の採用状況を分けて記録した。


## 2026-11-06 JST 仕様判断の反映

ユーザー決定により、空白タップでの選択解除（旧S44）は不採用と確定。市区町村地図要素のキーボード操作（Enter/Space、旧S45）と検索欄Enterによる先頭候補選択（旧S46）は採用確定。いずれも現行公開HTMLでは未実装のため、規則集R18に不整合・実装待ちとして登録した。地図本体はこのDraft追補では変更しない。

## 2026-11-06 JST 追加履歴：#292〜#295（#290の初回監査後）

この4件は初回PR #1〜#290の件数に含まれない。#291は本規則集を整備するDraftで、別枠。追加4件を全PR横断で同深度再監査したという意味ではない。

|PR|適用範囲|規則・変更内容・確認状態|
|---|---|---|
|[#292](https://github.com/Kussoon/kussoon.github.io/pull/292)|正式全国マップ＋共通読取|R03/R07/R12/R18。県全体の選択をドロップダウン限定、郡名付き詳細。静的契約検査追加。Safari未確認|
|[#293](https://github.com/Kussoon/kussoon.github.io/pull/293)|正式全国マップ|R07/R17。地図ラベルと同じ見出しにし親市名重複除去。名称の静的例を追加。Safari未確認|
|[#294](https://github.com/Kussoon/kussoon.github.io/pull/294)|独立試作のみ|R11/R13/R15/R16/R35。縦ドラッグで地図外へ重ね表示。正式版は不変更。実機Safari未確認|
|[#295](https://github.com/Kussoon/kussoon.github.io/pull/295)|独立試作＋共通読取API|R07/R08/R17/R36。試作吹き出しにON時確認済み読み表示。正式版の見出しは未変更。実機Safari未確認|

**採用境界**: #294と#295はマージ済みでも正式版への採用ではない。#292・#293は正式版に適用済み。#294の地図外重なりはR15の試作例外としてのみ扱う。試作から本番への移植には別PRでR15/R35/R36の採用範囲を再定義する。

## 2026-11-06 JST 正式公開採用：PR #296

|PR|範囲|確定内容|
|---|---|---|
|[#296](https://github.com/Kussoon/kussoon.github.io/pull/296)|正式版 `maps/national-municipalities.html`|検索・地域/範囲選択を地図上へ。試作 #294 の上下ドラッグ/地図外重なりと #295 の吹き出し読みON/OFFを本番採用。試作タイトルとnoindexを本番へ持ち込まない。R08/R15/R16/R19/R35/R36などを更新。正式URLは不変。静的確認済み、iPhone Safari実機未確認|

過去の#294/#295の「試作のみ」という評価は当時の履歴。#296以後はR35/R36が本番にも適用される。地図内固定へ戻す修正は最新規則に反する。

## 2026-11-06 JST 公開版UI改善：PR #297

|PR|対象|規則と到達状況|
|---|---|---|
|[#297](https://github.com/Kussoon/kussoon.github.io/pull/297)|正式版全国市区町村マップ|R13/R15/R16/R18/R19/R35/R37/R38。候補左スクロールバー、短い検索例・箇条書き案内、ポップアップ全域上下ドラッグ（リンク等除外）、本文送出操作、地図だけの全画面モード。iPhoneでは画面内拡大表示。静的検査のみ、実機未確認|

## 2026-11-06 JST 全画面・検索順・公開文面：PR #298

|PR|対象|採用規則・検証境界|
|---|---|---|
|[#298](https://github.com/Kussoon/kussoon.github.io/pull/298)|正式版全国市区町村マップ|R18/R19/R37。全画面でも左下の吹き出し表示（#297の禁止を置換）。検索候補は市区町村コード昇順で上位35件を表示。通常時診断数値の非表示、読み込み/エラー表示の維持、公開版から比較版リンク除去、注意文簡略化。JavaScript構文・静的検査のみ、iPhone Safari実機未確認|

## 2026-11-06 JST 右側操作ボタン配置：PR #299

|PR|対象|採用判断・検証|
|---|---|---|
|[#299](https://github.com/Kussoon/kussoon.github.io/pull/299)|正式全国市区町村マップ|R13/R14/R37。拡大縮小は＋／－の左右同幅2列、全体表示・よみがなは右下、全画面は右上。ボタン文字を大きくし、iPhoneでも44px以上の押下高。JS構文・静的契約チェックは確認、iPhone実機未確認|

## 2026-11-06 JST 地域選択・表示範囲の公開UI：PR #300

|PR|範囲|採用・検証|
|---|---|---|
|[#300](https://github.com/Kussoon/kussoon.github.io/pull/300)|正式全国市区町村マップ|R03/R05/R18/R19。県名を下向き3列の選択メニュー（北海道から）に表示。市区町村も県読込後に下向き単列で選択。地名はクイズ以外常時表示、全域・離島を含む全国範囲を固定。説明順の変更とページ最下部へのサイトリンク移動。静的チェックのみでiPhone Safari未確認|
