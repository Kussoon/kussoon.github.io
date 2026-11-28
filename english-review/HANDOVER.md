# 語学復習アプリ — 開発引き継ぎ仕様書
更新日：2026-11-28

## 構成
- 公開URL：https://kussoon.com/english-review/
- GitHub：Kussoon/kussoon.github.io、main、english-review/index.html
- GitHub Pages の静的HTML・CSS・JavaScript。独自ドメイン kussoon.com。
- Firebase プロジェクト english-review-6ffa5。Firebase Web SDK 13.4.0（現行コード参照）。
- Googleログイン、Cloud Firestore。独自のアプリサーバーは不要。
- 本書は公開可能な技術情報のみ。秘密鍵、パスワード、UID、個人の教材・学習データを記載しない。

## 認証・アクセス制限
- Google認証後、access/{uid} の enabled が true の利用者だけ許可する。
- users/{uid} 以下は本人かつ許可済みの場合のみ読み書き可能とする。access は本人の get のみ、クライアントからの変更は禁止する。
- Firebaseコンソールの実際のルールと許可状態は管理者が確認すること。公開HTMLだけでは確認できない。
- 管理者向け設定手順は FAMILY_ACCESS_SETUP.md も参照する。公開リポジトリに学習データを保存しない。

## データ構造
- users/{uid}/expressions/{id}：q（日本語）、answer（外国語）、why（解説）、language（en/fr、旧データは en）、createdAt、batchId、batchIndex、initialNumber、situation、sortOrder、correctCount、wrongCount、lastReviewedAt、lastCorrectAt、lastCorrect。
- users/{uid}/sessions：language、mode、answers（id と correct）、score、count、finishedAt。
- users/{uid}/review/progress：英語の旧来の集計（attempts、lastScore、lastCount、lastAt）。
- 固有ID・初回登録番号・登録日時・履歴を保持する。分類のために削除・再登録しない。

## 現行機能
- 英語・フランス語切替、日本語から外国語を想起、模範解答・解説表示、自己採点、問題編集。
- 全件、番号範囲、登録バッチ、直近登録・学習、先月、前回誤答、未習得、シチュエーション別の復習。シャッフルは初期OFF。
- 「復習表現を登録」で日本語と外国語、任意の解説・分類をタブ区切りで取り込む。1〜1,000件を個別編集でき、下書きは端末・利用者・言語ごとに自動保存する。
- 登録時は日本語と外国語の組が一致する重複をまとめて省略する。別の問題としてすべて残す設定も選べる。表現・採番カウンター・重複照合用の参照を同じトランザクションで保存する。同じ下書き行の再試行には同じ固有IDを使う。検証手順は IMPORT_EDITOR_VERIFICATION.md に記載。
- 問題別正誤回数・最終学習・最終正解・前回正誤を表示。
- 最下部の管理メニューで最新一覧、整理用JSON、変更件数確認、反映前バックアップ。
- 整理用JSON format: kussoon-language-review-v1。language と expressions を持つ。分類は situation、順序は sortOrder。初回番号は initialNumber。整理時はこの2項目だけを変更すること。現行インポートは本文編集にも対応するため、意図しない本文変更に注意。上限5,000件。
- バックアップ format: kussoon-language-review-backup-v1。表現・セッション・集計を含む。整理用JSONとは別形式であり、自動復元機能があるとは限らない。
- 2026-11-24：英語1,438件を19カテゴリーに整理し、利用者が画面で反映を確認。

## 開発方針
- スピード・回転数重視。通常の復習画面を妨げないよう管理機能は下部の折り畳みに置く。
- 個人の教材は許可済みアカウントの Firestore に保存し、公開ソースに含めない。
- 将来構想：フランス語の穴埋め問題（未実装）。
- 変更前に main の最新コードと本書を読む。既存の認証・データ互換性を維持し、構文・回帰検査を行う。実データへの試験書き込みを避ける。
- PRで変更し、main 反映と GitHub Pages の公開反映を区別して確認する。iPhone Safari でも確認する。
- 機能・構成変更時は同じPRで本書も更新する。本書を引き継ぎの基準とし、実装との差異は現行コードで確認する。

## 新しいチャットへの依頼例
この語学復習アプリの開発を引き継いでください。https://kussoon.com/english-review/ と GitHub Kussoon/kussoon.github.io の english-review/HANDOVER.md、index.html を確認し、既存データを維持して作業してください。

## 未分類の追加整理
- 復習範囲に未分類の表現を追加。管理メニューに現在の言語の未分類件数と未分類のみのJSON出力を追加。
- scope: unclassified の整理用JSONは部分反映可能。対象は現在も未分類の既存IDのみ。本文・初回番号・学習履歴は変更せず、situation と sortOrder のみ更新。反映前バックアップを維持。
- 部分整理時は scope を保持し、既存分類済み表現と順序が衝突しないよう元の sortOrder を維持することを推奨。


## 復習操作改善
未学習範囲を追加。問題別保存失敗時は次問に進まず再試行可能。採点後は進捗位置へスクロールし、解答欄の余白と下端の余裕を調整。セッション途中再開・教材一括置換は別工程。


