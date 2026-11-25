# 出典と利用条件

店舗データの基準日は2026年11月23日、座標調査の基準日は2026年11月25日。店舗情報と出典の履歴は全国統合マスターVer.1.3.2から継承し、座標はPR #765を反映した。取得日時を確認できる行ではExcelに保持した。 [Ver.1.3.2](https://github.com/Kussoon/kussoon.github.io/pull/759) · [座標採用案](https://github.com/Kussoon/kussoon.github.io/pull/765)

| 出典 | 利用・表示条件 |
|---|---|
| デジタル庁「アドレス・ベース・レジストリ」 | 町字・住居表示・地番の位置参照を使用。出典とKussoonによる加工を表示する。地番は法務省原典も表示する。 [ABR利用規約](https://www.digital.go.jp/policies/base_registry_address_tos) · [登記所備付地図データ利用規約](https://www.geospatial.jp/ckan/dataset/houmusyouchizu-riyoukiyaku) |
| 東京大学空間情報科学研究センター「CSVアドレスマッチングサービス」 | 全国住居表示レベル、世界測地系8852。利用条件はWeb公開や自己責任での商用利用を想定している。サービス名と加工を表示し、位置参照情報等の原典条件と測量成果の扱いも確認する。 [サービス利用条件](https://geocode.csis.u-tokyo.ac.jp/home/csv-admatch/#terms-of-use) · [商用利用FAQ](https://geocode.csis.u-tokyo.ac.jp/home/csv-admatch/faq/) |
| 株式会社情報試作室「Jageocoder用住所データベース（住居表示レベル）」 | ローカル変換の結果を採用。2026年4月17日付規約の3(5)に従い、下記の原典・加工表記を地図とこの資料に掲載。辞書の本体は成果物に含めていない。本体を複製・配布する場合は3(3)の同梱README要件がある。 [辞書利用規約](https://jageocoder.info-proto.com/license) |
| 国土交通省「国土数値情報（行政区域データ、N03、2026年1月1日時点）」 | 政令指定都市は行政区単位で期待区域を検証し、出典と加工を表示。ポリゴンは地図配布物に含めていない。 [N03](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) · [国土数値情報利用規約](https://nlftp.mlit.go.jp/ksj/other/agreement.html) |
| 国土交通省「位置参照情報」令和7年度 | 従来出典。街区・地番座標を加工したことを表示。 [利用約款](https://nlftp.mlit.go.jp/isj/agreement.html) |
| Geolonia「日本全国の住所データ」 | 従来出典およびJageocoderの原典。出典、加工、CC BY 4.0を表示。 [配布元](https://geolonia.github.io/japanese-addresses/) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja) |
| 厚生労働省「食品衛生申請等システム」のオープンデータ | 従来出典。出典・加工を表示し、原表の個別測地系が未明示という引継ぎ事項を保持。 [配布元](https://i2fas.mhlw.go.jp/faspub/IO_S010303.do) · [公共データ利用規約1.0](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0) |
| ユーザー提供・地図確認 | マックスバリュ坂田店の従来点。提供座標と根拠を継承。 [店舗公式案内](https://www.aeon-ryukyu.jp/store/maxvalu/sakata/) |
| 国土地理院「地理院タイル（淡色地図）」 | 背景に使用。地図内に出典を表示。タイルは配布データに含めていない。 [タイル一覧と利用案内](https://maps.gsi.go.jp/development/ichiran.html) |

## Jageocoderの二次利用表示

- 国土交通省「位置参照情報」を加工。 [位置参照情報](https://nlftp.mlit.go.jp/cgi-bin/isj/dls/_choose_method.cgi)
- 国土地理院「電子国土基本図住居表示住所」を加工。 [住居表示住所](https://www.gsi.go.jp/kihonjohochousa/jukyo_jusho.html)
- Geolonia Inc.「Geolonia 住所データ」を加工。 [Geolonia 住所データ](https://geolonia.github.io/japanese-addresses/)
- デジタル庁「アドレス・ベース・レジストリ」を加工。 [アドレス・ベース・レジストリ](https://www.digital.go.jp/policies/base_registry_address)
- 「登記所備付地図データ」をデジタル庁が加工したデータを再加工。 [法務省原典の案内](https://front.geospatial.jp/moj-chizu-xml-readme/)

辞書の作成者が取得した測量法に基づく国土地理院長承認（使用）は R 8JHs 42。辞書の構成にはROIS-DSの歴史的行政区域データセットβ版地名辞書（CC BY 4.0）と日本郵便の郵便番号データも記載されている。 [歴史的行政区域データセット](https://geonlp.ex.nii.ac.jp/dictionary/geoshape-city/) · [日本郵便](https://www.post.japanpost.jp/zipcode/dl/readme.html) · [辞書利用規約](https://jageocoder.info-proto.com/license)

## 広告掲載を伴う公開サイト

Jageocoder辞書規約3(2)は所定の禁止事項を除き、商用・非商用の利用を許可している。地図・表を公開する二次利用には3(5)の原典表示が適用される。辞書を常時利用するサービスを将来公開する場合は3(4)の利用者向け文言も掲載する。CSISも自己責任の商用利用を明示しており、広告掲載自体を禁止する条項は両者の確認資料に見当たらなかった。国土地理院の承認番号は情報試作室による辞書作成の承認であり、Kussoonの公開形態での手続は測量成果の利用案内に基づき確認する。この検証版は広告を組み込まず、正式公開前の成果物として扱う。 [Jageocoder規約](https://jageocoder.info-proto.com/license) · [CSIS利用条件](https://geocode.csis.u-tokyo.ac.jp/home/csv-admatch/#terms-of-use) · [国土地理院の測量成果の利用手続](https://www.gsi.go.jp/LAW/2930-index.html) · [国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)
