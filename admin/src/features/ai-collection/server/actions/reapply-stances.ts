"use server";

import {
  type Bill,
  type FactionStance,
  getAllBills,
  getAllFactions,
  saveBill,
} from "@mirai-gikai/data";
import { revalidatePath } from "next/cache";
import { routes } from "@/lib/routes";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import { findFactionByName } from "../utils/faction-matching";
import { loadRun } from "../utils/storage";

type ReapplyStancesInput = {
  runId: string;
  /** 再取り込みする DraftFactionStance.id のリスト */
  stanceIds: string[];
};

type ReapplyResult = {
  success: boolean;
  appliedCount: number;
  warnings: string[];
  error?: string;
};

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 指定した会派見解を再取り込みする。
 * 既にDBに存在する場合は上書き（upsert）する。
 * 対象の議案・会派はDBから名前で検索する。
 */
export async function reapplyStances(
  input: ReapplyStancesInput
): Promise<ReapplyResult> {
  try {
    const run = await loadRun(input.runId);
    if (!run) {
      return {
        success: false,
        appliedCount: 0,
        warnings: [],
        error: "収集ランが見つかりません",
      };
    }

    const targetStances = run.factionStances.filter((s) =>
      input.stanceIds.includes(s.id)
    );

    if (targetStances.length === 0) {
      return {
        success: true,
        appliedCount: 0,
        warnings: ["取り込み対象の会派見解がありません"],
      };
    }

    const warnings: string[] = [];
    let appliedCount = 0;

    const [allFactions, allBills] = await Promise.all([
      getAllFactions(),
      getAllBills(),
    ]);
    const factions = allFactions.map((f) => ({
      id: f.id,
      display_name: f.display_name,
      alternative_names: f.alternative_names,
    }));
    const billsByName = new Map(allBills.map((b) => [b.name, b]));
    const billsToSave = new Map<string, Bill>();

    for (const stance of targetStances) {
      if (stance.stanceType === "absent") {
        warnings.push(
          `会派「${stance.factionName}」の「${stance.billTitle}」への欠席は適用をスキップしました`
        );
        continue;
      }

      const bill =
        billsToSave.get(stance.billTitle) ?? billsByName.get(stance.billTitle);
      if (!bill) {
        warnings.push(
          `議案「${stance.billTitle}」がDBに見つかりません。スキップしました。`
        );
        continue;
      }

      const faction = findFactionByName(factions, stance.factionName);
      if (!faction) {
        warnings.push(
          `会派「${stance.factionName}」が見つかりません。別名を設定してから再度お試しください。`
        );
        continue;
      }

      const now = new Date().toISOString();
      const existing = bill.faction_stances.find(
        (s) => s.faction_id === faction.id
      );
      const type = stance.stanceType as FactionStance["type"];
      const comment = stance.comment || null;

      const nextStances = existing
        ? bill.faction_stances.map((s) =>
            s.faction_id === faction.id
              ? { ...s, type, comment, updated_at: now }
              : s
          )
        : [
            ...bill.faction_stances,
            {
              id: generateId(),
              bill_id: bill.id,
              faction_id: faction.id,
              type,
              comment,
              created_at: now,
              updated_at: now,
            },
          ];

      const updated = {
        ...bill,
        faction_stances: nextStances,
        updated_at: now,
      };
      billsByName.set(bill.name, updated);
      billsToSave.set(bill.name, updated);
      appliedCount++;
    }

    for (const bill of billsToSave.values()) {
      await saveBill(bill);
    }

    revalidatePath(routes.bills());
    await invalidateWebCache();

    return { success: true, appliedCount, warnings };
  } catch (error) {
    console.error("Reapply stances error:", error);
    return {
      success: false,
      appliedCount: 0,
      warnings: [],
      error:
        error instanceof Error
          ? error.message
          : "再取り込み中にエラーが発生しました",
    };
  }
}
