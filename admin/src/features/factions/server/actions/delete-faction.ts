"use server";

import {
  deleteFaction as deleteFactionData,
  getFactionById,
} from "@mirai-gikai/data";
import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import type { DeleteFactionInput } from "../../shared/types";

export async function deleteFaction(input: DeleteFactionInput) {
  try {
    const existing = await getFactionById(input.id);
    if (!existing) {
      return { error: "会派が見つかりません" };
    }

    await deleteFactionData(input.id);

    revalidatePath(routes.factions());
    await invalidateWebCache();

    return { success: true };
  } catch (error) {
    console.error("Delete faction error:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "会派の削除中にエラーが発生しました" };
  }
}
