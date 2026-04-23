"use server";

import { getAllBills, getAllFactions } from "@mirai-gikai/data";
import type { ExistingBillDetail } from "../../shared/types";

export async function getExistingBillsDetail(
  billNames: string[]
): Promise<ExistingBillDetail[]> {
  if (billNames.length === 0) return [];

  const [allBills, allFactions] = await Promise.all([
    getAllBills(),
    getAllFactions(),
  ]);
  const factionMap = new Map(allFactions.map((f) => [f.id, f]));
  const nameSet = new Set(billNames);
  const bills = allBills.filter((b) => nameSet.has(b.name));

  return bills.map((bill) => {
    const normal = bill.bill_contents.find(
      (c) => c.difficulty_level === "normal"
    );
    const factionStances = bill.faction_stances.map((s) => {
      const faction = factionMap.get(s.faction_id);
      return {
        factionId: s.faction_id,
        factionName: faction?.display_name ?? s.faction_id,
        type: s.type,
        comment: s.comment,
      };
    });
    return {
      id: bill.id,
      name: bill.name,
      status: bill.status,
      contents: normal
        ? { summary: normal.summary, content: normal.content }
        : null,
      factionStances,
    };
  });
}
