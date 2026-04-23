"use client";

import type { ReactNode } from "react";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { BillWithContent } from "../../../shared/types";

interface BillDetailClientProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
  children: ReactNode;
}

// lightfork では AI チャット / テキスト選択機能を廃止しているため、
// 単純に children をそのまま返すラッパーコンポーネント。
// 将来的にクライアントサイド機能を追加する場合はここに集約する。
export function BillDetailClient({
  bill: _bill,
  currentDifficulty: _currentDifficulty,
  children,
}: BillDetailClientProps) {
  return <>{children}</>;
}
