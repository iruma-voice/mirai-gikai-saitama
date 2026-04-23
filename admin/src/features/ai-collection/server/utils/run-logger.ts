import "server-only";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const LOGS_DIR = path.join(process.cwd(), "collections", "logs");

export function getLogFilePath(runId: string): string {
  return path.join(LOGS_DIR, `${runId}.log`);
}

export type RunLogger = {
  readonly filePath: string;
  /** セクション見出し付きで内容を追記する */
  section(title: string, body: string): Promise<void>;
  /** 単純な1行ログを追記する（タイムスタンプ付き） */
  line(message: string): Promise<void>;
};

/**
 * 1 回の AI 情報収集/ステータスチェックに対応するログファイルを作成し、
 * 追記用のロガーを返す。成功・失敗に関係なく書き込む。
 */
export async function createRunLogger(
  runId: string,
  header: Record<string, string | number | undefined | null>
): Promise<RunLogger> {
  await fs.mkdir(LOGS_DIR, { recursive: true });
  const filePath = getLogFilePath(runId);

  const lines: string[] = [];
  lines.push(`==== AI Collection Run Log ====`);
  lines.push(`Run ID: ${runId}`);
  lines.push(`Started: ${new Date().toISOString()}`);
  for (const [key, value] of Object.entries(header)) {
    if (value === undefined || value === null || value === "") continue;
    lines.push(`${key}: ${String(value)}`);
  }
  lines.push("");
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");

  const append = async (text: string): Promise<void> => {
    await fs.appendFile(filePath, text, "utf8");
  };

  return {
    filePath,
    async section(title, body) {
      const ts = new Date().toISOString();
      await append(`\n---- [${ts}] ${title} ----\n${body}\n`);
    },
    async line(message) {
      const ts = new Date().toISOString();
      await append(`[${ts}] ${message}\n`);
    },
  };
}
