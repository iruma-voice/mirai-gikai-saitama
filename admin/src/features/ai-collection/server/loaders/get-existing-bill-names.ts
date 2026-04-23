import "server-only";

import { getAllBills } from "@mirai-gikai/data";

export async function getExistingBillNumbers(): Promise<string[]> {
  const all = await getAllBills();
  return all.filter((b) => b.bill_number !== "").map((b) => b.bill_number);
}
