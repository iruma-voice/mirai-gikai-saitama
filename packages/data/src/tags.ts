import { readAllJson, readJson, unlinkIfExists, writeJson } from "./fs-utils";
import { buildTagFilePath, getTagsDir } from "./paths";
import type { Tag } from "./types";

export async function getAllTags(): Promise<Tag[]> {
  const list = await readAllJson<Tag>(getTagsDir());
  return list.sort((a, b) => a.label.localeCompare(b.label));
}

export async function getFeaturedTags(): Promise<Tag[]> {
  const all = await getAllTags();
  return all
    .filter((t) => t.featured_priority != null)
    .sort(
      (a, b) => (a.featured_priority ?? 0) - (b.featured_priority ?? 0),
    );
}

export async function getTagById(id: string): Promise<Tag | null> {
  return readJson<Tag>(buildTagFilePath(id));
}

export async function saveTag(tag: Tag): Promise<void> {
  await writeJson(buildTagFilePath(tag.id), tag);
}

export async function deleteTag(id: string): Promise<void> {
  await unlinkIfExists(buildTagFilePath(id));
}
