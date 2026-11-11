# iPhone Safari用・一時プレビュー（本番とは別）

作成日：2026-11-11。PR #418 の統合検証HTMLからの派生です。mainと本番HTMLは変更しません。

## 表示URL（外部のHTMLプレビュープロキシ）

https://raw.githack.com/Kussoon/kussoon.github.io/9c8f9b5894dd85f92a08c19ba86e4f6a0055d416/v2/verification/bread-integration/20261111/iphone-safari-preview.html

閲覧にはraw.githack.comという第三者の公開HTML表示サービスを利用します。開く前に確認画面が表示される場合は、GitHub上の自分のリポジトリとファイル名を確認してから進んでください。確認ページやURLに不審な変更があれば開かず報告してください。プレビューの安定稼働は保証されません。

プレビュー元のGitHubファイル:
https://github.com/Kussoon/kussoon.github.io/blob/verify/bread-iphone-safari-preview-20261111/v2/verification/bread-integration/20261111/iphone-safari-preview.html

## ファイルの差分・保護

- PR #418 の `unified-bread-map-v1.3.13-integrated-verification-20261111.html` を複製。
- 変更したのは、共通フッタースクリプトの参照を `/common/footer-links.js` から `https://kussoon.com/common/footer-links.js` にした1箇所のみ。
- HTML中の `bread-data`、263件の座標・店名・住所・公開文、MarkerClusterの安定化処理は元の統合検証版と同じ。
- `robots=noindex,nofollow,noarchive` を維持。なお**公開リポジトリと外部プレビューのURLはアクセス制限されておらず、非公開ページではありません**。
- Umamiは既存HTMLのまま `kussoon.com` と `www.kussoon.com` でのみ有効になる。プレビューの計測はしない。
- 背景地図（OpenStreetMap）・MarkerClusterの外部CDNなどはSafariからの実通信。接続に失敗したらスクリーンショットとともに報告。

## iPhone Safariでの確認手順

1. URLをSafariで開き、緑の通常ピン・紫の参考ピンと背景地図が見えることを確認する。
2. 検索窓で以下を順番に入力し、各結果をタップする：
   - ボン・シエール（No.17）
   - オー･ボン･ガトー･ビゴ（No.97）
   - 万代 西宮今津店（No.107）
   - いかり甲陽園店（No.111）
   毎回、該当するピンが地図に現れるか確認。できれば素早い操作とゆっくりした操作の両方を行う。
3. 逆順（111→107→97→17）でも確認する。
4. 地図ピンタップ→吹き出し→詳細→地図に戻る。店舗一覧と地図の連動、右上の＋／－／全体、都市別チェックボックスと業態別絞込を確認する。
5. ダークモード・ライトモード、縦向き・横向きでレイアウトを確認する。
6. 気になる点があれば画面スクリーンショットと操作順序をChatへ送る。正常なら「Safari確認OK」と伝える。

**確認上の限界**：raw.githackは本番と異なるドメインであり、外部スクリプト・CDN・共通フッターの通信条件が本番と異なる可能性がある。Safariでの表示確認だけでは本番環境の完全な試験にはならない。

## 次工程

Safari確認で合格した後に、PR #418 の統合HTMLをベースに**本番 `maps/unified-bread-map.html` への適用のみ**を行う別ドラフトPRを作る。PRをマージ・公開するのは、Chatで差分とテスト結果を承認した後。PR #410→#412→#414→#418 と #413（根拠）・#415（独立バグ修正）を保護。
