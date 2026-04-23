/**
 * web アプリの内部ルート定義
 *
 * app/ ディレクトリの page.tsx と 1:1 対応する。
 * Link href や router.push には必ずこのファイルの関数を使うこと。
 * 新しいページを追加したらここにもルートを追加し、テストを通すこと。
 */

export const routes = {
  // ── 静的ルート ──────────────────────────────────────
  home: () => "/" as const,
  terms: () => "/terms" as const,
  privacy: () => "/privacy" as const,

  // ── 議案 ──────────────────────────────────────────
  billDetail: (billId: string) => `/bills/${billId}` as const,

  // ── 定例会セッション ────────────────────────────────
  sessionBills: (slug: string) => `/sessions/${slug}/bills` as const,

  // ── その他 ────────────────────────────────────────
  faq: () => "/faq" as const,
} as const;
