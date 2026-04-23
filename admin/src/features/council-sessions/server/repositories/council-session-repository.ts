import "server-only";

import {
  type CouncilSession,
  deleteCouncilSession,
  getAllCouncilSessions,
  getCouncilSessionById,
  saveCouncilSession,
} from "@mirai-gikai/data";

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function findAllCouncilSessions(): Promise<CouncilSession[]> {
  const all = await getAllCouncilSessions();
  return all.slice().sort((a, b) => b.start_date.localeCompare(a.start_date));
}

export async function createCouncilSessionRecord(input: {
  name: string;
  slug: string | null;
  council_url: string | null;
  start_date: string;
  end_date: string | null;
}): Promise<CouncilSession> {
  const now = nowIso();
  const session: CouncilSession = {
    id: generateId(),
    name: input.name,
    slug: input.slug,
    start_date: input.start_date,
    end_date: input.end_date,
    is_active: false,
    council_url: input.council_url,
    created_at: now,
    updated_at: now,
  };
  await saveCouncilSession(session);
  return session;
}

export async function updateCouncilSessionRecord(
  id: string,
  input: {
    name: string;
    slug: string | null;
    council_url: string | null;
    start_date: string;
    end_date: string | null;
  }
): Promise<CouncilSession> {
  const existing = await getCouncilSessionById(id);
  if (!existing) {
    throw new Error(`定例会の更新に失敗しました: ${id} が見つかりません`);
  }
  const updated: CouncilSession = {
    ...existing,
    name: input.name,
    slug: input.slug,
    council_url: input.council_url,
    start_date: input.start_date,
    end_date: input.end_date,
    updated_at: nowIso(),
  };
  await saveCouncilSession(updated);
  return updated;
}

export async function deleteCouncilSessionRecord(id: string): Promise<void> {
  await deleteCouncilSession(id);
}

export async function setActiveCouncilSessionRecord(id: string): Promise<void> {
  const all = await getAllCouncilSessions();
  const now = nowIso();
  await Promise.all(
    all.map((s) =>
      saveCouncilSession({
        ...s,
        is_active: s.id === id,
        updated_at: s.is_active !== (s.id === id) ? now : s.updated_at,
      })
    )
  );
}

export async function findCouncilSessionById(
  id: string
): Promise<CouncilSession> {
  const session = await getCouncilSessionById(id);
  if (!session) {
    throw new Error(`セッション情報の取得に失敗しました: ${id}`);
  }
  return session;
}
