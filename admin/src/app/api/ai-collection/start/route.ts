import { NextResponse } from "next/server";
import { buildPrompt } from "@/features/ai-collection/server/utils/build-prompt";
import { getExistingBillNumbers } from "@/features/ai-collection/server/loaders/get-existing-bill-names";
import {
  AiCliUsageLimitError,
  cleanupTempFile,
  executeAiCliToFile,
  getTempOutputPath,
  readCollectionOutput,
  resolveProvider,
} from "@/features/ai-collection/server/utils/execute-ai-cli";
import { createRunLogger } from "@/features/ai-collection/server/utils/run-logger";
import {
  loadRun,
  saveRun,
} from "@/features/ai-collection/server/utils/storage";
import type {
  CollectionRun,
  DraftBill,
  DraftFactionStance,
} from "@/features/ai-collection/shared/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      startDate?: string;
      endDate?: string;
    };
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate と endDate は必須です" },
        { status: 400 }
      );
    }

    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const initialRun: CollectionRun = {
      id: runId,
      startDate,
      endDate,
      status: "running",
      createdAt: now,
      completedAt: null,
      error: null,
      bills: [],
      factionStances: [],
      sources: [],
    };

    await saveRun(initialRun);

    const existingBillNumbers = await getExistingBillNumbers();

    // lightfork では Admin 側の AI 呼び出しはローカルの AI CLI (Gemini / Claude) に固定。
    // 切り替えは AI_CLI_PROVIDER 環境変数で行う。詳細は execute-ai-cli.ts を参照。
    runAiCliInBackground(runId, startDate, endDate, existingBillNumbers);

    return NextResponse.json({ runId });
  } catch (error) {
    console.error("AI collection start error:", error);
    return NextResponse.json(
      { error: "収集の開始に失敗しました" },
      { status: 500 }
    );
  }
}

async function runAiCliInBackground(
  runId: string,
  startDate: string,
  endDate: string,
  existingBillNumbers: string[]
): Promise<void> {
  const outputFilePath = getTempOutputPath(runId);
  const provider = resolveProvider();
  const mode = provider === "gemini-api" ? "api" : "cli";

  const logger = await createRunLogger(runId, {
    mode: "full_collection",
    provider,
    startDate,
    endDate,
    model: process.env.GEMINI_MODEL ?? "(default)",
    outputFilePath,
  });

  // ログファイルパスを即座に保存しておく（失敗時にもUIから参照可能にする）
  const initial = await loadRun(runId);
  if (initial) {
    await saveRun({ ...initial, logFilePath: logger.filePath });
  }

  try {
    const prompt = buildPrompt(
      startDate,
      endDate,
      outputFilePath,
      existingBillNumbers,
      mode
    );

    // AI CLI を実行し、結果を outputFilePath に書き込ませる
    await executeAiCliToFile(prompt, outputFilePath, logger);

    // AI CLI が書き込んだファイルを読み込む
    const rawJson = await readCollectionOutput(outputFilePath);
    await logger.section("PARSED OUTPUT FILE", rawJson);
    const parsed = parseCollectionJson(rawJson);

    if (parsed.bills.length === 0 && parsed.factionStances.length === 0) {
      throw new Error(
        "AI が空の結果を返しました。モデルが対象ページを十分に辿れなかった可能性があります。GEMINI_MODEL をより強いモデル（gemini-2.5-flash / gemini-2.5-pro）に変更して再実行してください。"
      );
    }

    const run = await loadRun(runId);
    if (!run) return;

    const bills: DraftBill[] = parsed.bills.map((b) => ({
      id: crypto.randomUUID(),
      billNumber: b.billNumber ?? null,
      title: b.title,
      summary: b.summary,
      status: b.status as DraftBill["status"],
      statusNote: b.statusNote ?? null,
      submitter: b.submitter ?? null,
      sourceUrls: b.sourceUrls ?? [],
    }));

    const factionStances: DraftFactionStance[] = parsed.factionStances.map(
      (s) => ({
        id: crypto.randomUUID(),
        billTitle: s.billTitle,
        factionName: s.factionName,
        stanceType: s.stanceType as DraftFactionStance["stanceType"],
        comment: s.comment ?? null,
        sourceUrls: s.sourceUrls ?? [],
      })
    );

    const updatedRun: CollectionRun = {
      ...run,
      status: "completed",
      completedAt: new Date().toISOString(),
      bills,
      factionStances,
      sources: parsed.sources,
    };

    await saveRun(updatedRun);
  } catch (error) {
    await logger.section(
      "RUN ERROR",
      error instanceof Error
        ? `name: ${error.name}\nmessage: ${error.message}\nstack:\n${error.stack ?? "(no stack)"}`
        : String(error)
    );
    const run = await loadRun(runId);
    if (!run) return;

    if (error instanceof AiCliUsageLimitError) {
      const updatedRun: CollectionRun = {
        ...run,
        status: "paused",
        error: "AI の利用制限に達した為、一時停止しています",
      };
      await saveRun(updatedRun);
    } else {
      const updatedRun: CollectionRun = {
        ...run,
        status: "failed",
        completedAt: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
      };
      await saveRun(updatedRun);
    }
  } finally {
    await cleanupTempFile(outputFilePath);
  }
}

type RawCollectionResult = {
  bills: Array<{
    billNumber?: string | null;
    title: string;
    summary: string;
    status: string;
    statusNote?: string | null;
    submitter?: string | null;
    sourceUrls?: string[];
  }>;
  factionStances: Array<{
    billTitle: string;
    factionName: string;
    stanceType: string;
    comment?: string | null;
    sourceUrls?: string[];
  }>;
  sources: string[];
};

function parseCollectionJson(raw: string): RawCollectionResult {
  // マークダウンコードブロックや前後のテキストを除去してJSONを抽出
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `ファイルからJSONを抽出できませんでした。内容: ${raw.slice(0, 200)}`
    );
  }

  const parsed = JSON.parse(jsonMatch[0]) as RawCollectionResult;

  return {
    bills: Array.isArray(parsed.bills) ? parsed.bills : [],
    factionStances: Array.isArray(parsed.factionStances)
      ? parsed.factionStances
      : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
  };
}
