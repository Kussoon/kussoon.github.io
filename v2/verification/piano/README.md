# ピアノの不思議と歴史：検証版

2026-11-10。トップページと全8章の読み物、写真4点、既存の概念図20点、操作できる体験3点をまとめた検証版です。

入口は [index.html](index.html)。本番の `reading/`、共通ファイル、トップページ、サイトマップは変更していません。このフォルダはドラフトPRで確認し、mainへのマージ・公開は行いません。

## 本文の基準と資料の扱い

- ユーザーが最後に提供し、使用を指示した `Piano原稿20261110.zip` 内のHTMLを本文の基準にしています。保存版は [source/](source/) にあります。
- 元原稿の全8章の本文段落、見出し、表11点のセル、本文・参考資料のリンクを機械照合しました。本文の校閲完了や史実の正しさを認定するものではありません。
- 原稿内の「図版候補」欄は編集メモとして外し、実際の写真・図解を挿入しました。元のナビゲーションと仮フッターは試作版の構成に統合しました。
- 写真・既存図解・共通CSS・ナビゲーション・Umamiは、添付の写真付き試作版をもとにしています。写真の条件は [IMAGE-CREDITS.md](IMAGE-CREDITS.md) にまとめています。
- 添付資料にあった「校閲済みMarkdownとの照合」「Draft PR #360で確認」などの記録を、今回の検証済み事実として引き継いではいません。既存PR #360は別の試作として保持しています。

## 体験機能

- 第3章：鍵盤、ハンマー、ダンパー、弦の関係を段階表示。打弦後はハンマーが弦から離れ、指を離すとダンパーが戻ります。機械部品の正確な配置を再現した図ではありません。
- 第6章：A0〜C8の88鍵。タップで音名・周波数・鍵盤番号を表示。白黒の配色切替、任意の純音再生、中央のドへの移動、矢印キーでのフォーカス移動。
- 第8章：440 Hz／442 Hz／同時再生、停止、音量調整、10秒での自動停止。波形と包絡線は理論図で、マイク測定ではありません。
- 自動再生なし。音声は利用者の操作で開始し、ページ移動や非表示で停止します。動きを減らす設定では連続アニメーションを抑えます。

## 検証

- [verification.json](verification.json)：全8章の原稿照合、内部リンク・アンカー・画像・noindex検査。エラー0件。
- [browser-verification.json](browser-verification.json)：Chromium。9ページ×6幅（320、375、390、428、768、1280px）×明暗2モード＝108通り。ページの横はみ出し・画像読み込み・JavaScript例外を検査し、3体験の操作も確認しました。音声テストはブラウザ上での再生開始・停止の確認で、実機の聴感確認ではありません。
- [external-link-verification.json](external-link-verification.json)：79 URLをHTTP GETで確認、77件で2xx。HTTP到達性の検査であり、内容の妥当性の再校閲ではありません。
- WebKit 26.5はダウンロード済みですが、実行ホストにGTKなどの共有ライブラリがなく起動できませんでした。iPhone Safari・Android実機の検証は未実施です。
- スマートフォン幅の [画面例](screenshots/) を保存しています。

## 残っている確認

- iPhone Safari実機：音の開始・停止、消音設定や割り込み時の挙動、横スクロールとタップ、画面回転。
- Android・PC実機：表示と音の聴感。
- 河合小市の参考リンク `https://www.kawai-global.com/topics/spiritoso-the-story-of-koichi-kawai/` は404。原稿のリンクは保持しており、置換先の内容確認が必要です。
- Smithsonian `https://www.si.edu/object/nmah_609324` は520。削除と断定せず、別の回線・日時で再確認します。
- 本文の最終校閲と、読者確認後の正式公開判断。

## 再検証

Python 3、lxml、PlaywrightとChromiumが必要です。依存関係は既存環境を利用し、必要に応じてインストールしてください。テストでは解析スクリプトへの通信を遮断します。

```sh
python -m http.server 8765
# 別のターミナルで、リポジトリ直下から
python v2/verification/piano/tests/check.py
python v2/verification/piano/tests/browser.py
python v2/verification/piano/tests/links.py
```

Safari相当のWebKitをインストールした環境ではブラウザテストがWebKitも試します。`PLAYWRIGHT_BROWSERS_PATH`、`PIANO_BASE_URL`、`CHROMIUM_EXECUTABLE`で環境を指定できます。