## 途中再開
review/active-en, active-fr に出題ID順、回答、進捗を保存。採点はFirestore transactionで問題別履歴と同時更新、最終問は同一transactionでsessionsにも保存。別端末の進行を検知したら再読み込み。旧progress集計は新規更新しない。実機未検証。途中終了・教材削除との整合は次工程。


## 三段階判定
learningState: excluded / learned / learning。通常範囲はexcludedを除外、全件・除外のみ範囲で再判定して復帰可能。三ボタンは均等横一列。除外は正誤回数を増やさない。旧lastCorrectは状態未設定時の互換用。実機検証とバックアップ・リセット対応は残工程。


## 教材置換・途中終了
専用replacement-plan-v1 JSONをローカル選択し、英語ID照合、バックアップ、明示確認後に300操作単位で更新。英語のみ履歴・判定・セッション初期化。統合対象は物理削除（通常の出題除外とは別）。途中終了は採点済み回答をpartialセッションとして保存。別端末での同時操作は避ける。実機・実データ検証は未実施。


## 長い復習・試用モード・履歴初期化（PR #767、未公開）
- 新規復習は reviewChunks/{sessionId}-{index} に200問単位で出題ID・回答を保存し、active-en/fr と sessions は概要を保持する。旧配列形式も読み込む。復習問題数の5000件制限は撤廃済み（整理用JSONの制限とは別）。
- 試用モードは最下部の開発用メニューから切替。同じタブのsessionStorageで保持。採点はメモリのみ、教材登録・管理・編集を制限する。通常復習の途中で切替不可。三段階判定の模擬テストでtransaction非呼出を確認したが、実ブラウザ・Firebaseでの全経路検証は未実施。
- 履歴初期化は選択言語の直前セッション、終了日、初回登録番号、全履歴を対象とする。バックアップ・確認後に問題別集計とセッションを同一writeBatchで更新。旧履歴不足時は部分取消を拒否する。教材本文・登録情報は保持する。
- 履歴初期化の450書込制限は撤廃。review/reset-en または reset-fr に状態・進捗を保存し、resetPlans に最大300操作かつサイズ制限付きの計画を保存する。更新と進捗を同一transactionで確定。stagingは破棄可能、runningは復旧ボタンで再開。通常復習のtransactionは初期化状態を確認する。登録・一括管理は事前確認方式であり完全な同時操作防止ではない。別端末の操作を終了してから実行すること。計画の自動清掃・バックアップ自動復元は未実装。
- 構文検査、試用三判定、1608件の分割更新・中断再開・重複防止、言語別計画、未実行計画破棄、集計5パターンの模擬検査済み。実ブラウザ・Firebase実環境、全経路の競合検査は未実施。正式公開前に確認する。
- V2検証ページは撤去済み。正式版mainへの反映は別途行う。


## v1.6統合版（検証中・正式版は未変更）
- 検証版：`english-review/delta-preview-v16.html`。正式版 `english-review/index.html` は利用者の実機確認・承認前に差し替えない。
- v1.6はv1.5の教材IndexedDBキャッシュ、Firestore差分同期、24時間ごとの全件再同期、万年カレンダー、教材永久削除、教材名同期、途中再開等を維持し、PR #774の登録前編集機能を統合する。
- 登録前の下書きはブラウザーのlocalStorageに利用者・言語ごとに保存する。登録は差分同期後のキャッシュを基に既存重複を確認し、同じ下書き行IDとトランザクションを再利用する。登録文書には syncUpdatedAt を設定して、他端末の差分同期で取り込む。
- 教材キャッシュはIndexedDBに保存。差分同期カーソルは syncUpdatedAt、教材置換・物理削除時は review/bankEpoch により他端末へ全件同期を要求する。24時間経過時も全件再同期する。
- 学習履歴のsessions一覧はIndexedDBにキャッシュし、syncUpdatedAt の差分を取得する。review/historyEpoch の変更（履歴の初期化・教材置換）時と24時間経過時は全件再同期する。履歴詳細のチャンクは直近3件ずつのみ取得し、同じ端末では直近履歴の回答をキャッシュする。
- 既存のsessions文書にsyncUpdatedAtがない場合は初回全件同期で取得し、キャッシュに保持する。新規完了分からsyncUpdatedAtで差分取得する。初回同期と24時間ごとの全件同期は履歴件数に応じた読み取りになる。
- v1.6検証ページも既存Firebaseプロジェクトを参照する。ログイン後の読取は実データが対象。試用モードの採点は保存しないが、登録・編集・削除・通常学習は本番Firebaseへ保存する。合成データ以外で書き込み検証をしない。

## 仕様・変更履歴の基準
- `SPEC.md` が統合版の現行仕様、`CHANGELOG.md` がリリース変更履歴、`VERIFICATION_V16.md` がv1.6の検証記録。
- 次の変更も同じPRで仕様・履歴・検証記録を更新する。コードと文書が食い違う場合は現行コードを調べ、採用した仕様をPRに明記する。
