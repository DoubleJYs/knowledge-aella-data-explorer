export type TagGroup =
  | "content_type"
  | "academic_domain"
  | "research_topic"
  | "dataset_type"
  | "data_origin"
  | "data_modality"
  | "meeting_type"
  | "report_type"
  | "experiment_type"
  | "project_type"
  | "course_type"
  | "status"
  | "custom";

export type TagSource =
  | "manual"
  | "admin"
  | "import"
  | "ai_suggestion"
  | "system_seed";

export type Tag = {
  id: string;
  name: string;
  slug: string;
  tagGroup: TagGroup;
  parentId: string | null;
  level: number;
  path: string;
  description: string | null;
  synonyms: string[];
  sortOrder: number;
  isSystem: boolean;
  isSelectable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TagNode = Tag & {
  children: TagNode[];
};

export type ItemTag = {
  itemId: string;
  tagId: string;
  source: TagSource;
  confidence: number | null;
  createdAt: string;
};

export type TagUsageStats = {
  tagId: string;
  itemCount: number;
  publishedItemCount: number;
  pendingReviewItemCount: number;
  lastUsedAt: string | null;
};
