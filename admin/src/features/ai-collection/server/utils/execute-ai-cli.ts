import "server-only";
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { ApiError, GoogleGenAI } from "@google/genai";
import type { RunLogger } from "./run-logger";

export type Provider = "claude" | "gemini" | "gemini-api";

export function resolveProvider(): Provider {
  const raw = process.env.AI_CLI_PROVIDER?.toLowerCase();
  if (raw === "claude") return "claude";
  if (raw === "gemini-api") return "gemini-api";
  return "gemini";
}

type CliProvider = Exclude<Provider, "gemini-api">;

function resolveCliPath(provider: CliProvider): string {
  if (provider === "claude") {
    if (process.env.CLAUDE_CLI_PATH) return process.env.CLAUDE_CLI_PATH;
    if (process.platform === "win32") {
      return path.join(os.homedir(), "AppData", "Roaming", "npm", "claude.cmd");
    }
    return "claude";
  }
  if (process.env.GEMINI_CLI_PATH) return process.env.GEMINI_CLI_PATH;
  if (process.platform === "win32") {
    return path.join(os.homedir(), "AppData", "Roaming", "npm", "gemini.cmd");
  }
  return "gemini";
}

function decodeBuffer(buf: Buffer): string {
  if (process.platform === "win32") {
    try {
      return new TextDecoder("shift-jis").decode(buf);
    } catch {
      // TextDecoder が対応していない環境では UTF-8 にフォールバック
    }
  }
  return buf.toString("utf8");
}

/** AI CLI の使用制限に達したことを示すエラー */
export class AiCliUsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiCliUsageLimitError";
  }
}

/** AI CLI の実行がタイムアウトし、出力ファイルが存在しなかった場合のエラー */
export class AiCliTimeoutError extends Error {
  /** デバッグ用の診断情報（stdout/stderr末尾） */
  readonly diagnostics: string;

  constructor(timeoutSec: number, diagnostics: string) {
    super(`AI CLI の実行が ${timeoutSec} 秒でタイムアウトしました`);
    this.name = "AiCliTimeoutError";
    this.diagnostics = diagnostics;
  }
}

const USAGE_LIMIT_PATTERNS = [
  // 共通
  /usage limit/i,
  /rate limit/i,
  /quota exceeded/i,
  /you have exceeded/i,
  /Too many requests/i,
  /\b429\b/,
  // Claude 系
  /Claude AI usage limit/i,
  /overloaded/i,
  // Gemini 系
  /resource exhausted/i,
  /exceeded your current quota/i,
  /exhausted your capacity/i,
];

