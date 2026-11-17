# 西宮市町名SVG 第34比較版｜iPhone・PC実機確認用の限定公開

2026-11-17。正式Leaflet C版 `/v2/nishinomiya-town-study-c.html` は変更しない。比較版のソース `v2/nishinomiya-town-svg-master-v34-20261117-pilot.html` を、元のV34比較PR #579から**内容無変更でコピー**した公開準備用PR。

目的：ブラウザー実機確認用に、独立したパス `https://kussoon.com/v2/nishinomiya-town-svg-master-v34-20261117-pilot.html` を用意する。正式ページへのリンク変更、トップページへの誘導、旧版削除、C版置換は行わない。HTMLには `noindex,nofollow` がある。

自動検査済みの根拠：
- [V34機能検査 run 44044378163](https://github.com/Kussoon/kussoon.github.io/actions/runs/44044378163)：クイズ1/2全321町名および操作回帰PASS。
- [V38の厳格表示比較 run 44049432482](https://github.com/Kussoon/kussoon.github.io/actions/runs/44049432482)：C版との26地域のラベル多重集合・件数完全一致、文字位置の受入基準もPASS。
- [共通V2回帰修復PR #584 run 44050397200](https://github.com/Kussoon/kussoon.github.io/actions/runs/44050397200)：全国ブラウザーと構成検査ともPASS。ただし #584 は独立Draftでmain未統合。

実機確認ポイント：iPhone SafariとPCで市全体・地域選択（安井、香櫨園、上ヶ原、甲東、山口）・町名サイズと読み仮名ON/OFF・町名検索・全画面・クイズ1/2・市全域復帰を確認。特に上甲東園の区域選択では上ヶ原用と甲東用の地図表示・町名位置に注目。

本PRをmainへ統合する場合も、**比較版HTMLと本監査文書だけ**が公開され、正式C版はそのまま維持される。公開後もユーザー実機確認で採否を決める。サイトの正式切替には別のPRと承認を必須とする。
