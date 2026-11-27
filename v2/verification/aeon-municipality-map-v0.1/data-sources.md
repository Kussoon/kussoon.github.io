# 出典と利用条件

## 店舗と集計

- 台帳基準日は2026年11月23日。Excel全国統合マスター Ver.1.3.3から表示名・公式住所原文・公式URLを通常掲載のIDで照合した。店舗数、自治体コード、屋号・グループ・実運営法人はPR #769の採用案を使用。詳細住所の確認事項と屋号・法人の採用根拠は各店の詳細に保持した。 [PR #769](https://github.com/Kussoon/kussoon.github.io/pull/769) · [Excel正本](https://raw.githubusercontent.com/Kussoon/kussoon.github.io/1b1d65eb49ea6d0eb2269324e1ac4f7beb38b321/v2/verification/aeon-national-v1.3.3/aeon-national-master-v1.3.3.xlsx)
- 屋号グループはKussoonの閲覧用分類。ダイエー併記5店、赤羽神谷店、相模原店の採用案はPR #769の根拠と限界を継承。フードプラザにしだの3店はイオン九州の公式承継資料を用いた同PRの法人補完を使用した。店舗情報は台帳の根拠リンクを案内し、公式ページの文章・ロゴ・画像の転載は行っていない。 [店舗データの最終確認](https://github.com/Kussoon/kussoon.github.io/blob/9be7cc4adc05a604df47fa85f34339e43c050373/v2/verification/aeon-municipality-distribution-data-v0.1/final-review-20261126.md)

## 行政区域の加工・表示

- 出典は国土交通省「国土数値情報 行政区域データ（N03、2026年1月1日時点）」。公式データの使用許諾はCC BY 4.0。ダウンロードサイトの公共データ利用規約第1.0版に従い、提供者、基準日、原典、Kussoonによる加工を表示する。CC BY 4.0は商用利用を許諾するが、測量法上の取扱いは別に確認する。 [N03 2026](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) · [利用規約](https://nlftp.mlit.go.jp/ksj/other/agreement.html) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)
- 全国市区町村マップで選択される都道府県詳細TopoJSONと共有境界版7県を使った。画面用のSVG平面へ変換し、共有アークを段階別に簡略化。市町村単位では親市で区の共有アークを除き、外周を連結した。境界の行政所属や元のコードの変更は行っていない。手元で生成される画面形状は表示縮尺で微小なパーツを省略する。 [既存全国地図](https://kussoon.com/maps/national-municipalities.html) · [保守規則](../../national/MAINTENANCE_RULES.md)
- 海岸線・県外周は濃く、市町村・区の内部境界は細く引く。全国の県境を再整合する処理は今回の対象外で、一部に原資産の県間・縮尺差が残る。地図の形状は自治体集計の表示用で、現地の法定境界や測量精度の確認には各自治体の資料を参照する。

## 公開配信と広告掲載時の扱い

N03の原典に国土地理院の数値地図（国土基本情報）等があり、N03の個別ページには「測量法に基づく国土地理院長承認（複製）R 7JHf 351」と記載されている。地図が主となるWebサイトは、国土地理院の手続案内で地図の単純な挿入に対する申請不要の例外から外れている。複製承認を経た成果の二次利用は、配信形態によって申請を要する場合がある。今回の直接URLへの設置について、SVGのデジタル配信を含め承認不要と判断できる個別の根拠・承認は確認できなかった。原典の複製承認番号をKussoon自身の公開根拠として扱わない。 [国土地理院 Q1-11・Q1-13・Q1-24](https://www.gsi.go.jp/LAW/2930-qa.html) · [地図の利用手続](https://www.gsi.go.jp/LAW/2930-index.html)

この検証版は広告・外部トラッカーを組み込まず、noindex,nofollowを指定し、リポジトリのサイトマップや既存記事からの導線を追加しない。Kussoonの公開URLへの設置は、今回の加工・配信内容に即した申請要否の確認が残る。GitHubには実装・集計・再生成手順を保存し、生成した境界配信ファイルは手元の確認用データとして扱う。
