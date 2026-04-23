import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { getActiveCouncilSession } from "@/features/council-sessions/server/loaders/get-active-council-session";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BillWithContent } from "../../shared/types";
import {
  findFeaturedBillsWithContents,
  findTagsByBillIds,
} from "../repositories/bill-repository";

/**
 * 注目の議案を取得する
 * is_featured = true でアクティブな定例会の公開済み議案を最新順に取得
 * アクティブな定例会がない場合は全件取得
 */
export async function getFeaturedBills(): Promise<BillWithContent[]> {
  const difficultyLevel = await getDifficultyLevel();
  const activeSession = await getActiveCouncilSession();

  return _getCachedFeaturedBills(difficultyLevel, activeSession?.id ?? null);
}

const _getCachedFeaturedBills = unstable_cache(
  async (
    difficultyLevel: DifficultyLevelEnum,
    councilSessionId: string | null
  ): Promise<BillWithContent[]> => {
    const data = await findFeaturedBillsWithContents(
      difficultyLevel,
      councilSessionId
    );

    if (data.length === 0) {
      return [];
    }

    const billIds = data.map((item: { id: string }) => item.id);
    const tagsByBillId = await findTagsByBillIds(billIds);

    return data.map((item) => {
      const {
        bill_contents,
        faction_stances: _fs,
        tag_ids: _t,
        ...bill
      } = item;
      return {
        ...bill,
        bill_content: Array.isArray(bill_contents)
          ? bill_contents[0]
          : undefined,
        tags: tagsByBillId.get(item.id) || [],
      };
    }) as BillWithContent[];
  },
  ["featured-bills-list"],
  {
    revalidate: 600,
    tags: [CACHE_TAGS.BILLS],
  }
);
