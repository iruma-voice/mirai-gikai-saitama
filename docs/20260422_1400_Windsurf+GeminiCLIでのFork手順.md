# みらい議会 Lightfork — Windsurf + Gemini CLI でのフォーク手順

本ドキュメントは「**AI も Git も初めて**」というユーザー（講義受講者を想定）が、**基本無料**で本リポジトリを別の地方議会向けに fork・立ち上げるための手順をまとめたものです。

Claude Code 前提の標準手順は [20260422_1000_Fork手順.md](./20260422_1000_Fork手順.md) を参照してください。本ドキュメントはそちらの**代替版（無料スタート向け）**という位置付けです。

> [!NOTE]
> - GUI ＋ AI コーディング体験 ＋ 別地域向け改修: **Windsurf**（無料プランで開始可）
> - AI 情報収集 ＋ AI 議案コンテンツ出力: **Gemini CLI**（Google アカウントでサインイン、無料枠あり）
>
> 有料の Claude Code / Claude Pro が用意できる場合は標準手順を使ってください。より高度なタスクでは Claude 系の方が扱いやすい場面があります。

---

## 0. 事前準備

以下を手元の PC にインストールしてください。

### 0-1. Node.js と pnpm

- **Node.js 20 以上**（推奨: 22） — 公式サイトの LTS 版をインストール
- **pnpm 10 以上**
  - インストール後にターミナルで `pnpm -v` が動くことを確認

```bash
# pnpm 導入例（Corepack を使う場合）
corepack enable
corepack prepare pnpm@latest --activate
```

### 0-2. Git

