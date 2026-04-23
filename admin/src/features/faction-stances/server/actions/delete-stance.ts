"use server";

import { getAllBills, saveBill } from "@mirai-gikai/data";
import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";

export async function deleteStance(stanceId: string) {
  try {
    const all = await getAllBills();
    const bill = all.find((b) =>
      b.faction_stances.some((s) => s.id === stanceId)
    );
    if (!bill) {
      throw new Error("会派見解が見つかりません");
    }

    await saveBill({
      ...bill,
      faction_stances: bill.faction_stances.filter((s) => s.id !== stanceId),
      updated_at: new Date().toISOString(),
    });

    revalidatePath(routes.bills(), "layout");
    await invalidateWebCache();
    return { success: true };
  } catch (error) {
    console.error("Error in deleteStance:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
