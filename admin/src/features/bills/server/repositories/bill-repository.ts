import "server-only";
import {
  type BillContent,
  deleteBill as deleteBillData,
  getAllBills,
  getAllTags,
  getBillById as getBillByIdData,
  getCouncilSessionById,
  saveBill,
} from "@mirai-gikai/data";
import type {
  Bill,
  BillInsert,
  BillPublishStatus,
  BillSortConfig,
  BillWithCouncilSession,
} from "../../shared/types";
import { BILL_STATUS_ORDER } from "../../shared/types";

type BillFilters = {
  sessionId?: string;
  tagId?: string;
  publishStatus?: string;
  reviewStatus?: string;
  isFeatured?: string;
};

const PUBLISH_STATUS_ORDER: Record<BillPublishStatus, number> = {
  published: 0,
  coming_soon: 1,
  draft: 2,
};

function compareBills(
  a: Bill,
  b: Bill,
  field: string,
  ascending: boolean
): number {
  const sign = ascending ? 1 : -1;
  if (field === "status_order") {
    const aOrder = BILL_STATUS_ORDER[a.status];
    const bOrder = BILL_STATUS_ORDER[b.status];
    return sign * (aOrder - bOrder);
  }
  if (field === "publish_status_order") {
    const aOrder = PUBLISH_STATUS_ORDER[a.publish_status];
    const bOrder = PUBLISH_STATUS_ORDER[b.publish_status];
    return sign * (aOrder - bOrder);
  }
  if (field === "published_at") {
    const aVal = a.published_at ?? "";
    const bVal = b.published_at ?? "";
    if (aVal === "" && bVal === "") return 0;
    if (aVal === "") return 1;
    if (bVal === "") return -1;
    return sign * aVal.localeCompare(bVal);
  }
  if (field === "bill_number" || field === "name") {
    const aVal = a[field];
    const bVal = b[field];
    return sign * (aVal ?? "").localeCompare(bVal ?? "");
  }
  if (field === "council_session") {
    const aId = a.council_session_id ?? "";
    const bId = b.council_session_id ?? "";
    return sign * aId.localeCompare(bId);
  }
  // default: created_at
  return sign * a.created_at.localeCompare(b.created_at);
}

export async function findBillsWithCouncilSessions(
  sortConfig?: BillSortConfig,
  filters?: BillFilters
): Promise<BillWithCouncilSession[]> {
  const all = await getAllBills();
  const field = sortConfig?.field ?? "created_at";
  const ascending = (sortConfig?.order ?? "desc") === "asc";

  let filtered = all;
  if (filters?.sessionId) {
    filtered = filtered.filter(
      (b) => b.council_session_id === filters.sessionId
    );
  }
  if (filters?.publishStatus) {
    filtered = filtered.filter(
      (b) => b.publish_status === filters.publishStatus
    );
  }
  if (filters?.reviewStatus) {
    filtered = filtered.filter((b) => b.status === filters.reviewStatus);
  }
  if (filters?.tagId) {
    filtered = filtered.filter((b) => b.tag_ids.includes(filters.tagId!));
  }
  if (filters?.isFeatured !== undefined && filters.isFeatured !== "") {
    const want = filters.isFeatured === "true";
    filtered = filtered.filter((b) => b.is_featured === want);
  }

  const sorted = filtered
    .slice()
    .sort((a, b) => compareBills(a, b, field, ascending));

  const sessionIds = Array.from(
    new Set(
      sorted
        .map((b) => b.council_session_id)
        .filter((id): id is string => id !== null)
    )
  );
  const sessionNameById = new Map<string, string>();
  for (const id of sessionIds) {
    const s = await getCouncilSessionById(id);
    if (s) sessionNameById.set(id, s.name);
  }

  return sorted.map((b) => ({
    ...b,
    council_sessions: b.council_session_id
      ? { name: sessionNameById.get(b.council_session_id) ?? "" }
      : null,
  }));
}

export async function findBillById(billId: string): Promise<Bill> {
  const bill = await getBillByIdData(billId);
  if (!bill) {
    throw new Error(`Failed to fetch bill: ${billId} not found`);
  }
  return bill;
}

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function createBill(
  insertData: BillInsert
): Promise<{ id: string }> {
  const id = insertData.id ?? generateId();
  const now = nowIso();
  const bill: Bill = {
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

export async function deleteBillById(id: string): Promise<void> {
  await deleteBillData(id);
}

export async function updateBillPublishStatus(
  billId: string,
  publishStatus: BillPublishStatus
): Promise<void> {
  const bill = await getBillByIdData(billId);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  await saveBill({
    ...bill,
    publish_status: publishStatus,
    updated_at: nowIso(),
  });
}

export async function findBillContentsByBillId(
  billId: string
): Promise<BillContent[]> {
  const bill = await getBillByIdData(billId);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  return bill.bill_contents;
}

export async function createBillContents(
  contents: Array<
    Omit<BillContent, "id" | "created_at" | "updated_at"> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }
  >
): Promise<void> {
  if (contents.length === 0) return;
  const billId = contents[0].bill_id;
  const bill = await getBillByIdData(billId);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  const now = nowIso();
  const newContents: BillContent[] = contents.map((c) => ({
    id: c.id ?? generateId(),
    bill_id: c.bill_id,
    title: c.title,
    summary: c.summary,
    content: c.content,
    difficulty_level: c.difficulty_level,
    created_at: c.created_at ?? now,
    updated_at: c.updated_at ?? now,
  }));
  await saveBill({
    ...bill,
    bill_contents: [...bill.bill_contents, ...newContents],
    updated_at: now,
  });
}

export async function findBillTagIdsByBillId(
  billId: string
): Promise<string[]> {
  const bill = await getBillByIdData(billId);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  return bill.tag_ids;
}

export async function createBillsTags(
  billId: string,
  tagIds: string[]
): Promise<void> {
  const [bill, allTags] = await Promise.all([
    getBillByIdData(billId),
    getAllTags(),
  ]);
  if (!bill) throw new Error(`Bill not found: ${billId}`);
  const validTagIds = new Set(allTags.map((t) => t.id));
  const merged = Array.from(
    new Set([...bill.tag_ids, ...tagIds.filter((id) => validTagIds.has(id))])
  );
  await saveBill({ ...bill, tag_ids: merged, updated_at: nowIso() });
}