- [Git for Windows](https://git-scm.com/download/win) / macOS なら Xcode Command Line Tools or Homebrew で `git`
- 初期設定：

```bash
git config --global user.name "あなたの名前"
git config --global user.email "あなたのメール"
```

### 0-3. Windsurf（IDE）

[Windsurf](https://windsurf.com/) をダウンロードしてインストール。

- 起動後、無料アカウントを作成しサインイン
- 日本語 UI にしたい場合は次の手順で切り替え（Windsurf は VS Code ベースなので同じ要領）:
  1. 左サイドバーの **拡張機能**（Extensions）アイコンを開く
  2. `Japanese Language Pack for Visual Studio Code` を検索してインストール
  3. コマンドパレット（macOS: `Cmd+Shift+P` / Windows: `Ctrl+Shift+P`）を開き、`Configure Display Language` を実行して `ja` を選択
  4. 再起動を促されたら許可（`Restart`）
- Cascade（チャット欄）から AI アシストが使えることを確認

> [!TIP]
> Windsurf は VS Code ベースなので、VS Code の拡張機能や操作感はほぼ同じです。`git clone` した本リポジトリを **File → Open Folder** で開いてください。

### 0-4. Gemini CLI

Node.js 経由でグローバルインストールします。

```bash
npm install -g @google/gemini-cli
```

インストールが終わったら、一度ターミナルで `gemini` を起動し、**Google アカウントでサインイン**してください（ブラウザが開きます）。

```bash
gemini
# → Sign in prompt が出るので従う。サインイン後は /quit で抜ける。
```

> [!IMPORTANT]
> Admin の AI 情報収集機能は Gemini CLI を**サブプロセスとして呼び出す**仕組みです。事前に手動で一度サインインしておかないと、Admin から叩いたときに認証待ちでフリーズします。

> [!NOTE]
> 無料枠の上限（1 日あたりのリクエスト数など）に達すると「利用制限に達した為、一時停止しています」と表示されます。しばらく待って再開してください。

> [!TIP]
> Gemini CLI の無料枠（2.5 Pro = 5 RPM / 100 RPD）では議決結果 PDF を複数 fetch するとすぐ詰まる場合があります。その場合は **Gemini API を直接叩く `gemini-api` モード**（無料枠 15 RPM / 1,000 RPD、CLI 不要）に切り替え可能です。詳細は [20260423_1500_Gemini API直叩きモード.md](./20260423_1500_Gemini%20API%E7%9B%B4%E5%8F%A9%E3%81%8D%E3%83%A2%E3%83%BC%E3%83%89.md) を参照。

---

## 1. リポジトリを Fork する

1. GitHub 上で本リポジトリを Fork、または `git clone` してから独自の新規リポジトリを作成します。
2. リポジトリ名は自治体名を含めた識別しやすい名前に（例: `mirai-gikai-sample-city`）。
3. Windsurf で **File → Open Folder** からローカルに clone したフォルダを開きます。
4. Fork 直後に必ず [FORK_GUIDELINES.md](../FORK_GUIDELINES.md) の必須要件（サービス名・ロゴ・カラー・免責文言）を確認してください。

---

## 2. 依存をインストール

Windsurf のターミナル（**Terminal → New Terminal**）で実行します。

```bash
pnpm install
```

---

## 3. 環境変数ファイルを作る

```bash
cp .env.example .env
```

`.env` を Windsurf で開き、最低限以下を確認します。

```dotenv
# AI CLI プロバイダ: gemini / claude（未設定なら gemini）
AI_CLI_PROVIDER=gemini

# Gemini CLI のパス。PATH 上に gemini があれば空欄で OK
GEMINI_CLI_PATH=

# Gemini CLI で使うモデル。**無料枠で運用するなら gemini-2.5-flash を強く推奨**。
# 未設定だと Gemini CLI 既定の 2.5 Pro が使われますが、無料枠の RPM 上限が
# 極端に低い（≒5 RPM）ため、議決結果 PDF を複数 fetch するとすぐ詰まります。
GEMINI_MODEL=gemini-2.5-flash

# Web → Admin 間のキャッシュ再検証に使う共有シークレット（任意の文字列で OK）
REVALIDATE_SECRET=your-secret-key-here
```

Supabase 系の環境変数は不要です。AI_CLI_PROVIDER は未設定でも既定で `gemini` として動きます。

> [!TIP]
> `GEMINI_CLI_PATH` は `gemini` コマンドが PATH 上に入っていない場合だけ、フルパス（例: `/usr/local/bin/gemini` や `C:\\Users\\you\\AppData\\Roaming\\npm\\gemini.cmd`）を書いてください。

> [!IMPORTANT]
> `GEMINI_MODEL` について。Gemini CLI の既定モデル（Gemini 2.5 Pro）は無料枠の RPM が非常に低く、AI 情報収集のように WebFetch を何度も叩く処理ではすぐ "You have exhausted your capacity on this model" エラーになります。精度的にも本タスクは Flash で十分なので、**無料枠ユーザーは必ず `GEMINI_MODEL=gemini-2.5-flash` を設定**してください。有料枠・Google AI Studio の API キー利用などで RPM に余裕がある場合のみ、空欄のまま Pro を使って構いません。

---

## 4. サイト設定ファイルを書き換える（Windsurf の AI アシストを活用）

Fork で最初に書き換えるのは以下 2 ファイルです（中身は同じ項目を揃える必要があります）。

- `web/src/config/site.config.ts`
- `admin/src/config/site.config.ts`

Windsurf の Cascade（チャット）で以下のように指示すると両ファイルをまとめて編集してくれます。

```
web/src/config/site.config.ts と admin/src/config/site.config.ts を、
○○市議会版に書き換えて。
- siteName: "みらい議会＠○○市"
- cityName: "○○市"
- councilName: "○○市議会"
- councilBaseUrl: "https://www.city.○○.jp/"
- councilBillsDetailUrl: "https://www.city.○○.jp/..."
- councilFactionExamples: "○○会派／××会派／..."
必要な項目は site.config.ts のコメントに従って全て埋めて。
```

主な編集項目は標準手順書の「2. サイト設定ファイルを書き換える」を参照してください。

> [!IMPORTANT]
> ロジック側でサイト名・自治体名をハードコードしないこと。必ず `siteConfig` 経由で参照してください。

---

## 5. ロゴ・カラー・OGP 画像の差し替え

- ロゴ: `web/public/img/logo.svg` を独自ロゴに置き換え、`site.config.ts` の `features.showLogo` を `true` に
- OGP / 画像: `web/public/` 配下の `og-image.png` 等を差し替え
- テーマカラー: `web/src/app/globals.css` の `@theme inline` ブロックで定義済みトークンを編集
  - インラインでの色指定（`bg-[#xxx]`）は禁止。必ずトークン経由で

Windsurf Cascade に「`globals.css` のテーマカラーを ○○ 色系に変えて」のように依頼すれば、トークン値を一括置換してくれます。

---

## 6. サンプルデータの削除

リポジトリ直下の `data/` 配下にサンプルデータが配置されています。ファイル名・議案名に `【サンプル】` が付いているので、本番運用前に削除してください。

```bash
rm data/bills/sample-*.json
rm data/factions/sample-*.json
rm data/tags/sample-*.json
rm data/council-sessions/sample-*.json
```

---

## 7. ローカル起動 → 初期データ登録

```bash
pnpm dev
```

web (3000) と admin (3001) が並列起動します。

ブラウザで [http://localhost:3001](http://localhost:3001) を開くと、認証なしで Admin 画面に入れます。以下の順で登録してください：

1. **会期** (`council-sessions`) — 現在進行中の定例会を 1 つ作成し、`is_active = true` に
2. **会派** (`factions`) — 議会を構成する会派を登録
3. **タグ** (`tags`) — 議案の分類に使うタグ
4. **議案** (`bills`) — 議案ごとに内容・公開ステータス・会派賛否を登録

JSON 直接編集でも OK。スキーマは `packages/data/src/types.ts` を参照。

---

## 8. AI 情報収集（Gemini CLI 経由）

議案の初期整備をラクにしたい場合、Admin の「AI 情報収集」画面から期間を指定して実行すると、Gemini CLI が議案一覧・会派賛否のドラフトを生成してくれます。

### 実行前チェック

- `gemini` が単体で動くか確認（`gemini --version`）
- `.env` で `AI_CLI_PROVIDER=gemini`（または未設定）になっているか
- `.env` で `GEMINI_MODEL=gemini-2.5-flash` を設定したか（無料枠ユーザーは必須）
- `admin/src/config/site.config.ts` の `councilBillsDetailUrl` が **ブラウザで開いて 200 OK になる実在ページ** かどうかを手で開いて確認したか
  - ここで指定する URL は「議決結果が会期ごとにリンクされているインデックスページ」を想定しています
  - AI がそのページから会期一覧・議決結果 PDF を辿るので、URL が間違っていたり 404 だと Gemini が勝手に URL を推測し始めて無限ループ・クォータ消費の原因になります
- `admin/src/config/site.config.ts` の `councilFactionExamples` に実際の会派名が列挙されているか

### 実行

1. Admin の左メニュー → 「AI 情報収集」
2. 収集期間を指定して実行
3. Web 検索を伴うため **数分〜十数分** かかります。ページを開いたまま待機
4. 完了後、生成されたドラフトを確認・編集してから公開ステータスを `published` に切り替え

### うまく動かない時

- **「利用制限に達した為、一時停止しています」** / ログに `You have exhausted your capacity on this model. Your quota will reset after Ns`: Gemini の RPM 上限。リセット秒数が数秒〜十秒程度であれば日次クォータではなく分単位の RPM 制限です。
  - まず `.env` で `GEMINI_MODEL=gemini-2.5-flash` になっているか確認してください（Pro は無料枠の RPM が極端に低いです）
  - Flash にしても出る場合は少し時間を置いて再開ボタンを押す
- **ログに `404 Not Found` が出て URL が妙に整った形をしている**: Gemini が公式サイトの URL を推測して生成しているサインです。`admin/src/config/site.config.ts` の `councilBillsDetailUrl` を手でブラウザに貼り付けて、本当に 200 で開くインデックスページか確認してください。間違っていると AI が URL を捏造し始めてクォータを溶かします。
- **プロセスが即失敗する**: `.env` の `GEMINI_CLI_PATH` をフルパスで指定してみる
- **結果ファイルが書き込まれない**: `gemini` を一度手動で対話起動し、サインイン状態が生きているか確認
- **議案数が極端に少ない / 精度が低い**: Gemini の無料モデルは Claude Pro より取り逃しが多めです。どうしても必要な範囲は手動で埋めるか、後述の「Claude へ切替」を検討

---

## 9. 個別議案のコンテンツ自動生成

議案編集画面の「コンテンツ補完」ボタンを押すと、Gemini CLI が PDF・Web 検索結果をもとに "難しいバージョン" と "ふつうバージョン" の 2 種類のコンテンツドラフトを生成します。

- PDF が付いている議案の方が精度が高くなります
- 出力が崩れた場合は再実行するか、下書きを残したまま手動で編集してください

---

## 10. （任意）Claude に切り替えたい場合

より高精度・大規模な処理が必要になった段階で Claude に切り替えられます。

1. [Claude Code CLI](https://www.claude.com/product/claude-code) をインストール
2. `.env` で切り替え

```dotenv
AI_CLI_PROVIDER=claude
CLAUDE_CLI_PATH=  # PATH 上に claude があれば空欄で OK
```

3. Admin を再起動

コード側の追加修正は不要です（`execute-ai-cli.ts` がプロバイダを自動で切り替えます）。

---

## 11. Web の公開（Vercel デプロイ）

Web 側（`web/`）は Vercel 等へそのままデプロイできます。`data/` 配下の JSON を git 管理したまま Vercel にデプロイすれば、追加の外部 DB は不要です。

- Vercel プロジェクトを作成し、`web/` をルートディレクトリに指定
- 環境変数で `REVALIDATE_SECRET` と（必要なら）`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` を設定
- デプロイ後、カスタムドメインを設定

> [!IMPORTANT]
> Admin (`admin/`) は **絶対に本番デプロイしない** こと。ローカル起動専用で認証がなく、編集操作はすべて直接 `data/` に書き込まれる設計です。

---

## 12. 運用フロー

1. Admin をローカル起動して議案データを編集・追加
2. Windsurf のソース管理パネル（左の Git アイコン）で差分を確認
3. `git commit` / `git push`
4. Web の Vercel 側が自動デプロイされ、新しい `data/` が反映

複数人で運用する場合は、編集者ごとに自リポジトリの clone 上で Admin を起動し、PR ベースでデータ更新をレビューする運用を推奨します。

---

## 13. トラブルシューティング

| 症状 | 対処 |
| --- | --- |
| `pnpm` が見つからない | Node.js を入れ直し、`corepack enable` を実行 |
| Admin の AI 情報収集が即失敗 | ターミナルで `gemini` を対話起動し、サインイン状態を確認。`.env` の `GEMINI_CLI_PATH` をフルパスで指定 |
| Windsurf の Cascade に反応がない | Windsurf 側のログイン状態を確認。無料枠の制限もチェック |
| `data/` が見つからない | 既定ではリポジトリ直下の `data/` が使われます。別の場所に置いた場合は `.env` の `DATA_DIR` を設定 |
| 議案を保存したのに Web に反映されない | `REVALIDATE_SECRET` を Web と Admin で揃えてあるか確認 |
| ポート競合 | `WEB_PORT` / `ADMIN_PORT` を `.env` で変更 |

---

## 関連ドキュメント

- [20260422_1000_Fork手順.md](./20260422_1000_Fork手順.md) — Claude Code 前提の標準 Fork 手順
- [FORK_GUIDELINES.md](../FORK_GUIDELINES.md) — Fork 時の商標・ブランディング上の必須要件
- [AGENTS.md](../AGENTS.md) — リポジトリ全体のコーディングルール・ディレクトリ規約
