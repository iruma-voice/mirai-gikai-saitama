import "server-only";

import {
  type Bill as DataBill,
  type BillContent,
  getAllBills,
  getAllTags,
  getBillById,
  saveBill,
} from "@mirai-gikai/data";
import type { BillInsert } from "../../shared/types";
import type { DifficultyLevel } from "../../shared/types/bill-contents";

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function findBillById(id: string): Promise<DataBill> {
  const bill = await getBillById(id);
  if (!bill) throw new Error(`Failed to fetch bill: ${id}`);
  return bill;
}

export async function findBillContentsByBillId(
  billId: string
): Promise<BillContent[]> {
  const bill = await getBillById(billId);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  return bill.bill_contents
    .slice()
    .sort((a, b) => a.difficulty_level.localeCompare(b.difficulty_level));
}

export async function findBillTagIdsByBillId(
  billId: string
): Promise<string[]> {
  const bill = await getBillById(billId);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  return bill.tag_ids;
}

export async function findBillBySlug(slug: string): Promise<DataBill> {
  const all = await getAllBills();
  const bill = all.find((b) => b.slug === slug);
  if (!bill) throw new Error(`Failed to fetch bill by slug: ${slug}`);
  return bill;
}

export async function createBillRecord(
  insertData: BillInsert
): Promise<{ id: string }> {
  const id = insertData.id ?? generateId();
  const now = nowIso();
  const bill: DataBill = {
    id,
    bill_number: insertData.bill_number ?? "",
    name: insertData.name,
    slug: insertData.slug ?? null,
    status: insertData.status,
    status_note: insertData.status_note ?? null,
    publish_status: insertData.publish_status ?? "draft",
    council_session_id: insertData.council_session_id ?? null,
    is_featured: insertData.is_featured ?? false,
    published_at: insertData.published_at ?? null,
    submitted_date: insertData.submitted_date ?? null,
    thumbnail_url: insertData.thumbnail_url ?? null,
    share_thumbnail_url: insertData.share_thumbnail_url ?? null,
    pdf_url: insertData.pdf_url ?? null,
    tag_ids: insertData.tag_ids ?? [],
    bill_contents: insertData.bill_contents ?? [],
    faction_stances: insertData.faction_stances ?? [],
    created_at: insertData.created_at ?? now,
    updated_at: insertData.updated_at ?? now,
  };
  await saveBill(bill);
  return { id };
}

export async function updateBillRecord(
  id: string,
  updateData: Record<string, unknown>
): Promise<void> {
  const bill = await getBillById(id);
  if (!bill) throw new Error(`Bill not found: ${id}`);
  const merged: DataBill = {
    ...bill,
    ...(updateData as Partial<DataBill>),
    updated_at: nowIso(),
  };
  await saveBill(merged);
}

export async function upsertBillContent(params: {
  billId: string;
  difficultyLevel: DifficultyLevel;
  title: string;
  summary: string;
  content: string;
}): Promise<void> {
  const bill = await getBillById(params.billId);
  if (!bill) throw new Error(`Bill not found: ${params.billId}`);
  const now = nowIso();
  const existing = bill.bill_contents.find(
    (c) => c.difficulty_level === params.difficultyLevel
  );
  let newContents: BillContent[];
  if (existing) {
    newContents = bill.bill_contents.map((c) =>
      c.difficulty_level === params.difficultyLevel
        ? {
            ...c,
            title: params.title,
            summary: params.summary,
            content: params.content,
            updated_at: now,
          }
        : c
    );
  } else {
    newContents = [
      ...bill.bill_contents,
      {
        id: generateId(),
        bill_id: params.billId,
        difficulty_level: params.difficultyLevel,
        title: params.title,
        summary: params.summary,
        content: params.content,
        created_at: now,
        updated_at: now,
      },
    ];
  }
  await saveBill({ ...bill, bill_contents: newContents, updated_at: now });
}

export async function findBillsTagsByBillId(billId: string): Promise<string[]> {
  const bill = await getBillById(billId);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  return bill.tag_ids;
}

export async function deleteBillsTags(
  billId: string,
  tagIds: string[]
): Promise<void> {
  const bill = await getBillById(billId);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  const removeSet = new Set(tagIds);
  const next = bill.tag_ids.filter((id) => !removeSet.has(id));
  await saveBill({ ...bill, tag_ids: next, updated_at: nowIso() });
}

export async function createBillsTags(
  billId: string,
  tagIds: string[]
): Promise<void> {
  const [bill, allTags] = await Promise.all([
    getBillById(billId),
    getAllTags(),
  ]);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  const validTagIds = new Set(allTags.map((t) => t.id));
  const merged = Array.from(
    new Set([...bill.tag_ids, ...tagIds.filter((id) => validTagIds.has(id))])
  );
  await saveBill({ ...bill, tag_ids: merged, updated_at: nowIso() });
}
