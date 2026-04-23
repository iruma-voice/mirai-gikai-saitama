export type BillPublishStatus = "draft" | "published" | "coming_soon";

export type BillStatus =
  | "preparing"
  | "submitted"
  | "in_committee"
  | "plenary_session"
  | "approved"
  | "rejected"
  | "adopted"
  | "partially_adopted"
  | "reported";

export type DifficultyLevel = "normal" | "hard";

export type StanceType =
  | "for"
  | "against"
  | "neutral"
  | "conditional_for"
  | "conditional_against"
  | "considering"
  | "continued_deliberation";

export interface BillContent {
  id: string;
  bill_id: string;
  title: string;
  summary: string;
  content: string;
  difficulty_level: DifficultyLevel;
  created_at: string;
  updated_at: string;
}

export interface FactionStance {
  id: string;
  bill_id: string;
  faction_id: string;
  type: StanceType;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  bill_number: string;
  name: string;
  slug: string | null;
  status: BillStatus;
  status_note: string | null;
  publish_status: BillPublishStatus;
  council_session_id: string | null;
  is_featured: boolean;
  published_at: string | null;
  submitted_date: string | null;
  thumbnail_url: string | null;
  share_thumbnail_url: string | null;
  pdf_url: string | null;
  tag_ids: string[];
  bill_contents: BillContent[];
  faction_stances: FactionStance[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  label: string;
  description: string | null;
  featured_priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface Faction {
  id: string;
  name: string;
  display_name: string;
  alternative_names: string[];
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouncilSession {
  id: string;
  name: string;
  slug: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  council_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillWithRelations extends Bill {
  tags: Tag[];
  council_session: CouncilSession | null;
}
