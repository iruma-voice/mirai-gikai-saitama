import { readAllJson, readJson, unlinkIfExists, writeJson } from "./fs-utils";
import {
  buildCouncilSessionFilePath,
  getCouncilSessionsDir,
} from "./paths";
import type { CouncilSession } from "./types";

export async function getAllCouncilSessions(): Promise<CouncilSession[]> {
  const list = await readAllJson<CouncilSession>(getCouncilSessionsDir());
  return list.sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export async function getActiveCouncilSession(): Promise<CouncilSession | null> {
  const all = await getAllCouncilSessions();
  return all.find((s) => s.is_active) ?? null;
}

export async function getCouncilSessionById(
  id: string,
): Promise<CouncilSession | null> {
  return readJson<CouncilSession>(buildCouncilSessionFilePath(id));
}

export async function saveCouncilSession(
  session: CouncilSession,
): Promise<void> {
  await writeJson(buildCouncilSessionFilePath(session.id), session);
}

export async function deleteCouncilSession(id: string): Promise<void> {
  await unlinkIfExists(buildCouncilSessionFilePath(id));
}
