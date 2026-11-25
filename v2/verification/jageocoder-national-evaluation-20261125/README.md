# Jageocoder全国4,613住所の比較評価と再変換

PR #762・#763の引継ぎ成果物。座標の対応範囲を詳細化する候補は207住所、残る確認対象は暫定1,326住所。Excel正本と公開地図への反映前の評価。

- `jageocoder-national-evaluation.zip` に評価報告、全件比較、複数座標・異住所共有の審査、改善候補、未解決一覧、再変換対応表を収録。
- `national-retest-input.csv` はUTF-8 BOM付きの `id,address`。1,007住所の1,095表記を収録。

## Windows PowerShell

PR #763の `local_batch.py` と再変換CSVを置いた作業フォルダーで実行する。辞書のパスはWindows PCの実際の配置に合わせる。

```powershell
python .\local_batch.py .\dictionary .\national-retest-input.csv .\national-retest.jsonl
if ($LASTEXITCODE -ne 0) { throw "Jageocoder の実行に失敗しました。" }
```

再変換後、座標必須と住所正規化用がそれぞれ1,095行であることを確認し、受け渡し用ZIPにまとめる。

```powershell
$rows = @(Get-Content -LiteralPath .\national-retest.jsonl -Encoding UTF8 | ForEach-Object { ConvertFrom-Json -InputObject $_ -ErrorAction Stop })
$withCoordinates = @($rows | Where-Object { $_.require_coordinates -eq $true }).Count
$normalization = @($rows | Where-Object { $_.require_coordinates -eq $false }).Count
if ($rows.Count -ne 2190 -or $withCoordinates -ne 1095 -or $normalization -ne 1095) {
    throw "再変換結果の件数を確認してください。"
}
Compress-Archive -LiteralPath .\national-retest.jsonl -DestinationPath .\national-retest-output.zip -Force
```

次回の比較には `national-retest-output.zip` を使用する。評価ZIP内の `08-PC再変換対応表.csv` で再変換IDを元の全国統合IDに対応づける。住所照合・座標対応範囲・行政区域・候補競合を元結果と比較する。

[PR #762](https://github.com/Kussoon/kussoon.github.io/pull/762) · [PR #763](https://github.com/Kussoon/kussoon.github.io/pull/763)
