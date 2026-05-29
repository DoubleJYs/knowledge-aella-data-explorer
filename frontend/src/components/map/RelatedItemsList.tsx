import {
  getItemTypeLabel,
} from "~/components/review/KnowledgeItemForm";
import type { KnowledgeItem, RelatedKnowledgeItem } from "~/types/knowledge";

function toChineseDisplayText(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/AI(?=[\u4e00-\u9fa5])/g, "人工智能")
    .replace(/\bAI\b/g, "人工智能")
    .replace(/manual-entry/g, "手动新增")
    .replace(/\bmanual\b/g, "手动录入")
    .replace(/\bPDF\b/g, "文档")
    .replace(/\bTXT\b/g, "文本")
    .replace(/Knowledge Land/g, "知识库")
    .replace(/Knowledge Explorer/g, "知识探索器");
}

export function RelatedItemsList({
  emptyText = "暂无相似条目。",
  items,
  limit,
  onItemClick,
  relatedItems = [],
  variant = "panel",
}: {
  emptyText?: string;
  items: KnowledgeItem[];
  limit: number;
  onItemClick?: (itemId: string) => void;
  relatedItems?: RelatedKnowledgeItem[];
  variant?: "compact" | "panel";
}) {
  if (relatedItems.length > 0) {
    const visibleItems = relatedItems.slice(0, limit);
    if (variant === "compact") {
      return (
        <div className="space-y-2">
          {visibleItems.map((related) => (
            <button
              key={related.item.id}
              type="button"
              className="block w-full text-left"
              onClick={() => onItemClick?.(related.item.id)}
            >
              <div className="line-clamp-1 font-semibold text-stone-200">
                {toChineseDisplayText(related.item.title)}
              </div>
              <div className="mt-0.5 line-clamp-1 text-[11px] text-stone-500">
                {Math.round(related.score * 100)}% · {related.reason}
              </div>
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {visibleItems.map((related) => (
          <button
            key={related.item.id}
            type="button"
            className={`
              block w-full rounded-[10px] border border-[#2c313b] bg-black/10
              p-3 text-left text-xs text-stone-400 transition-colors

              hover:border-[#60a5fa]/55 hover:bg-[#2563eb]/10
            `}
            onClick={() => onItemClick?.(related.item.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="line-clamp-2 font-semibold text-stone-200">
                  {toChineseDisplayText(related.item.title)}
                </div>
                <div className="mt-1 text-stone-500">
                  {getRelationTypeLabel(related.relation_type)} /{" "}
                  {getItemTypeLabel(related.item.item_type)}
                </div>
              </div>
              <span className={`
                shrink-0 rounded-full border border-[#60a5fa]/45 bg-[#2563eb]/20
                px-2 py-0.5 text-[11px] font-semibold text-[#bfdbfe]
              `}>
                {Math.round(related.score * 100)}%
              </span>
            </div>
            <div className="mt-2 line-clamp-2 leading-5 text-stone-400">
              {related.reason}
            </div>
            {getEvidenceSummary(related.evidence) && (
              <div className="mt-2 line-clamp-2 text-[11px] text-stone-500">
                证据：{getEvidenceSummary(related.evidence)}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    if (variant === "compact") return <div>{emptyText}</div>;
    return (
      <div className={`
        rounded-[10px] border border-[#2c313b] bg-black/10 p-3 text-xs
        text-stone-500
      `}>
        {emptyText}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {items.slice(0, limit).map((item) => (
          <button
            key={item.id}
            type="button"
            className="block w-full text-left"
            onClick={() => onItemClick?.(item.id)}
          >
            <div className="line-clamp-1">
              {toChineseDisplayText(item.title)}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, limit).map((item) => (
        <button
          key={item.id}
          type="button"
          className={`
            block w-full rounded-[10px] border border-[#2c313b] bg-black/10
            p-3 text-left text-xs text-stone-400 transition-colors

            hover:border-[#60a5fa]/55 hover:bg-[#2563eb]/10
          `}
          onClick={() => onItemClick?.(item.id)}
        >
          <div className="line-clamp-2 font-semibold text-stone-200">
            {toChineseDisplayText(item.title)}
          </div>
          <div className="mt-1 text-stone-500">
            {getItemTypeLabel(item.item_type)}
          </div>
        </button>
      ))}
    </div>
  );
}

function getRelationTypeLabel(relationType: string) {
  if (relationType === "same_cluster") return "同聚类";
  if (relationType === "same_topic") return "同主题";
  if (relationType === "semantic_similarity") return "语义相近";
  return relationType;
}

function getEvidenceSummary(evidence: Record<string, unknown>) {
  const sharedTags = evidence.shared_tags;
  if (Array.isArray(sharedTags) && sharedTags.length > 0) {
    return `共享标签 ${sharedTags.slice(0, 3).join("、")}`;
  }
  const sharedKeywords = evidence.shared_keywords;
  if (Array.isArray(sharedKeywords) && sharedKeywords.length > 0) {
    return `共享关键词 ${sharedKeywords.slice(0, 3).join("、")}`;
  }
  if (evidence.same_cluster === true) return "同一聚类";
  if (typeof evidence.coordinate_distance === "number") {
    return `坐标距离 ${Math.round(evidence.coordinate_distance)}`;
  }
  if (typeof evidence.year_gap === "number") {
    return `年份相差 ${evidence.year_gap}`;
  }
  return "";
}
