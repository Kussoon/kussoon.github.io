# V2共通回帰一覧｜廃止された川西町名共通試作の参照整理

2026-11-17。西宮市SVG V38表示厳格監査は [run 44049432482](https://github.com/Kussoon/kussoon.github.io/actions/runs/44049432482) でPASS。一方、そのブランチで同時起動したV2共通検査 [run 44049432611](https://github.com/Kussoon/kussoon.github.io/actions/runs/44049432611) は全国地図のブラウザー検査がPASS、構成検査が `MODULE_NOT_FOUND` で失敗した。

`v2/tests/run-national-contracts.cjs` は、現在mainに存在しない `v2/tests/kawanishi-town-map-contract.test.cjs` を実行しようとして失敗。また続いて呼ぶ `town-map-adapter-regression.test.cjs` はファイルこそmainに残るが、テストで読み込む `v2/common/js/town-map-engine.js`、`v2/town-map/index.html`、`v2/data/town-maps/28217.json` がmainにはない。これらは旧試作ブランチ `kawanishi-town-common-preview` にはあり、廃止ブランチ `remove/rejected-kawanishi-prototype-20261116` には存在しない。廃止済み試作のテスト項目だけ実行一覧に残された不整合と判断する。

このPRでは**上記2件の孤立したテストの呼び出しだけ**共通実行一覧から削除する。全国47都道府県、SVG V2、県別クイズ、町名の正式採用仕様・既存テストの呼出しは変更しない。残された旧試作テストそのものは削除しないが、将来新たな町名共通エンジンを正式採用したら、仕様を定めて新しい検査を実装・登録することを明記する。

これは存在する検査の失敗を握り潰すための条件分岐・強制PASSではない。既に廃止した実装の不存在を正しく反映するテスト登録の修正であり、適用後にV2の全CIを再実行して合否を確認する。正式な西宮市C版・SVG V34・地図エンジンへの変更はなし。

## 自動検査の結果

[Run 44050397200](https://github.com/Kussoon/kussoon.github.io/actions/runs/44050397200) では **両ジョブPASS**：
- `data-and-components`：廃止済み試作を除く現行V2構成・全国データ検査がPASS。
- `real-browser`：全国V2の実ブラウザー検査、WebKitスマートフォン相当の表示・リセット検査がPASS。

このPRは診断された旧試作のテスト参照2件だけの整理であり、正式版・SVG V34・共通地図エンジンのソースは変更していない。現在Draft・main未統合。
