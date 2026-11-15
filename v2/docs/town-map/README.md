# Kussoon V2 町名マップ｜全国展開マスター仕様書（更新中）

**草案 v0.5／更新開始：2026-11-15／最初の完成対象：川西市（自治体コード28217）**

このフォルダを**今後新しい自治体を追加するときの唯一の作業入口**とする。昔のPRに散在していた経緯は「採用すべき現在の規則」「一次根拠」「例外・失敗」「今後の要検証」に分けてここに整理する。過去PRは削除せず、根拠へのリンクとして台帳からたどれるようにする。

> 注意：まだ正式仕様ではなく継承監査中の草案。全国市区町村版や既存5市の確定仕様を変更する権限は持たない。規則が衝突したら既存の現在有効な正本と実装・過去PRを確認する。未監査の機能を「継承済み」と書かない。

## このフォルダの読み方

1. [STANDARD_WORKFLOW.md](STANDARD_WORKFLOW.md) — 1自治体を地図から地域階層への接続まで完成させる工程と採用ゲート
2. [DATA_SPECIFICATION.md](DATA_SPECIFICATION.md) — 町名・読み仮名・統計区画・幾何・ID・出典の契約
3. [LEGACY_INHERITANCE_AUDIT_20261115.md](LEGACY_INHERITANCE_AUDIT_20261115.md) — 5市・全国V2の機能別継承状況（第1次監査）
4. [SOURCE_AND_DECISION_LEDGER.md](SOURCE_AND_DECISION_LEDGER.md) — 過去PRから抽出した採用規則、現行根拠、監査の不足、次の調査対象
5. [LEGACY_FUNCTION_MATRIX.md](LEGACY_FUNCTION_MATRIX.md) — 第2次コード対照：T01〜T14、5市の地図方式、川西の機能不足、6市目のテスト改訂
6. [MAINTENANCE_RULES_APPLICABILITY.md](MAINTENANCE_RULES_APPLICABILITY.md) — 第3次監査：正本R01〜R38と町名への適用境界、特にR05とR28〜R34
7. [REGRESSION_CHECKLIST.md](REGRESSION_CHECKLIST.md) — データ・画面・端末・URL・既存5市の回帰検証
8. [cases/28217-kawanishi.md](cases/28217-kawanishi.md) — 川西市の固有情報・失敗事例・完成状況。次の自治体はcasesに1ファイルを追加

**更新ルール：** 新たな決定をしたときはまず台帳の判定と根拠・影響範囲を更新し、必要に応じてワークフロー／データ契約／テスト／ケース記録を更新する。本文を巨大な時系列日誌にはしない。PRの説明欄は目次と未完了の概要に限定する。

## 完成の定義

川西市は `世界→日本→兵庫県→川西市→町名` に接続して、地図・検索・読み・選択・戻る・ブラウザ表示・iPhone Safari実機を確認し、利用者が正式採用を判断して**初めて完成**。川西市6番目 → 三田市7番目 → 猪名川町7市1町の順に同じ工程を実行する。

## 状態

- 【完了】第1次資料収集、川西市191統計区画・182統計表示名候補、TopoJSON transform有無の復号修正
- 【未達】5市の描画成果全体の継承、川西市の町名ラベル可読性と広域分布、点滅等の仕様照合
- 【未達】川西市そのものの実ブラウザ視覚回帰、既存の世界→県→6市階層への接続、iPhone Safari受入
- 【記録済み】第2次静的監査：5市の実装差、T01〜T14、川西の町名深いリンク不足、6市目のテスト固定値
- 【記録済み】第3次の規則集照合：`v2/national/MAINTENANCE_RULES.md` の所在を確認し、R05の適用範囲と町名専用R28〜R34の違いを整理
- 【進行中】過去PRと元5市の現行動作の全照合・川西の比較実装と実機。監査文書化だけでは完了としない

## 既存の正本は保持

- 5市共通の地域階層正本：`v2/docs/geography-five-city-standard.md`（PR #445、#448）
- 地図表示や確定規則：`v2/national/MAINTENANCE_RULES.md`（現行mainに実在）。**全国市区町村用と町名用の適用境界は [MAINTENANCE_RULES_APPLICABILITY.md](MAINTENANCE_RULES_APPLICABILITY.md) を参照**
- この草案は上記の正本を勝手に置き換えない。将来、ユーザーの承認と検証を経て正式な全国町名マップ標準とする。
