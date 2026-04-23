import { readAllJson, readJson, unlinkIfExists, writeJson } from "./fs-utils";
import { buildBillFilePath, getBillsDir } from "./paths";
import { getAllTags, getTagById } from "./tags";
import { getCouncilSessionById } from "./council-sessions";
import type {
  Bill,
  BillContent,
  BillWithRelations,
  FactionStance,
  Tag,
} from "./types";

export async function getAllBills(): Promise<Bill[]> {
  return readAllJson<Bill>(getBillsDir());
}

export async function getBillById(id: string): Promise<Bill | null> {
  return readJson<Bill>(buildBillFilePath(id));
}

export async function getBillBySlug(slug: string): Promise<Bill | null> {
  const all = await getAllBills();
  return all.find((b) => b.slug === slug) ?? null;
}

export async function getPublishedBills(): Promise<Bill[]> {
  const all = await getAllBills();
  return all.filter(
    (b) => b.publish_status === "published" || b.publish_status === "coming_soon",
  );
}

export async function getBillsByCouncilSession(
  sessionId: string,
): Promise<Bill[]> {
  const all = await getAllBills();
  return all.filter((b) => b.council_session_id === sessionId);
}

export async function getBillsByTagId(tagId: string): Promise<Bill[]> {
  const all = await getAllBills();
  return all.filter((b) => b.tag_ids.includes(tagId));
}

export async function saveBill(bill: Bill): Promise<void> {
  await writeJson(buildBillFilePath(bill.id), bill);
}

export async function deleteBill(id: string): Promise<void> {
  await unlinkIfExists(buildBillFilePath(id));
}

export async function enrichBill(bill: Bill): Promise<BillWithRelations> {
  const [tagResults, councilSession] = await Promise.all([
    Promise.all(bill.tag_ids.map((id) => getTagById(id))),
    bill.council_session_id
      ? getCouncilSessionById(bill.council_session_id)
      : Promise.resolve(null),
  ]);
  return {
    ...bill,
    tags: tagResults.filter((t): t is Tag => t !== null),
    council_session: councilSession,
  };
}

export async function getBillWithRelations(
  id: string,
): Promise<BillWithRelations | null> {
  const bill = await getBillById(id);
  if (!bill) return null;
  return enrichBill(bill);
}

// ============================================
// bill_contents ヘルパー
// ============================================

export function getPrimaryBillContent(
  bill: Bill,
  difficulty: "normal" | "hard" = "normal",
): BillContent | null {
  return (
    bill.bill_contents.find((c) => c.difficulty_level === difficulty) ??
    bill.bill_contents[0] ??
    null
  );
}

// ============================================
// faction_stances ヘルパー
// ============================================

export async function getFactionStancesByBillId(
  billId: string,
): Promise<FactionStance[]> {
  const bill = await getBillById(billId);
  return bill?.faction_stances ?? [];
}

// ============================================
// タグ集計
// ============================================

export async function getAllUsedTags(): Promise<Tag[]> {
  const [bills, tags] = await Promise.all([getAllBills(), getAllTags()]);
  const usedIds = new Set(bills.flatMap((b) => b.tag_ids));
  return tags.filter((t) => usedIds.has(t.id));
}
