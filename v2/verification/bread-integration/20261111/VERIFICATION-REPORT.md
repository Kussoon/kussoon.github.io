# パン屋マップ 最終統合検証

検証日：2026-11-11（日本時間）。正式公開前の検証版。main・本番サイトへの変更、マージ、公開、Excel正式採用は行わない。

## 統合内容と依存関係

PR #410 → #412 → #414 → 本PRの積み重ねを維持する。本PRのbaseは `fix/bread-nine-coordinates-20261111`。PR #413は[二次重点調査の根拠資料](https://github.com/Kussoon/kussoon.github.io/pull/413)として独立参照し、ブランチをマージしない。PR #415もmainからの独立修正PRのまま扱い、初期化コードの差分のみ移植した。参照SHAは `sources.json` に固定。

PR #414のHTML v1.3.13を保管したまま、別ファイル `unified-bread-map-v1.3.13-integrated-verification-20261111.html` を追加した。変更は `initialization.patch` の1か所のみ：MarkerClusterの `animate:false` と、読込失敗時にp.mapnoteを作成してL.layerGroupで表示を続ける処理。クラスタ・spiderfy・施設まとめピンは保持する。クラスタの分裂・結合アニメーションは省略する。HTML版表示・公開文は元の検証版を維持し、統合版はファイル名で区別する。古いHTML全体による本番HTMLの上書きは行わない。

## 全263件とHTMLの保全

`python3 v2/tests/verify-bread-master.py`、`python3 v2/tests/verify-bread-integration.py`：PASS。

- 管理263、公開262、通常245、参考候補17、閉店履歴1。SAILOR非公開を維持。
- 修正9件：No.17 / 97 / 107 / 111 / 112 / 113 / 114 / 207 / 209。他254店舗の座標はmainと一致。
- PR #414と統合版のbread-data全体はバイト一致。店名・住所・公式リンク・備考・public_note・public_displayを含む、全非座標項目はmainと一致。
- Excel v1.4.4候補はPR #414とバイト一致。11シート・履歴・管理情報を保管。全263件のNo./key・座標と、HTMLに存在する全Excel共通列を照合。Excel固有の「入力区分」はHTML表示項目ではない。HTML固有のpublic_displayはmainおよび #414との全項目一致で保全を確認。
- #414の既存静的検証も再実行し、版・データ日・noindex・座標以外のHTMLがmainと一致することを確認。さらに統合版が #415の初期化差分だけであることを完全一致で検査。CSS、既存文章・機能コード、Umami、フッターを保持。
- `all-263-diff.csv`：全263件の旧新座標・変更有無・非座標項目保全・Excel照合。`validation.json`：結果とSHA256。9件の承認値・根拠は #414の `cumulative-nine-diff.csv` と `nine-records.json` を参照し、原資料は編集しない。

## 最新mainとの比較

開始時main：`69514bd6ff889c0051801c9c92a22a33104913ac`。`maps/unified-bread-map.html` のblobは #414基準と同じ `e2278afe8a3a0435f7cbfe3eb15c02c36ee8236b`。共通フッターも差分なし。#414基点からmainへの独立差分は `v2/autonomous-bus-subsidies/` の5ファイル・846行の追加であり、今回のパン屋HTMLには影響しない。積み重ねを保つためmainの別作業をこのPRへ取り込まず、該当ファイルも変更しない。このブランチ全体を公開用mainの置換に使わない。

## ブラウザー回帰

`v2/tests/bread-marker-refresh.browser.cjs` は #415からバイト一致で再利用。`bread-integration.browser.cjs` は同一テストを次の3対象に実行する。

1. 修正前の #414 HTML：No.111のピン消失による失敗を確認。ブラウザー起動失敗などは再現成功と判定しない。
2. 統合HTML：Chromium/WebKit × 幅1440/390px × MarkerCluster正常/JS読込失敗＝8条件。
3. #415修正後の本番HTMLを一時ファイルへ取得：既存回帰を同じ8条件で再実行。本番ファイルは変更しない。

9店舗の単独検索と実座標、17→97→107→111と逆順を各3回、通常fill/click、5都市・店舗種別、参考候補、ピン→詳細→地図、拡大縮小・全体表示、施設まとめピン・クラスタ、SAILOR・該当なし、pageerrorなしを検証する。失敗時は案内文と個別ピン継続も検査する。

MarkerCluster 1.5.3は正規配布元から取得しSHA256 `1e4e1d22972a3926f48598e0caf14e3fe7049835d428a344fed4f9e3665b3508` を照合して配信。背景タイル・外部CSS・解析通信は遮断する。製品HTMLにテスト用APIは追加しない。

実行結果は検証完了後に下へ追記する。ローカルWebKitは起動を試したが共有ライブラリ不足（libgtk-4等）のため実行不可。WebKitはGitHub Actions Ubuntuで検証する。

## 残る検証範囲

iPhone Safari実機、実ネットワーク上の背景地図・外部CSS/CDN・Umami計測の到達確認、航空写真・現地・店舗入口の実測は対象外。施設代表点・概略点を入口確定点へ変更しない。No.97の概略精度、No.209の営業実態未確定、Excel候補の正式採用保留を維持する。

既存PR #410/#412/#413/#414/#415は変更せず、最終検収はChatで行う。マージ・正式公開は別途判断する。
