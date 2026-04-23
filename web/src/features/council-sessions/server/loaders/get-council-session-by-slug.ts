import { getAllCouncilSessions } from "@mirai-gikai/data";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilSession } from "../../shared/types";

export async function getCouncilSessionBySlug(
  slug: string
): Promise<CouncilSession | null> {
  return _getCachedCouncilSessionBySlug(slug);
}

const _getCachedCouncilSessionBySlug = unstable_cache(
  async (slug: string): Promise<CouncilSession | null> => {
    const all = await getAllCouncilSessions();
    return all.find((s) => s.slug === slug) ?? null;
  },
  ["council-session-by-slug"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
