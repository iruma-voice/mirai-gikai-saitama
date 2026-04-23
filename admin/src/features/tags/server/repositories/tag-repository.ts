import "server-only";

import {
  deleteTag as deleteTagData,
  getAllBills,
  getAllTags,
  getTagById,
  saveTag,
  type Tag,
} from "@mirai-gikai/data";

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export type TagWithBillCount = Tag & { bills_tags: { count: number }[] };

export async function findAllTagsWithBillCount(): Promise<TagWithBillCount[]> {
  const [tags, bills] = await Promise.all([getAllTags(), getAllBills()]);
  const billCountByTag = new Map<string, number>();
  for (const bill of bills) {
    for (const id of bill.tag_ids) {
      billCountByTag.set(id, (billCountByTag.get(id) ?? 0) + 1);
    }
  }
  return tags
    .slice()
    .sort((a, b) => {
      const aPri = a.featured_priority;
      const bPri = b.featured_priority;
      if (aPri == null && bPri == null) {
        return a.created_at.localeCompare(b.created_at);
      }
      if (aPri == null) return 1;
      if (bPri == null) return -1;
      if (aPri !== bPri) return aPri - bPri;
      return a.created_at.localeCompare(b.created_at);
    })
    .map((t) => ({
      ...t,
      bills_tags: [{ count: billCountByTag.get(t.id) ?? 0 }],
    }));
}

export async function createTagRecord(input: {
  label: string;
  description?: string | null;
  featured_priority?: number | null;
}): Promise<{
  data: Tag | null;
  error: { code: string; message: string } | null;
}> {
  const existing = await getAllTags();
  if (existing.some((t) => t.label === input.label)) {
    return {
      data: null,
      error: { code: "23505", message: "duplicate tag label" },
    };
  }
  const now = nowIso();
  const data: Tag = {
    id: generateId(),
    label: input.label,
    description: input.description ?? null,
    featured_priority: input.featured_priority ?? null,
    created_at: now,
    updated_at: now,
  };
  await saveTag(data);
  return { data, error: null };
}

export async function updateTagRecord(
  id: string,
  input: {
    label: string;
    description?: string | null;
    featured_priority?: number | null;
  }
): Promise<{
  data: Tag | null;
  error: { code: string; message: string } | null;
}> {
  const existing = await getTagById(id);
  if (!existing) {
    return {
      data: null,
      error: { code: "PGRST116", message: "tag not found" },
    };
  }
  const all = await getAllTags();
  if (all.some((t) => t.id !== id && t.label === input.label)) {
    return {
      data: null,
      error: { code: "23505", message: "duplicate tag label" },
    };
  }
  const data: Tag = {
    ...existing,
    label: input.label,
    description: input.description ?? existing.description,
    featured_priority: input.featured_priority ?? existing.featured_priority,
    updated_at: nowIso(),
  };
  await saveTag(data);
  return { data, error: null };
}

export async function deleteTagRecord(
  id: string
): Promise<{ error: { code: string; message: string } | null }> {
  const existing = await getTagById(id);
  if (!existing) {
    return { error: { code: "PGRST116", message: "tag not found" } };
  }
  await deleteTagData(id);
  return { error: null };
}
