# 語学復習アプリ — 開発引き継ぎ仕様書
更新日：2026-11-24

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
- タブ区切りの日本語・外国語・解説を登録。重複チェックあり。
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
