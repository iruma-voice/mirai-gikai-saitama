import { readAllJson, readJson, unlinkIfExists, writeJson } from "./fs-utils";
import { buildFactionFilePath, getFactionsDir } from "./paths";
import type { Faction } from "./types";

export async function getAllFactions(): Promise<Faction[]> {
  const list = await readAllJson<Faction>(getFactionsDir());
  return list.sort((a, b) => a.sort_order - b.sort_order);
}

export async function getActiveFactions(): Promise<Faction[]> {
  const all = await getAllFactions();
  return all.filter((f) => f.is_active);
}

export async function getFactionById(id: string): Promise<Faction | null> {
  return readJson<Faction>(buildFactionFilePath(id));
}

export async function saveFaction(faction: Faction): Promise<void> {
  await writeJson(buildFactionFilePath(faction.id), faction);
}

export async function deleteFaction(id: string): Promise<void> {
  await unlinkIfExists(buildFactionFilePath(id));
}
