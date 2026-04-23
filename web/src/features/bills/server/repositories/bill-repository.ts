import "server-only";
import {
  type Bill as DataBill,
  type BillContent,
  type BillStatus,
  type StanceType,
  getAllBills,
  getAllFactions,
  getAllTags,
  getBillById,
  getFeaturedTags as getFeaturedTagsData,
  getCouncilSessionById,
} from "@mirai-gikai/data";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { MiraiStance } from "../../shared/types";

type BillWithContents = DataBill & { bill_contents: BillContent[] };

function selectContents(
  bill: DataBill,
  difficulty: DifficultyLevelEnum
): BillContent[] {
  const match = bill.bill_contents.find(
    (c) => c.difficulty_level === difficulty
  );
  return match ? [match] : [];
}

function hasContentForDifficulty(
  bill: DataBill,
  difficulty: DifficultyLevelEnum
): boolean {
  return bill.bill_contents.some((c) => c.difficulty_level === difficulty);
}

function sortByPublishedAtDesc<T extends { published_at: string | null }>(
  a: T,
  b: T
): number {
  if (a.published_at === b.published_at) return 0;
  if (a.published_at == null) return 1;
  if (b.published_at == null) return -1;
  return b.published_at.localeCompare(a.published_at);
}

function sortByStatusOrderAscThenPublishedAtDesc<
  T extends { status_order?: number | null; published_at: string | null },
>(a: T, b: T): number {
  const aOrder = a.status_order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.status_order ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return sortByPublishedAtDesc(a, b);
}

// ============================================================
// Bills
// ============================================================

export async function findPublishedBillsWithContents(
  difficultyLevel: DifficultyLevelEnum
): Promise<BillWithContents[]> {
  const all = await getAllBills();
  return all
    .filter(
      (b) =>
        b.publish_status === "published" &&
        hasContentForDifficulty(b, difficultyLevel)
    )
    .map((b) => ({ ...b, bill_contents: selectContents(b, difficultyLevel) }))
    .sort(sortByPublishedAtDesc);
}

export async function findPublishedBillById(
  id: string
): Promise<DataBill | null> {
  const bill = await getBillById(id);
  if (!bill || bill.publish_status !== "published") return null;
  return bill;
}

export async function findBillById(id: string): Promise<DataBill | null> {
  return getBillById(id);
}

export async function findMiraiStanceByBillId(
  _billId: string
): Promise<MiraiStance | null> {
  return null;
}

type FactionStanceWithFaction = {
  id: string;
  type: StanceType;
  comment: string | null;
  factions: {
    id: string;
    name: string;
    display_name: string;
    sort_order: number;
  } | null;
};

export async function findFactionStancesByBillId(
  billId: string
): Promise<FactionStanceWithFaction[]> {
  const [bill, factions] = await Promise.all([
    getBillById(billId),
    getAllFactions(),
  ]);
  if (!bill) return [];
  const factionMap = new Map(factions.map((f) => [f.id, f]));
  return bill.faction_stances
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => {
      const f = factionMap.get(s.faction_id);
      return {
        id: s.id,
        type: s.type,
        comment: s.comment,
        factions: f
          ? {
              id: f.id,
              name: f.name,
              display_name: f.display_name,
              sort_order: f.sort_order,
            }
          : null,
      };
    });
}

type BillTagEntry = { tags: { id: string; label: string } | null };

export async function findTagsByBillId(
  billId: string
): Promise<BillTagEntry[] | null> {
  const [bill, tags] = await Promise.all([getBillById(billId), getAllTags()]);
  if (!bill) return null;
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  return bill.tag_ids.map((id) => {
    const t = tagMap.get(id);
    return { tags: t ? { id: t.id, label: t.label } : null };
  });
}

// ============================================================
// Bill Contents
// ============================================================

export async function findBillContentByDifficulty(
  billId: string,
  difficultyLevel: DifficultyLevelEnum
): Promise<BillContent | null> {
  const bill = await getBillById(billId);
  if (!bill) return null;
  return (
    bill.bill_contents.find((c) => c.difficulty_level === difficultyLevel) ??
    null
  );
}

// ============================================================
// Tags (bulk)
// ============================================================

export async function findTagsByBillIds(
  billIds: string[]
): Promise<Map<string, Array<{ id: string; label: string }>>> {
  if (billIds.length === 0) return new Map();
  const [bills, tags] = await Promise.all([getAllBills(), getAllTags()]);
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const byBill = new Map<string, Array<{ id: string; label: string }>>();
  const billSet = new Set(billIds);
  for (const bill of bills) {
    if (!billSet.has(bill.id)) continue;
    const attached: Array<{ id: string; label: string }> = [];
    for (const tagId of bill.tag_ids) {
      const t = tagMap.get(tagId);
      if (t) attached.push({ id: t.id, label: t.label });
    }
    byBill.set(bill.id, attached);
  }
  return byBill;
}

