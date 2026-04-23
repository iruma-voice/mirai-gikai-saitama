"use server";

import { type Faction, getAllFactions, saveFaction } from "@mirai-gikai/data";
import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import type { CreateFactionInput } from "../../shared/types";

export async function createFaction(input: CreateFactionInput) {
  try {
    if (!input.name || input.name.trim().length === 0) {
      return { error: "識別名を入力してください" };
    }

    if (!input.display_name || input.display_name.trim().length === 0) {
      return { error: "表示名を入力してください" };
    }

    const trimmedName = input.name.trim();
    const existing = await getAllFactions();
    if (existing.some((f) => f.name === trimmedName)) {
      return { error: "この識別名は既に存在します" };
    }

    const now = new Date().toISOString();
    const data: Faction = {
      id: crypto.randomUUID(),
      name: trimmedName,
      display_name: input.display_name.trim(),
      alternative_names: input.alternative_names,
      logo_url: input.logo_url || null,
      sort_order: input.sort_order,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    await saveFaction(data);

    revalidatePath(routes.factions());
    await invalidateWebCache();

    return { data };
  } catch (error) {
    console.error("Create faction error:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "会派の作成中にエラーが発生しました" };
  }
}
