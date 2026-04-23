import "server-only";

import { getAllTags } from "@mirai-gikai/data";

export async function getTags(): Promise<Array<{ id: string; label: string }>> {
  const all = await getAllTags();
  return all
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((t) => ({ id: t.id, label: t.label }));
}
