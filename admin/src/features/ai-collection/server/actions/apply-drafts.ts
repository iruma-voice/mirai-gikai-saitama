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
import type { BillFieldOverride, DraftBill } from "../../shared/types";
import {
  findFactionByName,
  type FactionRecord,
} from "../utils/faction-matching";
import { loadRun } from "../utils/storage";

type ApplyDraftsInput = {
  runId: string;
  newBillIds: string[];
  existingBillOverrides: BillFieldOverride[];
};

type ApplyResult = {
  success: boolean;
  appliedCount: number;
  warnings: string[];
  error?: string;
};

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function applyDrafts(
  input: ApplyDraftsInput
): Promise<ApplyResult> {
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

    if (run.status !== "completed") {
      return {
        success: false,
        appliedCount: 0,
        warnings: [],
        error: "収集が完了していません",
      };
    }

    const warnings: string[] = [];
    let appliedCount = 0;

    const [allFactionsData, allBills] = await Promise.all([
      getAllFactions(),
      getAllBills(),
    ]);
    const factions: FactionRecord[] = allFactionsData.map((f) => ({
      id: f.id,
      display_name: f.display_name,
      alternative_names: f.alternative_names,
    }));
    const billsByNumber = new Map(allBills.map((b) => [b.bill_number, b]));
    const billsById = new Map(allBills.map((b) => [b.id, b]));

    const billIdMap = new Map<string, string>();

    const newBills = run.bills.filter((b) => input.newBillIds.includes(b.id));

    for (const draft of newBills) {
      try {
        const now = nowIso();
        const billId = generateId();
        const bill: Bill = {
          id: billId,
          name: draft.title,
          bill_number: draft.billNumber ?? "",
          slug: null,
          status: mapBillStatus(draft.status),
          status_note: draft.statusNote || null,
          publish_status: "draft",
          council_session_id: null,
          is_featured: false,
          published_at: run.startDate,
          submitted_date: null,
          thumbnail_url: null,
          share_thumbnail_url: null,
          pdf_url: null,
          tag_ids: [],
          bill_contents: (["normal", "hard"] as const).map((level) => ({
            id: generateId(),
            bill_id: billId,
            difficulty_level: level,
            title: draft.title,
            summary: draft.summary.slice(0, 500),
            content: draft.summary,
            created_at: now,
            updated_at: now,
          })),
          faction_stances: [],
          created_at: now,
          updated_at: now,
        };
        await saveBill(bill);
        billsById.set(billId, bill);
        billIdMap.set(draft.id, billId);
        appliedCount++;
      } catch (err) {
        warnings.push(
          `議案「${draft.title}」の挿入に失敗: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    for (const override of input.existingBillOverrides) {
      const draft = run.bills.find((b) => b.id === override.draftBillId);
      if (!draft) continue;

      const hasAnyUpdate =
        override.updateStatus ||
        override.updateContents ||
        override.stanceUpdates.some((s) => s.update);

      if (!hasAnyUpdate) continue;

      const existing = billsByNumber.get(draft.billNumber ?? "");
      if (!existing) {
        warnings.push(`議案「${draft.title}」が見つかりません`);
        continue;
      }

      let updatedBill = billsById.get(existing.id) ?? existing;
      let updated = false;
      const now = nowIso();

      if (override.updateStatus) {
        updatedBill = {
          ...updatedBill,
          status: mapBillStatus(draft.status),
          status_note: draft.statusNote || null,
          updated_at: now,
        };
        updated = true;
      }

      if (override.updateContents) {
        const merged: Bill["bill_contents"] = [...updatedBill.bill_contents];
        for (const level of ["normal", "hard"] as const) {
          const idx = merged.findIndex((c) => c.difficulty_level === level);
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              title: draft.title,
              summary: draft.summary.slice(0, 500),
              content: draft.summary,
              updated_at: now,
            };
          } else {
            merged.push({
              id: generateId(),
              bill_id: updatedBill.id,
              difficulty_level: level,
              title: draft.title,
              summary: draft.summary.slice(0, 500),
              content: draft.summary,
              created_at: now,
              updated_at: now,
            });
          }
        }
        updatedBill = {
          ...updatedBill,
          bill_contents: merged,
          updated_at: now,
        };
        updated = true;
      }

      const stancesToUpdate = override.stanceUpdates.filter((s) => s.update);
      const draftStances = run.factionStances.filter(
        (s) => s.billTitle === draft.title
      );

      for (const stanceOverride of stancesToUpdate) {
        const draftStance = draftStances.find(
          (s) => s.factionName === stanceOverride.factionName
        );
        if (!draftStance) continue;

        if (draftStance.stanceType === "absent") {
          warnings.push(
            `会派「${draftStance.factionName}」の「${draft.title}」への欠席は適用をスキップしました`
          );
          continue;
        }

        const faction = findFactionByName(factions, stanceOverride.factionName);
        if (!faction) {
          warnings.push(
            `会派「${stanceOverride.factionName}」が見つかりません。スキップしました。`
          );
          continue;
        }

        updatedBill = upsertStanceOnBill(
          updatedBill,
          faction.id,
          draftStance.stanceType as FactionStance["type"],
          draftStance.comment || null,
          now
        );
        updated = true;
      }

      if (updated) {
        await saveBill(updatedBill);
        billsById.set(updatedBill.id, updatedBill);
        billIdMap.set(draft.id, updatedBill.id);
        appliedCount++;
      }
    }

    const newInsertedTitles = input.newBillIds
      .map((id) => run.bills.find((b) => b.id === id))
      .filter(
        (b): b is NonNullable<typeof b> => b != null && billIdMap.has(b.id)
      )
      .map((b) => b.title);

    const relatedStances = run.factionStances.filter((s) =>
      newInsertedTitles.includes(s.billTitle)
    );

    const billsToSave = new Set<string>();
    for (const stance of relatedStances) {
      if (stance.stanceType === "absent") {
        warnings.push(
          `会派「${stance.factionName}」の「${stance.billTitle}」への欠席は適用をスキップしました`
        );
        continue;
      }

      const matchedBill = run.bills.find((b) => b.title === stance.billTitle);
      if (!matchedBill) continue;
      const billId = billIdMap.get(matchedBill.id);
      if (!billId) continue;
      const bill = billsById.get(billId);
      if (!bill) continue;

      const faction = findFactionByName(factions, stance.factionName);
      if (!faction) {
        warnings.push(
          `会派「${stance.factionName}」が見つかりません。スキップしました。`
        );
        continue;
      }

      const updated = upsertStanceOnBill(
        bill,
        faction.id,
        stance.stanceType as FactionStance["type"],
        stance.comment || null,
        nowIso()
      );
      billsById.set(billId, updated);
      billsToSave.add(billId);
    }

    for (const id of billsToSave) {
      const bill = billsById.get(id);
      if (bill) await saveBill(bill);
    }

    revalidatePath(routes.bills());
    await invalidateWebCache();

    return { success: true, appliedCount, warnings };
  } catch (error) {
    console.error("Apply drafts error:", error);
    return {
      success: false,
      appliedCount: 0,
      warnings: [],
      error:
        error instanceof Error ? error.message : "適用中にエラーが発生しました",
    };
  }
}

function upsertStanceOnBill(
  bill: Bill,
  factionId: string,
  type: FactionStance["type"],
  comment: string | null,
  now: string
): Bill {
  const existing = bill.faction_stances.find((s) => s.faction_id === factionId);
  const nextStances = existing
    ? bill.faction_stances.map((s) =>
        s.faction_id === factionId
          ? { ...s, type, comment, updated_at: now }
          : s
      )
    : [
        ...bill.faction_stances,
        {
          id: generateId(),
          bill_id: bill.id,
          faction_id: factionId,
          type,
          comment,
          created_at: now,
          updated_at: now,
        },
      ];
  return { ...bill, faction_stances: nextStances, updated_at: now };
}

function mapBillStatus(
  status: DraftBill["status"]
): "submitted" | "in_committee" | "plenary_session" | "approved" | "rejected" {
  if (status === "adopted" || status === "partially_adopted") {
    return "approved";
  }
  return status;
}
