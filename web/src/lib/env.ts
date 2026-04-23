/**
 * 環境変数の設定
 * アプリケーション全体で使用する環境変数を一元管理
 */

export const env = {
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  revalidateSecret: process.env.REVALIDATE_SECRET,
  analytics: {
    gaTrackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
  },
} as const;

export type Env = typeof env;
