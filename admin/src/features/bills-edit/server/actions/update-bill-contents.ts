"use server";

import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  type BillContentsUpdateInput,
  billContentsUpdateSchema,
  type DifficultyLevel,
} from "../../shared/types/bill-contents";
import { upsertBillContent } from "../repositories/bill-edit-repository";

export type UpdateBillContentsResult =
  | { success: true }
  | { success: false; error: string };

export async function updateBillContents(
  billId: string,
  input: BillContentsUpdateInput
): Promise<UpdateBillContentsResult> {
  try {
    // 管理者権限チェック

    // バリデーション
    const validatedData = billContentsUpdateSchema.parse(input);

    // 各難易度レベルのupsertを直列実行する。
    // upsertBillContent は bill 全体を read → write するため、
    // 並列化すると後勝ちで一方の更新が失われる（race condition）。
    for (const difficulty of ["normal", "hard"] as DifficultyLevel[]) {
      const data = validatedData[difficulty];

      // 空のコンテンツの場合はスキップ（削除も行わない）
      if (!data.title && !data.summary && !data.content) {
        continue;
      }

      await upsertBillContent({
        billId,
        difficultyLevel: difficulty,
        title: data.title || "",
        summary: data.summary || "",
        content: data.content || "",
      });
    }

    // web側のキャッシュを無効化
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);

    return { success: true };
  } catch (error) {
    console.error("Update bill contents error:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "議案コンテンツの更新中にエラーが発生しました"
      ),
    };
  }
}
