# PR #774 登録前編集検証（2026-11-27）

本番データ・Firebase本番には書き込んでいません。Draftのまま、公開は行っていません。

## 実行済み

- Node JavaScript構文検査、git diff --check。
- Chromium 375×900、430×900、1280×900：個別編集、再読込による下書き復元、英仏切替、重複候補削除、個別削除、125件のカード表示。横はみ出しとJavaScript例外なし。
- jsdom合成データ：選択削除、1000件編集・破棄、125件登録。
- トランザクション模擬モデル：保存成功後の応答消失→同じ下書きで再実行して件数不変、2クライアント同時登録で番号重複なし。
- Firestoreエミュレーター（demo-review774、Firestore SDK 13.4.0）：125件登録、独立した2クライアントの同文同時登録で確認・省略、番号重複なし、コミット後の応答消失→再試行で1件のみ、SDK disableNetwork/enableNetworkによる切断復帰、既存教材とセッションの不変を確認。
- 同エミュレーターで、未認証・未許可ユーザー・他人UIDの拒否、access書込み拒否、許可済み本人のカウンター読書き許可を確認。
- ブラウザー・モデル試験では仮の認証・保存実装を使用。Firestore試験では実SDKとエミュレーター、記載のSecurity Rulesを使用。本番サービスの設定値そのものは未取得です。

## 修正

- 編集欄に文字数上限、分類120文字の登録前検証。
- 復元下書きの件数・行形状・IDを検証。言語切替時にバッチ状態を初期化。
- 登録途中のエラー後、登録済み行の編集は再実行で更新されないことを明記。
- 同文の同時登録を検出するimport-keyドキュメントを同じトランザクションで確認・保存。確認ダイアログはトランザクション外で表示。
- 初回番号未確定の既存教材がある場合は登録を停止。既存番号を推測して衝突することを防止。

## 権限・番号管理の照合

新規パスは users/{uid}/expressions/{language}-draft-{rowId} と users/{uid}/review/import-counter-{language}、users/{uid}/review/import-key-{language}-{hash}。FAMILY_ACCESS_SETUP.mdの本人・許可済みユーザー限定ルールでは両方が対象です。カウンターと表現を同一トランザクションで作成、同一行IDの再実行は書き込まず省略。既存の表現ドキュメント・学習履歴は更新しません。

**公開済みRulesの実物は取得できていません。** リポジトリのFAMILY_ACCESS_SETUP.mdに記載されたルールとの適合性はエミュレーターで検証済みです。Firebase Consoleで現在公開中のルールがこの内容と一致することの確認が公開前に必要です。同文の同時登録はこのPRの新しい登録処理間で保護します。旧版の登録処理など、import-keyを書かない処理との同時操作は対象外です。

## 実機確認手順（統合前）

1. このPRのHTMLを検証専用プロジェクトのFirebase設定に接続したプレビューで開く。本番アカウントへの登録試験は行わない。
2. iPhone Safariで数行を貼付→登録前編集。日本語・外国語・解説・分類を編集し、個別削除と選択削除を確認。
3. ページ再読込で復元、英仏を切替えて下書きが分かれることを確認。下書きはその端末・ブラウザー内保存であり端末間同期はしない。
4. 合成125件を登録。途中でオフライン→再接続→同じ下書きで再実行し、保存済みの行IDと番号が変わらず二重登録されないことを確認。
5. 同じ検証ユーザーで2端末から別の合成データを同時登録し、初回番号の重複がないことを確認。
6. 未許可ユーザー・他人UIDへの読書き拒否をRulesエミュレーターで確認。

## 再実行

tests/import-editor-model.cjs は jsdom、tests/import-editor-browser.cjs は playwright と @sparticuz/chromium を使います。テストは合成データのみ、外部リクエストを遮断します。REVIEW_JSDOM、REVIEW_CHROMIUMで導入済みモジュールのパスを指定できます。

自動検証は実ブラウザー・実SDK・エミュレーターで完了しました。iPhone実機と公開済みRulesの一致確認は残っています。本番への統合・公開はユーザー確認後です。

### エミュレーター試験の再実行

Java 21とfirebase-tools、firebase 13.4.0、@firebase/rules-unit-testing、jsdomを使用。FAMILY_ACCESS_SETUP.mdのルールをテスト用firestore.rulesへ抽出し、Firestoreポート8087・UI無効のfirebase.jsonを指定します。

```sh
firebase emulators:exec --only firestore --project demo-review774 --config /path/to/test/firebase.json 'node english-review/tests/import-editor-firestore.cjs'
```

REVIEW_RULES_TESTING、REVIEW_FIRESTORE、REVIEW_JSDOMでモジュールの絶対パスを指定できます。Nodeとjsdom間のオブジェクトはテスト境界でホスト側のplain objectへ変換し、実トランザクションへ渡しています。

## 重複確認の一括化

登録前に重複を「まとめて省略／別問題としてすべて残す」から選択します。通常は省略です。登録開始時の確認は1回のみで、行ごとの確認ダイアログは表示しません。同時登録で検出した重複にも同じ方針を適用します。125件すべてが既存重複の場合の省略・保持、およびトランザクション内の重複検出による省略を実行ハーネスで検証し、追加の確認なしを確認しました。
