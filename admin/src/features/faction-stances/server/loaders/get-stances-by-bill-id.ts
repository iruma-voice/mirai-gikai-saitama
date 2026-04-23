import "server-only";

import { getAllFactions, getBillById } from "@mirai-gikai/data";
import type { StanceTypeEnum } from "../../shared/types";

export type FactionStanceWithFaction = {
  id: string;
  bill_id: string;
  faction_id: string;
  type: StanceTypeEnum;
  comment: string | null;
  faction: {
    id: string;
    name: string;
    display_name: string;
    sort_order: number;
  };
};

export async function getStancesByBillId(
  billId: string
): Promise<FactionStanceWithFaction[]> {
  try {
    const [bill, factions] = await Promise.all([
      getBillById(billId),
      getAllFactions(),
    ]);
    if (!bill) return [];
    const factionMap = new Map(factions.map((f) => [f.id, f]));

    return bill.faction_stances
      .map((s) => {
        const f = factionMap.get(s.faction_id);
        if (!f) return null;
        return {
          id: s.id,
          bill_id: s.bill_id,
          faction_id: s.faction_id,
          type: s.type,
          comment: s.comment,
          faction: {
            id: f.id,
            name: f.name,
            display_name: f.display_name,
            sort_order: f.sort_order,
          },
        };
      })
      .filter((s): s is FactionStanceWithFaction => s !== null);
  } catch (error) {
    console.error("Failed to fetch stances:", error);
    return [];
  }
}
