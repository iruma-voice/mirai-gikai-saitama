import "server-only";

import { getAllBills } from "@mirai-gikai/data";

export type BillInPeriod = {
  id: string;
  billNumber: string;
  name: string;
  status: string;
  summary: string;
};

export async function getBillsInPeriod(
  startDate: string,
  endDate: string
): Promise<BillInPeriod[]> {
  const all = await getAllBills();
  const filtered = all
    .filter(
      (b) =>
        b.bill_number !== "" &&
        b.published_at != null &&
        b.published_at >= startDate &&
        b.published_at <= endDate
    )
    .sort((a, b) => a.bill_number.localeCompare(b.bill_number));

  return filtered.map((b) => {
    const normal = b.bill_contents.find((c) => c.difficulty_level === "normal");
    return {
      id: b.id,
      billNumber: b.bill_number ?? "",
      name: b.name,
      status: b.status ?? "",
      summary: normal?.summary ?? "",
    };
  });
}
