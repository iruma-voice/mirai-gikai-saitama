"use server";

import { getBillById, saveBill } from "@mirai-gikai/data";
import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import type { StanceInput } from "../../shared/types";

export async function upsertStance(
  billId: string,
  factionId: string,
  data: StanceInput
) {
  try {
    const bill = await getBillById(billId);
    if (!bill) throw new Error("議案が見つかりません");

    const now = new Date().toISOString();
    const existing = bill.faction_stances.find(
      (s) => s.faction_id === factionId
    );
    const comment = data.comment || null;

    const nextStances = existing
      ? bill.faction_stances.map((s) =>
          s.faction_id === factionId
            ? { ...s, type: data.type, comment, updated_at: now }
            : s
        )
      : [
          ...bill.faction_stances,
          {
            id: crypto.randomUUID(),
            bill_id: billId,
            faction_id: factionId,
            type: data.type,
            comment,
            created_at: now,
            updated_at: now,
          },
        ];

    await saveBill({
      ...bill,
      faction_stances: nextStances,
      updated_at: now,
    });

    revalidatePath(routes.bills(), "layout");
    await invalidateWebCache();
    return { success: true };
  } catch (error) {
    console.error("Error in upsertStance:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
