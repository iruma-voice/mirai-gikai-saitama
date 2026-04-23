"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import type { BillPublishStatus } from "../../../shared/types";

interface ViewButtonProps {
  billId: string;
  publishStatus: BillPublishStatus;
}

export function ViewButton({ billId, publishStatus }: ViewButtonProps) {
  const billUrl = `${env.webUrl}/bills/${billId}`;
  const label = publishStatus === "published" ? "公開ページ" : "プレビュー表示";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(billUrl, "_blank")}
    >
      <ExternalLink className="h-4 w-4" />
      {label}
    </Button>
  );
}
