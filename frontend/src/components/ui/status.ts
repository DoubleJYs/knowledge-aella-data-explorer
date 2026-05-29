import type { ReviewStatus } from "~/types/knowledge";

export const statusLabelMap: Record<ReviewStatus, string> = {
  approved: "已通过",
  ai_analyzing: "智能分析中",
  ai_analysis_failed: "智能分析失败",
  draft: "草稿",
  pending_review: "待审核",
  published: "已发布",
  rejected: "已驳回",
  reviewing: "审核中",
  uploaded: "已上传",
};

export function getStatusLabel(status: ReviewStatus): string {
  return statusLabelMap[status];
}
