import "server-only";

import {
  type Faction as DataFaction,
  getActiveFactions,
} from "@mirai-gikai/data";

export type Faction = DataFaction;

export async function getFactions(): Promise<Faction[]> {
  try {
    const data = await getActiveFactions();
    return data.slice().sort((a, b) => a.sort_order - b.sort_order);
  } catch (error) {
    console.error("Failed to fetch factions:", error);
    return [];
  }
}
