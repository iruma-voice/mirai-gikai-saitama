import * as fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getLogFilePath } from "@/features/ai-collection/server/utils/run-logger";

/**
 * 指定 runId の AI 収集実行ログを text/plain で返す。
 * Admin 専用画面（ローカル起動のみ）で失敗原因の調査に使う。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  // ディレクトリトラバーサル対策: runId は UUID/英数字のみ許可
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) {
    return NextResponse.json({ error: "不正な runId です" }, { status: 400 });
  }

  const filePath = getLogFilePath(runId);

  try {
    const content = await fs.readFile(filePath, "utf8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "ログファイルが見つかりません" },
      { status: 404 }
    );
  }
}
