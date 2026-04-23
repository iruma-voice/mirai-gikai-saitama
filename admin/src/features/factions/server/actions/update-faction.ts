"use server";

import { getAllFactions, getFactionById, saveFaction } from "@mirai-gikai/data";
import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import type { UpdateFactionInput } from "../../shared/types";

export async function updateFaction(input: UpdateFactionInput) {
  try {
    if (!input.name || input.name.trim().length === 0) {
      return { error: "識別名を入力してください" };
    }

    if (!input.display_name || input.display_name.trim().length === 0) {
      return { error: "表示名を入力してください" };
    }

    const existing = await getFactionById(input.id);
    if (!existing) {
      return { error: "会派が見つかりません" };
    }

    const trimmedName = input.name.trim();
    const all = await getAllFactions();
    if (all.some((f) => f.id !== input.id && f.name === trimmedName)) {
      return { error: "この識別名は既に存在します" };
    }

    const data = {
      ...existing,
      name: trimmedName,
      display_name: input.display_name.trim(),
      alternative_names: input.alternative_names,
      logo_url: input.logo_url || null,
      sort_order: input.sort_order,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    };
    await saveFaction(data);

    revalidatePath(routes.factions());
    await invalidateWebCache();

    return { data };
  } catch (error) {
    console.error("Update faction error:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "会派の更新中にエラーが発生しました" };
  }
}
