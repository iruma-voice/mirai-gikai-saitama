import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * 指定ディレクトリ配下の全 .json ファイルを読み取って JSON として返す。
 * 存在しないディレクトリや壊れた JSON は無視する。
 */
export async function readAllJson<T>(dir: string): Promise<T[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const result: T[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(dir, entry.name), "utf-8").catch(
      () => null,
    );
    if (!raw) continue;
    try {
      result.push(JSON.parse(raw) as T);
    } catch {
      // skip corrupt json
    }
  }
  return result;
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  const raw = await fs.readFile(filePath, "utf-8").catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function unlinkIfExists(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => null);
}
