import { NextResponse } from "next/server";
import { getBillsInPeriod } from "@/features/ai-collection/server/loaders/get-bills-in-period";
import { buildStatusCheckPrompt } from "@/features/ai-collection/server/utils/build-status-check-prompt";
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

    const bills = await getBillsInPeriod(startDate, endDate);

    if (bills.length === 0) {
      return NextResponse.json(
        {
          error:
            "指定期間の議案がDBに見つかりません。先に議案を収集してください。",
        },
        { status: 400 }
      );
    }

    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    const initialRun: CollectionRun = {
      id: runId,
      startDate,
      endDate,
      mode: "status_check",
      status: "running",
      createdAt: now,
      completedAt: null,
      error: null,
      bills: [],
      factionStances: [],
      sources: [],
    };

    await saveRun(initialRun);

    runStatusCheckInBackground(runId, bills);

    return NextResponse.json({ runId });
  } catch (error) {
    console.error("Status check start error:", error);
    return NextResponse.json(
      { error: "ステータスチェックの開始に失敗しました" },
      { status: 500 }
    );
  }
}

type BillInPeriod = Awaited<ReturnType<typeof getBillsInPeriod>>[number];

async function runStatusCheckInBackground(
  runId: string,
  billsInPeriod: BillInPeriod[]
): Promise<void> {
  const outputFilePath = getTempOutputPath(runId);
  const provider = resolveProvider();
  const mode = provider === "gemini-api" ? "api" : "cli";

  const logger = await createRunLogger(runId, {
    mode: "status_check",
    provider,
    model: process.env.GEMINI_MODEL ?? "(default)",
    outputFilePath,
    billCount: billsInPeriod.length,
  });

  const initial = await loadRun(runId);
  if (initial) {
    await saveRun({ ...initial, logFilePath: logger.filePath });
  }

  try {
    const prompt = buildStatusCheckPrompt(billsInPeriod, outputFilePath, mode);

    await executeAiCliToFile(prompt, outputFilePath, logger);

    const rawJson = await readCollectionOutput(outputFilePath);
    await logger.section("PARSED OUTPUT FILE", rawJson);
    const parsed = parseCollectionJson(rawJson);

    if (
      parsed.bills.length === 0 &&
      (parsed.factionStances ?? []).length === 0
    ) {
      throw new Error(
        "AI が空の結果を返しました。モデルが対象ページを十分に辿れなかった可能性があります。GEMINI_MODEL をより強いモデル（gemini-2.5-flash / gemini-2.5-pro）に変更して再実行してください。"
      );
    }

    const run = await loadRun(runId);
    if (!run) return;

    // summaryをDBの既存値で埋めて概要の誤差分を防ぐ
    const summaryMap = new Map(
      billsInPeriod.map((b) => [b.billNumber, b.summary])
    );

    const bills: DraftBill[] = parsed.bills.map((b) => ({
      id: crypto.randomUUID(),
      billNumber: b.billNumber ?? null,
      title: b.title,
      summary: summaryMap.get(b.billNumber ?? "") ?? "",
      status: b.status as DraftBill["status"],
      statusNote: b.statusNote ?? null,
      submitter: null,
      sourceUrls: b.sourceUrls ?? [],
    }));

    const factionStances: DraftFactionStance[] = (
      parsed.factionStances ?? []
    ).map((s) => ({
      id: crypto.randomUUID(),
      billTitle: s.billTitle,
      factionName: s.factionName,
      stanceType: s.stanceType as DraftFactionStance["stanceType"],
      comment: s.comment ?? null,
      sourceUrls: s.sourceUrls ?? [],
    }));

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
      await saveRun({
        ...run,
        status: "paused",
        error: "AI の利用制限に達した為、一時停止しています",
      });
    } else {
      await saveRun({
        ...run,
        status: "failed",
        completedAt: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
      });
    }
  } finally {
    await cleanupTempFile(outputFilePath);
  }
}

type RawBill = {
  billNumber?: string | null;
  title: string;
  summary: string;
  status: string;
  statusNote?: string | null;
  sourceUrls?: string[];
};

type RawFactionStance = {
  billTitle: string;
  factionName: string;
  stanceType: string;
  comment?: string | null;
  sourceUrls?: string[];
};

type RawCollectionResult = {
  bills: RawBill[];
  factionStances?: RawFactionStance[];
  sources: string[];
};

function parseCollectionJson(raw: string): RawCollectionResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `ファイルからJSONを抽出できませんでした。内容: ${raw.slice(0, 200)}`
    );
  }

  const parsed = JSON.parse(jsonMatch[0]) as RawCollectionResult;

  return {
    bills: Array.isArray(parsed.bills) ? parsed.bills : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
  };
}
