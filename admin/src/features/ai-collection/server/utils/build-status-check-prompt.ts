import "server-only";

import { siteConfig } from "@/config/site.config";
import type { BillInPeriod } from "../loaders/get-bills-in-period";
import type { PromptMode } from "./build-prompt";

export function buildStatusCheckPrompt(
  bills: BillInPeriod[],
  outputFilePath: string,
  mode: PromptMode = "cli"
): string {
  const billList = bills
    .map((b) => `- 議案番号: ${b.billNumber}　議案名: ${b.name}`)
    .join("\n");

  const toolsInstructions =
    mode === "api"
      ? `重要な調査手順（必ず守ってください）:
- **最初に必ず上記の調査サイトURL（${siteConfig.councilBillsDetailUrl}）を URL Context ツールで取得してください。** 何よりも先に実施し、そのページ内容からリンクを辿ってください。
- **URLを推測・生成・組み立てないでください。** 「令和X年 第Y回定例会」等のキーワードからURLパスを自分で作るのは禁止です。
- 参照してよいURLは「上記の調査サイトから実際に辿れるリンク」「そのリンク先からさらに辿れるリンク」のみです。
- もし目的のページがその起点から辿れない場合は、URLを推測せずに Google Search で該当ページを検索し、検索結果に出た実在URLだけを URL Context で取得してください。
- 404等で取得できなかったURLは二度と同じものを再試行せず、起点ページに戻って別のリンクを辿ってください。`
      : `重要な調査手順（必ず守ってください）:
- **最初に必ず上記の調査サイトURL（${siteConfig.councilBillsDetailUrl}）を WebFetch してください。** 何よりも先に実施し、そのページ内容からリンクを辿ってください。
- **URLを推測・生成・組み立てないでください。** 「令和X年 第Y回定例会」等のキーワードからURLパスを自分で作るのは禁止です。
- 参照してよいURLは「上記の調査サイトから実際に辿れるリンク」「そのリンク先からさらに辿れるリンク」のみです。
- もし目的のページがその起点から辿れない場合は、URLを推測せずに WebSearch で該当ページを検索し、検索結果に出た実在URLだけを WebFetch してください。
- 404等で取得できなかったURLは二度と同じものを再試行せず、起点ページに戻って別のリンクを辿ってください。`;

  const outputInstructions =
    mode === "api"
      ? `調査完了後、以下のJSON形式のデータを**応答本文にそのまま出力**してください。JSON以外の前置き・解説・「収集完了」等の文字列は一切付けず、JSONのみを返してください。
summary / submitter / sourceUrls / comment / sources は空値で固定し、中身を埋めようとしないでください:`
      : `調査完了後、以下のJSON形式のデータを Writeツールを使って ${outputFilePath} に書き込んでください。
summary / submitter / sourceUrls / comment / sources は空値で固定し、中身を埋めようとしないでください:`;

  const closingInstruction =
    mode === "api"
      ? ""
      : `\n\nファイルへの書き込みが完了したら「収集完了」とだけ返してください。`;

  return `${siteConfig.councilName}の公式サイトで、以下の議案の現在の審議ステータスを調査してください。

調査サイト:
- ${siteConfig.councilBillsDetailUrl} （${siteConfig.councilName}）

${toolsInstructions}

調査対象の議案:
${billList}

各議案について、現在の審議ステータスと各会派の賛否を調べてください。
各議案の詳細ページは極力辿らず、一覧ページと議決結果PDFの情報で判定してください。

会派見解の収集方法:
- 議決結果を掲載したPDF（「議決結果」「採決結果」等のリンク）がある場合は優先的に参照してください
- PDFは表形式で会派ごとの賛否が記載されています
- 列名が空白の会派列がある場合は、最も議席数の多い会派として扱ってください
- 無所属議員の情報は収集不要です
- 会派見解が取得できない議案はfactionStancesを空にしてください

${outputInstructions}
{
  "bills": [{"billNumber": "議案番号", "title": "議案名", "summary": "", "status": "approved", "statusNote": null, "submitter": null, "sourceUrls": []}],
  "factionStances": [{"billTitle": "議案名", "factionName": "会派名", "stanceType": "for", "comment": null, "sourceUrls": []}],
  "sources": []
}

stanceTypeの値: "for"(賛成) | "against"(反対) | "neutral"(中立) | "absent"(欠席)

statusの値:
- "submitted": 提出・上程
- "in_committee": 委員会審査中
- "plenary_session": 本会議審議中
- "approved": 可決・承認・同意・採択（以下のstatusNoteに詳細を記載）
- "rejected": 否決・不採択

statusNoteの設定ルール（statusが "approved" の場合）:
- 「可決」→ statusNote: null
- 「原案可決」→ statusNote: "原案可決"
- 「修正可決」→ statusNote: "修正可決"
- 「承認」→ statusNote: "承認"
- 「同意」→ statusNote: "同意"
- 「採択」（請願・陳情）→ statusNote: "採択"
- 「趣旨採択」（請願）→ statusNote: "趣旨採択"

statusNoteの設定ルール（statusが "rejected" の場合）:
- 「否決」→ statusNote: null
- 「不採択」（請願・陳情）→ statusNote: "不採択"

ステータスの判定に関する注意:
- 附帯決議案は本体議案（例: 議案第XX号）とは別個に扱い、附帯決議案自体のステータスを記録してください
- 意見書案のステータスも本体議案とは独立して調査してください
- ステータスが不明な場合は現在のステータスをそのまま維持してください${closingInstruction}`;
}
