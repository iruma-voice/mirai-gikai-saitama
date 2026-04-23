import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BillWithContent } from "../../shared/types";
import {
  findPublishedBillsWithContents,
  findTagsByBillIds,
} from "../repositories/bill-repository";

export async function getBills(): Promise<BillWithContent[]> {
  // キャッシュ外でcookiesにアクセス
  const difficultyLevel = await getDifficultyLevel();
  return _getCachedBills(difficultyLevel);
}

const _getCachedBills = unstable_cache(
  async (difficultyLevel: DifficultyLevelEnum): Promise<BillWithContent[]> => {
    const data = await findPublishedBillsWithContents(difficultyLevel);

    const billIds = data.map((item) => item.id);
    const tagsByBillId = await findTagsByBillIds(billIds);

    const billsWithContent: BillWithContent[] = data.map((item) => {
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
        tags: tagsByBillId.get(item.id) ?? [],
      };
    });

    return billsWithContent;
  },
  ["bills-list"],
  {
    revalidate: 600,
    tags: [CACHE_TAGS.BILLS],
  }
);