function isUsageLimitError(text: string): boolean {
  return USAGE_LIMIT_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * stderr 全体に含まれる「使用制限系エラー」のヒット数を数える。
 * CLI が内部リトライを繰り返している時の早期打ち切り判定に使う。
 */
const USAGE_LIMIT_COUNT_PATTERN =
  /exhausted your capacity|status 429|Too Many Requests|rateLimitExceeded|resource exhausted|exceeded your current quota/gi;

function countUsageLimitHits(text: string): number {
  return text.match(USAGE_LIMIT_COUNT_PATTERN)?.length ?? 0;
}

/** 連続してこの回数の使用制限エラーを観測したら早期に paused へ落とす */
const EARLY_ABORT_USAGE_LIMIT_HITS = 5;

type ClaudeJsonResponse = {
  result?: string;
  is_error?: boolean;
  subtype?: string;
  [key: string]: unknown;
};

/** AI CLI 実行のタイムアウト（ms）。WebSearch を伴うため長めに設定 */
const CLI_TIMEOUT_MS = 30 * 60 * 1000; // 30分

function buildCliArgs(provider: CliProvider): string[] {
  if (provider === "claude") {
    return [
      "-p",
      "-",
      "--output-format",
      "json",
      "--allowedTools",
      "WebSearch,WebFetch,Write,Read",
    ];
  }
  // Gemini CLI: --yolo でツール呼び出しを自動承認。プロンプトは stdin 経由で渡す。
  const args = ["--yolo"];
  // GEMINI_MODEL が設定されていれば -m で指定（無料枠では gemini-2.5-flash を推奨）
  const model = process.env.GEMINI_MODEL?.trim();
  if (model) {
    args.push("-m", model);
  }
  return args;
}

/** AI 実行のディスパッチ: CLI プロセス or Gemini API 直接呼び出し */
export function executeAiCliToFile(
  prompt: string,
  outputFilePath: string,
  logger?: RunLogger
): Promise<void> {
  const provider = resolveProvider();
  if (provider === "gemini-api") {
    return executeGeminiApi(prompt, outputFilePath, logger);
  }
  return executeCliProcess(provider, prompt, outputFilePath, logger);
}

/** Gemini API を直接呼び出し、応答テキストを outputFilePath に書き込む */
async function executeGeminiApi(
  prompt: string,
  outputFilePath: string,
  logger?: RunLogger
): Promise<void> {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_API_KEY が未設定です。Gemini API 直叩きモードでは Google AI Studio のAPIキーが必要です。"
    );
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  await logger?.section(
    "GEMINI API REQUEST",
    `model: ${model}\ntools: googleSearch, urlContext\n\n--- PROMPT ---\n${prompt}`
  );

  const ai = new GoogleGenAI({ apiKey });
  const abortController = new AbortController();
  const timer = setTimeout(() => {
    abortController.abort();
  }, CLI_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        abortSignal: abortController.signal,
        // googleSearch + urlContext で Web 上の情報を動的取得させる
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      },
    });
    const text = response.text;
    await logger?.section(
      "GEMINI API RESPONSE",
      JSON.stringify(
        {
          text,
          usageMetadata: response.usageMetadata,
          candidates: response.candidates?.map((c) => ({
            finishReason: c.finishReason,
            groundingMetadata: c.groundingMetadata,
            urlContextMetadata: c.urlContextMetadata,
            safetyRatings: c.safetyRatings,
          })),
          promptFeedback: response.promptFeedback,
        },
        null,
        2
      )
    );
    if (!text) {
      throw new Error("Gemini API が空の応答を返しました");
    }
    await fs.writeFile(outputFilePath, text, "utf8");
  } catch (err) {
    await logger?.section(
      "GEMINI API ERROR",
      err instanceof Error
        ? `name: ${err.name}\nmessage: ${err.message}\nstack:\n${err.stack ?? "(no stack)"}`
        : String(err)
    );
    if (err instanceof ApiError && err.status === 429) {
      throw new AiCliUsageLimitError(
        `Gemini API の使用制限に達しました: ${err.message.slice(0, 300)}`
      );
    }
    if (err instanceof Error && isUsageLimitError(err.message)) {
      throw new AiCliUsageLimitError(
        `Gemini API の使用制限に達しました: ${err.message.slice(0, 300)}`
      );
    }
    if (
      err instanceof Error &&
      (err.name === "AbortError" || abortController.signal.aborted)
    ) {
      throw new AiCliTimeoutError(
        CLI_TIMEOUT_MS / 1000,
        err.message.slice(-500)
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** CLI プロセスを spawn して AI CLI を実行する */
function executeCliProcess(
  provider: CliProvider,
  prompt: string,
  outputFilePath: string,
  logger?: RunLogger
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cliPath = resolveCliPath(provider);
    const cliArgs = buildCliArgs(provider);

    // CLAUDECODE を unset: Claude CLI はネスト起動を検出してブロックするため
    const env = { ...process.env };
    delete env.CLAUDECODE;

    // プロンプトを stdin 経由で渡す（コマンドライン長制限を回避）
    const proc = spawn(cliPath, cliArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env,
      // Windows では CLI が .cmd ラッパー経由のため shell: true が必要
      shell: process.platform === "win32",
    });

    void logger?.section(
      "CLI REQUEST",
      `provider: ${provider}\ncliPath: ${cliPath}\nargs: ${JSON.stringify(cliArgs)}\n\n--- PROMPT (stdin) ---\n${prompt}`
    );

    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const finalize = async (
      finalResult: "resolve" | { error: Error }
    ): Promise<void> => {
      await logger?.section(
        "CLI STDOUT",
        stdout.length === 0 ? "(empty)" : stdout
      );
      await logger?.section(
        "CLI STDERR",
        stderr.length === 0 ? "(empty)" : stderr
      );
      if (finalResult === "resolve") {
        settle(resolve);
      } else {
        await logger?.section(
          "CLI ERROR",
          `name: ${finalResult.error.name}\nmessage: ${finalResult.error.message}\nstack:\n${finalResult.error.stack ?? "(no stack)"}`
        );
        settle(() => reject(finalResult.error));
      }
    };

    // タイムアウト: プロセスを強制終了し、出力ファイルが存在すれば結果を流用する
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      fs.access(outputFilePath)
        .then(() => {
          void finalize("resolve");
        })
        .catch(() => {
          const diagnostics = (stderr + stdout).slice(-500);
          void finalize({
            error: new AiCliTimeoutError(CLI_TIMEOUT_MS / 1000, diagnostics),
          });
        });
    }, CLI_TIMEOUT_MS);

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += decodeBuffer(chunk);

      // 使用制限エラーが短時間に閾値を超えたら、タイムアウト（30分）を待たず
      // 早期に paused として落とす（再開ボタンで人間判断を促す）。
      if (settled) return;
      const hits = countUsageLimitHits(stderr);
      if (hits >= EARLY_ABORT_USAGE_LIMIT_HITS) {
        proc.kill("SIGKILL");
        void finalize({
          error: new AiCliUsageLimitError(
            `${provider} が使用制限エラーを ${hits} 回連続で返したため早期に停止しました。stderr末尾: ${stderr.slice(-300)}`
          ),
        });
      }
    });

    proc.on("error", (err) => {
      void finalize({
        error: new Error(`${provider} の起動に失敗しました: ${err.message}`),
      });
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        const combined = stderr + stdout;
        if (isUsageLimitError(combined)) {
          void finalize({
            error: new AiCliUsageLimitError(
              `${provider} の使用制限に達しました。stderr: ${stderr.slice(0, 300)}`
            ),
          });
          return;
        }
        void finalize({
          error: new Error(
            `${provider} がコード ${code} で終了しました。stderr: ${stderr.slice(0, 500)}`
          ),
        });
        return;
      }

      // Claude は --output-format json 指定時に stdout を JSON でラップしてエラー情報を返す。
      // Gemini CLI は plain text を返すので、成功時のファイル書き込みに依存する。
      if (provider === "claude") {
        try {
          const parsed = JSON.parse(stdout) as ClaudeJsonResponse;
          if (parsed.is_error || parsed.subtype === "error") {
            const resultStr = String(parsed.result ?? "不明なエラー");
            if (isUsageLimitError(resultStr)) {
              void finalize({
                error: new AiCliUsageLimitError(
                  `Claude の使用制限に達しました: ${resultStr.slice(0, 300)}`
                ),
              });
              return;
            }
            void finalize({
              error: new Error(
                `Claude がエラーを返しました: ${resultStr.slice(0, 300)}`
              ),
            });
            return;
          }
        } catch {
          // JSON parse 失敗は無視してファイル読み込みに進む
        }
      }

      void finalize("resolve");
    });
  });
}

export function getTempOutputPath(runId: string): string {
  return path.join(os.tmpdir(), `ai_collection_${runId}.json`);
}

export async function readCollectionOutput(
  outputFilePath: string
): Promise<string> {
  try {
    return await fs.readFile(outputFilePath, "utf8");
  } catch {
    throw new Error(
      `AI CLI が結果ファイルを書き込みませんでした: ${outputFilePath}`
    );
  }
}

export async function cleanupTempFile(outputFilePath: string): Promise<void> {
  try {
    await fs.unlink(outputFilePath);
  } catch {
    // 削除失敗は無視
  }
}
