import "server-only";

import { getAllBills, getAllFactions } from "@mirai-gikai/data";
import type { FactionWithStanceCount } from "../../shared/types";

export async function loadFactions(): Promise<FactionWithStanceCount[]> {
  const [factions, bills] = await Promise.all([
    getAllFactions(),
    getAllBills(),
  ]);
  const stanceCount = new Map<string, number>();
  for (const bill of bills) {
    for (const s of bill.faction_stances) {
      stanceCount.set(s.faction_id, (stanceCount.get(s.faction_id) ?? 0) + 1);
    }
  }
  return factions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({
      ...f,
      stance_count: stanceCount.get(f.id) ?? 0,
    }));
}
