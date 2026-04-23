import type {
  Bill as DataBill,
  BillContent as DataBillContent,
  BillStatus,
  StanceType,
} from "@mirai-gikai/data";

// Database types
export type Bill = DataBill;
export type BillInsert = Partial<DataBill> & {
  name: string;
  status: BillStatus;
};
export type BillUpdate = Partial<DataBill>;

export type BillContent = DataBillContent;
export type BillContentInsert = Partial<DataBillContent> & {
  bill_id: string;
  title: string;
  summary: string;
  content: string;
  difficulty_level: DataBillContent["difficulty_level"];
};
export type BillContentUpdate = Partial<DataBillContent>;

// Enums
export type BillStatusEnum = BillStatus;
export type StanceTypeEnum = StanceType;

// mirai_stances テーブルは現在のDB上には存在しないが、
// stance-styles.ts と関連テストが参照するためローカル型として定義する
export type MiraiStance = {
  id: string;
  bill_id: string;
  type: StanceTypeEnum;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

// 公開ステータス型（議案の公開/非公開を管理）
export type BillPublishStatus = "draft" | "published" | "coming_soon";

// Coming Soon議案の型（最小限の情報のみ）
export type ComingSoonBill = {
  id: string;
  name: string; // 正式名称
  title: string | null; // わかりやすいタイトル（bill_contentsから）
  council_url: string | null;
  status: BillStatusEnum;
  tags: BillTag[];
};

// Combined types for UI
export type FactionStance = {
  id: string;
  stance: StanceTypeEnum;
  comment: string | null;
  faction: {
    id: string;
    name: string;
    display_name: string;
    sort_order: number;
  };
};

export type BillWithStance = Omit<Bill, "faction_stances"> & {
  faction_stances?: FactionStance[];
};

export type BillTag = {
  id: string;
  label: string;
};

export type FeaturedTag = {
  id: string;
  label: string;
  priority: number;
};

export type BillWithContent = Omit<
  Bill,
  "bill_contents" | "faction_stances" | "tag_ids"
> & {
  bill_content?: BillContent;
  faction_stances?: FactionStance[];
  tags: BillTag[];
  featured_tag?: FeaturedTag;
};

// タグごとにグループ化された議案
export type BillsByTag = {
  tag: BillTag & { description?: string; priority: number };
  bills: BillWithContent[];
};

// ステータスのソート順（DBのstatus_order generated columnと一致させる）
export const BILL_STATUS_ORDER: Record<BillStatusEnum, number> = {
  approved: 0,
  adopted: 0,
  reported: 0,
  partially_adopted: 1,
  rejected: 2,
  plenary_session: 3,
  in_committee: 4,
  submitted: 5,
  preparing: 6,
};

// ステータスを日本語ラベルに変換する関数
export function getBillStatusLabel(status: BillStatusEnum): string {
  switch (status) {
    case "preparing":
      return "準備中";
    case "submitted":
      return "上程済み";
    case "in_committee":
      return "委員会審査中";
    case "plenary_session":
      return "本会議採決中";
    case "approved":
      return "可決";
    case "rejected":
      return "否決";
    case "adopted":
      return "採択";
    case "partially_adopted":
      return "趣旨採択";
    case "reported":
      return "専決処分報告";
    default:
      return status;
  }
}

export const STANCE_LABELS: Record<StanceTypeEnum, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
  conditional_for: "条件付き賛成",
  conditional_against: "条件付き反対",
  considering: "検討中",
  continued_deliberation: "継続審査中",
};