// ============================================================
// Council Session Bills
// ============================================================

export async function findPublishedBillsByDietSession(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum
): Promise<BillWithContents[]> {
  const all = await getAllBills();
  return all
    .filter(
      (b) =>
        b.council_session_id === councilSessionId &&
        b.publish_status === "published" &&
        hasContentForDifficulty(b, difficultyLevel)
    )
    .map((b) => ({ ...b, bill_contents: selectContents(b, difficultyLevel) }))
    .sort(sortByStatusOrderAscThenPublishedAtDesc);
}

export async function findPreviousSessionBills(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum,
  limit: number
): Promise<BillWithContents[]> {
  const sorted = await findPublishedBillsByDietSession(
    councilSessionId,
    difficultyLevel
  );
  return sorted.slice(0, limit);
}

export async function countPublishedBillsByDietSession(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum
): Promise<number> {
  const sorted = await findPublishedBillsByDietSession(
    councilSessionId,
    difficultyLevel
  );
  return sorted.length;
}

// ============================================================
// Featured
// ============================================================

export async function findFeaturedTags() {
  const tags = await getFeaturedTagsData();
  return tags.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    featured_priority: t.featured_priority,
  }));
}

type BillsTagsJoin = {
  bill_id: string;
  bills:
    | (BillWithContents & {
        bills_tags: { tags: { id: string; label: string } | null }[];
      })
    | null;
};

export async function findPublishedBillsByTag(
  tagId: string,
  difficultyLevel: DifficultyLevelEnum,
  councilSessionId: string | null
): Promise<BillsTagsJoin[] | null> {
  const [all, tags] = await Promise.all([getAllBills(), getAllTags()]);
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const filtered = all.filter(
    (b) =>
      b.tag_ids.includes(tagId) &&
      b.publish_status === "published" &&
      hasContentForDifficulty(b, difficultyLevel) &&
      (councilSessionId ? b.council_session_id === councilSessionId : true)
  );
  return filtered.map((b) => ({
    bill_id: b.id,
    bills: {
      ...b,
      bill_contents: selectContents(b, difficultyLevel),
      bills_tags: b.tag_ids.map((id) => {
        const t = tagMap.get(id);
        return { tags: t ? { id: t.id, label: t.label } : null };
      }),
    },
  }));
}

type FeaturedBill = BillWithContents & {
  tags: { tag: { id: string; label: string } | null }[];
};

export async function findFeaturedBillsWithContents(
  difficultyLevel: DifficultyLevelEnum,
  councilSessionId: string | null
): Promise<FeaturedBill[]> {
  const [all, tags] = await Promise.all([getAllBills(), getAllTags()]);
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const filtered = all
    .filter(
      (b) =>
        b.is_featured &&
        hasContentForDifficulty(b, difficultyLevel) &&
        (councilSessionId ? b.council_session_id === councilSessionId : true)
    )
    .sort(sortByPublishedAtDesc);
  return filtered.map((b) => ({
    ...b,
    bill_contents: selectContents(b, difficultyLevel),
    tags: b.tag_ids.map((id) => {
      const t = tagMap.get(id);
      return { tag: t ? { id: t.id, label: t.label } : null };
    }),
  }));
}

// ============================================================
// Coming Soon
// ============================================================

type ComingSoonBill = {
  id: string;
  name: string;
  status: BillStatus;
  bill_contents: { title: string; difficulty_level: string }[];
  council_sessions: { council_url: string | null } | null;
};

export async function findComingSoonBills(
  councilSessionId: string | null
): Promise<ComingSoonBill[]> {
  const all = await getAllBills();
  const filtered = all
    .filter(
      (b) =>
        b.publish_status === "coming_soon" &&
        (councilSessionId ? b.council_session_id === councilSessionId : true)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const councilCache = new Map<string, { council_url: string | null } | null>();
  const result: ComingSoonBill[] = [];
  for (const b of filtered) {
    let councilSession: { council_url: string | null } | null = null;
    if (b.council_session_id) {
      if (councilCache.has(b.council_session_id)) {
        councilSession = councilCache.get(b.council_session_id) ?? null;
      } else {
        const session = await getCouncilSessionById(b.council_session_id);
        councilSession = session ? { council_url: session.council_url } : null;
        councilCache.set(b.council_session_id, councilSession);
      }
    }
    result.push({
      id: b.id,
      name: b.name,
      status: b.status,
      bill_contents: b.bill_contents.map((c) => ({
        title: c.title,
        difficulty_level: c.difficulty_level,
      })),
      council_sessions: councilSession,
    });
  }
  return result;
}
