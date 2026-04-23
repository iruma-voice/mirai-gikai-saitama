/**
 * 環境変数の設定
 * Admin はローカル起動専用。Web の revalidate 通知に使う設定だけを保持する。
 */

export const env = {
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  revalidateSecret: process.env.REVALIDATE_SECRET,
} as const;

export type Env = typeof env;
