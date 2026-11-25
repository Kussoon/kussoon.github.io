# 出典・利用条件

## 固定入力

| 入力 | 基準・識別子 | SHA-256 |
|---|---|---|
| 全国統合マスター Ver.1.3.3 | 台帳基準日 2026-11-23。PR #759の店舗情報・出典証跡を継承したPR #766版 [Excel正本](https://raw.githubusercontent.com/Kussoon/kussoon.github.io/1b1d65eb49ea6d0eb2269324e1ac4f7beb38b321/v2/verification/aeon-national-v1.3.3/aeon-national-master-v1.3.3.xlsx) | `6a3f69c0ae247fe7bc870e29b8b60f019aee10316c5ca81974c6831ae0d75ad2` |
| 全国地図用 `stores.json` | PR #766固定版と現行mainのVer.0.11検証版はバイト一致 [PR #766版](https://raw.githubusercontent.com/Kussoon/kussoon.github.io/1b1d65eb49ea6d0eb2269324e1ac4f7beb38b321/v2/verification/aeon-national-v1.3.3/map/stores.json) | `f2f3a9daa37948ec731a1bbd8409455259018052a2c118ad8a959de6498684a6` |
| PR #761 全件監査 | N03期待自治体コードと台帳住所の対応のみ継承 [監査ZIP](https://raw.githubusercontent.com/Kussoon/kussoon.github.io/d8386b848e7aea279b4c2ccd52da98e76d2d6290/v2/verification/aeon-admin-audit-20261125/aeon-admin-audit-20261125.zip) | `3f4139826558a026a843e0441c943db1bc3238dbfa255b443500ac99bdd1cdaf` |
| 全国市区町村マップ2026・庁舎台帳・ナンバープレート形状 | main `7f73f359cb2305f4029ffecb46fa0c1560ca3137`。公開版HTML、47県詳細、7県の共有境界パス、全国地名索引、47県庁舎JSON、県別ナンバーHTML埋め込みデータを使用 [リポジトリ固定版](https://github.com/Kussoon/kussoon.github.io/tree/7f73f359cb2305f4029ffecb46fa0c1560ca3137) | Gitコミットで固定 |

PR #765はVer.1.3.3への座標採用経緯の確認に用いました。店舗の所属判定にはExcelの住所と自治体コードおよびPR #761の住所監査列を使用しました。運営会社の根拠や屋号の確認資料はExcelの記録および公式URLを引き継ぎます。 [PR #759](https://github.com/Kussoon/kussoon.github.io/pull/759) · [PR #761](https://github.com/Kussoon/kussoon.github.io/pull/761) · [PR #765](https://github.com/Kussoon/kussoon.github.io/pull/765) · [PR #766](https://github.com/Kussoon/kussoon.github.io/pull/766)

## 行政区域の加工履歴と利用

推奨する出典表記は「国土数値情報『行政区域データ（N03、2026年1月1日時点）』（国土交通省）をもとにKussoonが加工」です。MLITの個別ページはCC BY 4.0、ダウンロードサイトは公共データ利用規約1.0を掲示しています。CC BY 4.0は商用利用も許諾します。広告を伴う場合も、出典・原典URL・ライセンス・加工の明示を行い、国が作成・推奨した表示と誤認させない扱いが必要です。 [N03 2026](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) · [国土数値情報利用規約](https://nlftp.mlit.go.jp/ksj/other/agreement.html) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)

N03の原典ページは国土地理院の基本測量成果、総務省コード一覧、国土地理院長承認（複製）`R 7JHf 351` を明示しています。将来、境界形状を配信する際の測量法上の取扱いは、採用する境界データ・掲載方法が確定した時点で確認事項として残します。今回の配布物は統計とコード表です。 [国土地理院の測量成果利用手続](https://www.gsi.go.jp/LAW/2930-index.html)

全国市区町村マップの県詳細は2026年版から生成した20m簡略化TopoJSONと、7県の共有境界版を使用します。全国概要は簡略化した47都道府県の輪郭、全国地名索引は独立の1,905コードです。ナンバープレート地図は同日付のN03を最大5mの適応簡略化で加工し、地域名の基準日は2026-10-15です。同地図のメタデータに、小パーツ・穴のあるパーツを保持する加工条件があります。今回抽出したのはコード・名称・件数・パーツ構成の監査情報です。 [公開地図](https://kussoon.com/maps/national-municipalities.html) · [全国地図履歴台帳](../../audit/v2-national-pr-ledger-20261104.md) · [地図保守規則](../../national/MAINTENANCE_RULES.md) · [ナンバープレートマップ](https://kussoon.com/driving/vehicleregistrationplates/region/)

公式店舗情報を参照するURLは来歴確認用です。将来追加で掲載する文章、ロゴ、地図画像などの素材は各出典の条件を個別に確認します。
