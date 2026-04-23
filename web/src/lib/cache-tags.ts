/**
 * Next.js cache tags for revalidation
 */
export const CACHE_TAGS = {
  BILLS: "bills",
  COUNCIL_SESSIONS: "council-sessions",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS = Object.values(CACHE_TAGS);
