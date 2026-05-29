export type ReviewStatus =
  | "draft"
  | "uploaded"
  | "pending_review"
  | "ai_analyzing"
  | "ai_analysis_failed"
  | "reviewing"
  | "approved"
  | "rejected"
  | "published";

export type SourceType =
  | "pdf"
  | "markdown"
  | "txt"
  | "csv"
  | "manual"
  | "url"
  | "other";

export type ItemType =
  | "paper"
  | "experiment_record"
  | "note"
  | "project_doc"
  | "course_material"
  | "other";

export type KnowledgeBase = {
  id: string;
  name: string;
  description?: string | null;
  published_count: number;
  pending_review_count: number;
  updated_at?: string | null;
};

export type KnowledgeItemPayload = {
  knowledge_base_id?: string;
  title?: string | null;
  summary?: string | null;
  tags?: string[];
  tag_ids?: string[];
  cluster_id?: string | null;
  cluster_label?: string | null;
  source_type?: SourceType;
  item_type?: ItemType;
  author?: string | null;
  year?: number | null;
  doi_url?: string | null;
  source_name?: string | null;
  visibility?: string;
  content_preview?: string | null;
  reject_reason?: string | null;
  file_name?: string | null;
};

export type KnowledgeItem = {
  id: string;
  knowledge_base_id: string;
  title: string;
  summary?: string | null;
  tags: string[];
  tag_ids?: string[];
  cluster_id?: string | null;
  cluster_label?: string | null;
  source_type: SourceType;
  item_type: ItemType;
  author?: string | null;
  year?: number | null;
  doi_url?: string | null;
  source_name?: string | null;
  visibility?: string | null;
  review_status: ReviewStatus;
  reject_reason?: string | null;
  content_preview?: string | null;
  has_source_file?: boolean;
  x?: number | null;
  y?: number | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};

export type KnowledgeMapPoint = {
  id: string;
  title: string;
  x: number;
  y: number;
  cluster_id?: string | null;
  cluster_label?: string | null;
  tags: string[];
  tag_ids?: string[];
  summary_preview?: string | null;
  source_type: SourceType;
  item_type: ItemType;
  year?: number | null;
  published_at?: string | null;
  review_status: ReviewStatus;
};

export type KnowledgeCluster = {
  id: string;
  label: string;
  keywords: string[];
  item_count: number;
  color: string;
};

export type KnowledgeMapResponse = {
  points: KnowledgeMapPoint[];
  clusters: KnowledgeCluster[];
};

export type KnowledgeItemList = {
  items: KnowledgeItem[];
};

export type RelatedKnowledgeItem = {
  item: KnowledgeItem;
  score: number;
  relation_type: string;
  reason: string;
  evidence: Record<string, unknown>;
};

export type RelatedKnowledgeItemList = {
  items: RelatedKnowledgeItem[];
};
