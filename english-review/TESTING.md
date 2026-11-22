# 英語復習アプリ：認証テスト手順

対象: `/english-review/`（PR #706 の試作版）

## 現在の状態
- Firebase プロジェクト: `english-review-6ffa5`
- Google ログインプロバイダ: Firebase Console で有効化済み（ユーザー提供の画面）
- 承認済みドメイン: `kussoon.com`（ユーザー提供の画面）
- ホスティング: GitHub Pages を利用。Firebase Hosting は使用しない
- Firestore ルール: `/users/{userId}` と配下に限り、`request.auth.uid == userId` を許可する設定が提示された。ただし実際に公開済みかは未検証
- この試作ページは Firestore をまだ使用しない

## 公開前に確認すること
1. PR #706 の差分を確認し、必要なら main にマージする（現時点では Draft）。
2. GitHub Pages のデプロイ完了を確認する。
3. `https://kussoon.com/english-review/` にアクセスする。
4. Googleでログイン → Googleアカウントを選択 → ログイン中の名前とメールアドレスが表示されること。
5. ページを再読み込みしてもログイン状態が復元されること。
6. ログアウト → 「ログインしていません」と表示されること。
7. iPhone Safari と PC ブラウザで確認する。ポップアップがブロックされる場合はエラーコードを記録する。
8. Firebase Authentication の「ユーザー」にログインした UID が現れること。

## 注意事項
- Firebase Web API key は公開クライアント設定値であり、これ自体は秘密鍵ではない。ただし API key 制限、認証プロバイダ、Firestore Security Rules、請求設定を別途確認する。
- Googleログインに使用する Firebase Authentication の承認済みドメインは `kussoon.com`。別ホスト名（例: `www.kussoon.com` や GitHub Pages の元ドメイン）で試す場合は追加承認が必要になることがある。
- iPhone Safari で `signInWithPopup` が失敗する場合は、動作を確認してからリダイレクト方式へ変更する。安易に Firebase Hosting を追加しない。
- Googleログインの成功は Firestore の安全性を保証しない。保存機能を追加する前にルールの公開状態と他人のUIDへのアクセス拒否をテストする。
- 認証済みであれば誰でもログインできる構成。特定ユーザーだけに限定する場合は別途アクセス制御が必要。
- `noindex` は検索エンジンへの指示であり、ページへのアクセス制限ではない。
