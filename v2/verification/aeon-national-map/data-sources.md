# 出典と利用条件

- デジタル庁「アドレス・ベース・レジストリ」は全国自治体名および新規3店の地番位置参照に使用。地番の原資料は法務省「登記所備付地図データ」。出典と加工の明示が必要です。元の座標・測地系と変換後のEPSG:4326は「新規座標の証跡.json」に記録しました。 [ABR利用規約](https://www.digital.go.jp/policies/base_registry_address_tos) [法務省の公開案内](https://www.moj.go.jp/MINJI/minji05_00494.html) [登記所備付地図データ利用規約](https://www.geospatial.jp/ckan/dataset/houmusyouchizu-riyoukiyaku)
- 国土交通省「位置参照情報」令和7年度の街区レベルCSVから9店を採用。住居表示フラグ0の登録地番を、代表フラグ1に限定しました。親番の場合は枝番・小字の未照合を記録しました。EPSG:4612をEPSG:4326へ変換しています。転載時は原典と加工を表示してください。 [位置参照情報のデータ形式](https://nlftp.mlit.go.jp/isj/data.html) [利用約款](https://nlftp.mlit.go.jp/isj/agreement.html)
- 第3回から継承したGeoloniaの座標はCC BY 4.0です。配布CSVごとの原典測地系表示の有無は第3回証跡に継承されています。 [Geolonia日本全国の住所データ](https://github.com/geolonia/japanese-addresses) [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)
- 厚生労働省「食品衛生申請等システム」のオープンデータ（PDL1.0）を県別の一次配布CSVで照合しました。ザ・ビッグ山形店とグルメシティ白浜店は、店舗名・住所全文・座標がそれぞれ複数許可行で一致しました。配布原表にある緯度・経度をそのまま採用し、原値と取得日時を記録しました。元の個別測地系は明示されていません。 [厚生労働省の公開案内](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/kigu/index_00012.html) [食品衛生申請等システム](https://i2fas.mhlw.go.jp/faspub/IO_S010303.do) [公共データ利用規約1.0](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0)
- Jageocoderは公開店舗住所だけの少数の試行で候補の粒度を確認。採用点は一次配布資料から抽出しました。G空間情報センターの別配布経路はHTTP 403。第4回採用の法務省原典の位置は、デジタル庁の公開配布を利用しました。 [Jageocoder利用条件・出典](https://jageocoder.info-proto.com/license)

## 出典表示案

デジタル庁「アドレス・ベース・レジストリ」、法務省「登記所備付地図データ」、国土交通省「位置参照情報」（令和7年度）、Geolonia「日本全国の住所データ」（CC BY 4.0）、厚生労働省「食品衛生申請等システム（オープンデータ）」（PDL1.0）を使用し、Kussoonが住所照合・座標変換を行いました。配布ZIP名と取得日時は採用座標表と証跡に掲載しています。

厚生労働省の出典表示例と適用範囲を参照できます。 [厚生労働省の利用規約](https://www.mhlw.go.jp/chosakuken/)

## Ver.1.3追加・地図上の出典表記

上記の出典表示案に「マックスバリュ坂田店の位置はユーザー提供・地図確認」を加える。提供された座標ペアを店舗地点として使用する。位置の照合には地理院地図を閲覧した。運営会社公式ページは店舗名と28街区1の住所根拠。公式MAPから座標を取得していない。Plus Codeは提供座標から公開仕様に沿って独立に算出した。地図タイル等は引継ぎデータに収録していない。

[Plus Codesの利用条件](https://maps.google.com/pluscodes/terms/) · [Open Location Code仕様](https://github.com/google/open-location-code/blob/main/Documentation/Specification/specification.md) · [坂田店の公式店舗情報](https://www.aeon-ryukyu.jp/store/maxvalu/sakata/) · [地理院地図の照合位置](https://maps.gsi.go.jp/#18/26.2395625/127.7485625/)

個別の座標出典・利用条件・取得日は全国座標取得結果で管理する。厚労省原表の個別測地系に関する第4回の留保も継承した。
