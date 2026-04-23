import "server-only";

import {
  getActiveCouncilSession,
  getAllCouncilSessions,
} from "@mirai-gikai/data";
import type { CouncilSession } from "../../shared/types";

export async function findActiveCouncilSession(): Promise<CouncilSession | null> {
  return getActiveCouncilSession();
}

export async function findCurrentCouncilSession(
  targetDate: string
): Promise<CouncilSession | null> {
  const all = await getAllCouncilSessions();
  const candidates = all
    .filter((s) => s.start_date <= targetDate)
    .filter((s) => s.end_date == null || s.end_date >= targetDate)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  return candidates[0] ?? null;
}

export async function findAllCouncilSessions(): Promise<CouncilSession[]> {
  return getAllCouncilSessions();
}

export async function findPreviousCouncilSession(
  beforeStartDate: string
): Promise<CouncilSession | null> {
  const all = await getAllCouncilSessions();
  const candidates = all
    .filter((s) => s.start_date < beforeStartDate)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  return candidates[0] ?? null;
}
