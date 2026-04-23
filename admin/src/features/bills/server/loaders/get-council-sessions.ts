import "server-only";

import { getAllCouncilSessions } from "@mirai-gikai/data";

export async function getCouncilSessions(): Promise<
  Array<{ id: string; name: string }>
> {
  const all = await getAllCouncilSessions();
  return all
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((s) => ({ id: s.id, name: s.name }));
}
