import path from "node:path";

/**
 * データディレクトリのルートパスを返す。
 * - 環境変数 DATA_DIR が設定されていればそれを使用
 * - 未設定の場合は process.cwd()/../data（admin/ や web/ から1つ上の data/）
 */
export function getDataRoot(): string {
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR);
  }
  return path.resolve(process.cwd(), "../data");
}

export function getBillsDir(): string {
  return path.join(getDataRoot(), "bills");
}

export function getFactionsDir(): string {
  return path.join(getDataRoot(), "factions");
}

export function getCouncilSessionsDir(): string {
  return path.join(getDataRoot(), "council-sessions");
}

export function getTagsDir(): string {
  return path.join(getDataRoot(), "tags");
}

export function buildBillFilePath(id: string): string {
  return path.join(getBillsDir(), `${id}.json`);
}

export function buildFactionFilePath(id: string): string {
  return path.join(getFactionsDir(), `${id}.json`);
}

export function buildCouncilSessionFilePath(id: string): string {
  return path.join(getCouncilSessionsDir(), `${id}.json`);
}

export function buildTagFilePath(id: string): string {
  return path.join(getTagsDir(), `${id}.json`);
}
