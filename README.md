# みらい議会 Lightfork

「みらい議会」系サービスを、別の地方議会向けに **最小の手間で立ち上げる** ための軽量ベースです。

既に[mirai-gikai-kawasaki](https://github.com/GondoTakashi/mirai-gikai-kawasaki) をベースにいくつか開発が進んでいますが、
Forkしやすくするための軽量化を施してみました。

- **Supabase を廃止**: データは `data/` 配下の JSON ファイルで管理します。
- **Admin はローカル専用**: 認証・管理アカウントの概念を廃止し、ローカル起動時は全画面素通しで編集可能です。
- **Web 側のユーザー発 AI 機能（チャット・インタビュー）を全廃**: 初期立ち上げのハードルを下げるため、ユーザー体験で AI 呼び出しが必要な機能は含めていません。
- **Admin 側の AI 情報収集機能は維持**: 議案データの初期整備はローカル実行の AI に任せられます。

> [!NOTE]
> Web 側に AI 機能を追加したい場合は、本家 `mirai-gikai-kawasaki` の実装を参考にしてください。

## セットアップ

```bash
# 環境変数の設定（必要に応じて .env の内容を変更）
cp .env.example .env

# パッケージインストール
pnpm install

# サーバー起動（web: 3000, admin: 3001）
pnpm dev
```

Supabase の起動や DB マイグレーション・シードは不要です。

## Fork して独自の地方議会版を立ち上げる場合

**まずは [Fork 手順ドキュメント](docs/20260422_1000_Fork手順.md)** を参照してください。おおまかな流れは次の通りです：

1. 本リポジトリを fork
2. `web/src/config/site.config.ts` と `admin/src/config/site.config.ts` を対象の自治体名・議会名に書き換え
3. ロゴ・カラー・OGP 画像を差し替え
4. `data/` 配下のサンプルデータを削除し、対象議会の議案・会派・会期データを登録（Admin 画面から可）
5. Web を Vercel 等にデプロイ

商標保護・利用者の混乱防止のため、[Fork ガイドライン](./FORK_GUIDELINES.md) の必須要件（サービス名・ロゴ・カラー・免責文言）も必ず確認してください。

## ライセンス

[AGPL-3.0](./LICENSE) の下で公開されています。詳細は [FORK_GUIDELINES.md](./FORK_GUIDELINES.md) を参照。
