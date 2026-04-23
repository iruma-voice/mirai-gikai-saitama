/**
 * ページレイアウトに関するユーティリティ
 *
 * TOPページと議案詳細ページは「メインページ」として扱い、
 * DifficultySelector を表示する。
 */

/** メインページ（TOP、議案詳細）かどうかを判定 */
export function isMainPage(pathname: string): boolean {
  // トップページ
  if (pathname === "/") return true;
  // 議案詳細ページ（/bills/[id]）- サブパスは除外
  if (/\/bills\/[^/]+$/.test(pathname)) return true;
  return false;
}
