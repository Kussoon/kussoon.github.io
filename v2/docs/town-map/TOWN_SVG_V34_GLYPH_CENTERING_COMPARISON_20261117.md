# 西宮市SVG V34｜町名の基準点と文字中心の一致を比較試作

2026-11-17。V33直接実測監査 PR #578 / [run 44043829732](https://github.com/Kussoon/kussoon.github.io/actions/runs/44043829732) が成功。地図本体の測定誤差は約1px以内（V27）。V33では地域「安井」の町名中心とアンカー相対YがLeaflet C −0.5pxに対してSVG V25 −8.508px、香櫨園ではC 0pxに対してSVG −8px（Chromium1280）。WebKit390でも安井 C −0.5px、SVG −7.5px、香櫨園 C −0.5px、SVG −8.75px。これは現在のcentered再配置式が名称の**下端**をアンカーに合わせており、結果として文字の半分ほど上にずらすことに対応する。

## 独立試作変更

V25 HTMLの `cLabelMode==='centered'` 分岐で**よみがなOFF時だけ**、町名DOM Range実測矩形の中心を地図の町名アンカー `targetX,targetY` に合わせる。よみがなON時は従来の `desiredBottom-nameRect.bottom` と `desiredCenter` の計算を保持し、V25の読みON表示を回帰させない。初期表示（mode=initial）は不変。固定ピクセル補正なし・ブラウザー判定なし。

C版、共通エンジン、V25、他の比較版は変更しない。C対V34の26地域・全域復帰・よみON・文字125%・直接町名リンク、321×クイズ2種、15操作状態テストを行う。上甲東園の件数/表示違いは未解決の別課題として記録を継続する。正式採用の判定は測定結果確認後。
