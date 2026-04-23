# test-guidelines-checker

変更差分に対してテストガイドライン（CLAUDE.md Testing Guidelines）の遵守状況をチェックするセルフレビュー用エージェント。
実装完了後・コミット前に実行し、テスト漏れを検出する。

## チェック項目

以下のルールを順番にチェックし、違反があれば報告する。

### 1. 純粋関数のテスト必須チェック
- `shared/utils/` や `server/utils/` に新規作成された `*.ts` ファイルに対応する `*.test.ts` があるか
- 対象: `git diff --name-only --diff-filter=A` で追加されたファイルのうち `utils/` 配下のもの

### 2. mock 禁止チェック
- 新規・変更テストファイルに `vi.mock("server-only")` が含まれていないか

### 3. server-only チェック
- `server/` 配下の新規ファイルに `import "server-only"` があるか（コンポーネント・ローダー・リポジトリ等）

## 実行手順

1. `git diff --name-only main...HEAD` で変更ファイル一覧を取得（未コミットの場合は `git diff --name-only` を使用）
2. 各チェック項目を適用
3. 結果を以下の形式で出力：

```
## テストガイドラインチェック結果

### ✅ パス
- 純粋関数テスト: すべて対応済み

### ❌ 違反
- `server/utils/foo.ts` に対応するテストがありません
  → `server/utils/foo.test.ts` を作成してください

### ⚠️ 要確認
- `server/components/foo.tsx` に `import "server-only"` がありません
```

## 注意事項
- このエージェントは読み取り専用。コードの修正は行わない。
- 違反が見つかった場合、修正手順を具体的に提案する。
- 既存ファイルの変更（diff-filter=M）は対象外とし、新規追加（diff-filter=A）を重点的にチェックする。
