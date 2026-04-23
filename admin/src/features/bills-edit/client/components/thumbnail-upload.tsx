"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ThumbnailUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  billId?: string;
  storagePrefix?: string;
}

export function ThumbnailUpload({ value, onChange }: ThumbnailUploadProps) {
  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-full max-w-sm h-48">
          <Image
            src={value}
            alt="サムネイル"
            fill
            className="object-cover rounded-lg border"
            sizes="(max-width: 384px) 100vw, 384px"
          />
        </div>
      ) : null}

      <input
        type="url"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="https://example.com/image.jpg"
        className="w-full rounded border px-3 py-2 text-sm"
      />
      <p className="text-xs text-muted-foreground">
        画像URLを直接入力してください。ローカルの画像は `data/assets/`
        配下に置いてCDN等で公開する運用を想定しています。
      </p>

      {value && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4 mr-2" />
            削除
          </Button>
        </div>
      )}
    </div>
  );
}
