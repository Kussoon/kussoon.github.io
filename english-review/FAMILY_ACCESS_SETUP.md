# 家族限定アクセス設定（公開前に必須）

このブランチの画面は `access/{uid}` を読み、`enabled: true` のユーザーだけに「利用が許可されています」と表示します。**画面表示だけではセキュリティになりません。Firestore Rules の更新が必須です。**

## 1. Firestore Rules に設定する内容

Firebase Console → Firestore Database → ルールで、現在のルール全体を次に置き換えて公開します。

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー本人のみ自分の許可情報を読める。クライアントから変更不可。
    match /access/{userId} {
      allow get: if request.auth != null && request.auth.uid == userId;
      allow list, create, update, delete: if false;
    }
    // 未許可ユーザーは自分のデータにもアクセスできない。
    match /users/{userId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId
        && get(/databases/$(database)/documents/access/$(userId)).data.enabled == true;
      match /{document=**} {
        allow read, write: if request.auth != null
          && request.auth.uid == userId
          && get(/databases/$(database)/documents/access/$(userId)).data.enabled == true;
      }
    }
  }
}
```

注: `get()` の参照先が存在しない場合は許可されず、未登録は拒否になります。クライアントから `access` を作成・変更できません。Firebase Console の管理者操作のみで許可を変更してください。

## 2. 自分を許可する

Firebase Console → Authentication → ユーザーで、ログイン済みの自分の UID を確認します。UID を他人のものと取り違えないでください。

Firebase Console → Firestore Database → データ → コレクション `access` を作成。ドキュメントIDを自分の UID とし、フィールド `enabled` を boolean `true` に設定します。必要なら `role` を string `admin` として記録できますが、**現段階では role はアクセス権限を与えません**。許可者の追加・削除は Firebase Console から行います。

家族のアカウントも、各自がGoogleログインした際に画面に表示される UID を確認して同様に登録します。メールアドレスはGitHubの公開コードに書きません。

## 3. テスト

- 登録済み UID は許可表示、未登録 UID は拒否表示
- Firestore Rules のシミュレータで、未許可 UID の `users/{uid}/cards/{cardId}` の read/write が拒否されることを確認
- 許可済み UID で自分のデータは許可、他人のデータは拒否
- `access/{uid}` へのクライアント書き込みは全員拒否
- 画面が許可確認エラーを出したら、Firestore Rules・データの UID と型・Firebaseプロジェクトを確認

**順序:** まずルールと本人の `access/{uid}` を設定し、次にPRをマージしてください。先にマージすると本人も未許可扱いになります。

GitHub Pages の HTML は公開され、noindex はアクセス制限ではありません。ログイン自体はGoogleアカウントを持つ誰でも行えますが、学習データへのアクセスは上記ルールで制限されます。認証ユーザーの作成自体を制限する仕組みではありません。
