import type { BillContent as DataBillContent } from "@mirai-gikai/data";
import { z } from "zod";

export type BillContent = DataBillContent;
export type BillContentUpdate = Partial<DataBillContent>;

export type DifficultyLevel = "normal" | "hard";

// バリデーションスキーマ
export const billContentUpdateSchema = z.object({
  title: z
    .string()
    .max(200, "タイトルは200文字以内で入力してください")
    .optional()
    .default(""),
  summary: z
    .string()
    .max(500, "要約は500文字以内で入力してください")
    .optional()
    .default(""),
  content: z
    .string()
    .max(50000, "内容は50000文字以内で入力してください")
    .optional()
    .default(""),
});

export type BillContentUpdateInput = z.infer<typeof billContentUpdateSchema>;

// 2つの難易度レベル用の入力型
export const billContentsUpdateSchema = z.object({
  normal: billContentUpdateSchema,
  hard: billContentUpdateSchema,
});

export type BillContentsUpdateInput = z.infer<typeof billContentsUpdateSchema>;

// 難易度レベル設定
export const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string }[] = [
  { value: "normal", label: "ふつう" },
  { value: "hard", label: "難しい" },
];
