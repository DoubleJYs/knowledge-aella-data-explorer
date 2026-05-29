import {
  getItemTypeLabel,
  getSourceTypeLabel,
} from "~/components/review/KnowledgeItemForm";
import { DetailTagsPanel, type DetailTagSection } from "~/components/map/DetailTagsPanel";
import { RelatedItemsList } from "~/components/map/RelatedItemsList";
import type { KnowledgeItem, RelatedKnowledgeItem } from "~/types/knowledge";
import { XIcon } from "lucide-react";
import type { Ref } from "react";

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

export function KnowledgeNodeDetailStrip({
  detailRef,
  item,
  onLegacyTagClick,
  onRelatedItemClick,
  onStructuredTagClick,
  tagSections,
  relatedItems = [],
  similarItems,
  highlightedRelated = false,
  onClearRelatedHighlight,
  onHighlightRelated,
  showTags = true,
}: {
  detailRef?: Ref<HTMLDivElement>;
  item: KnowledgeItem | null;
  onLegacyTagClick: (tagName: string) => void;
  onRelatedItemClick?: (itemId: string) => void;
  onStructuredTagClick: (tagId: string) => void;
  tagSections: DetailTagSection[];
  relatedItems?: RelatedKnowledgeItem[];
  similarItems: KnowledgeItem[];
  highlightedRelated?: boolean;
  onClearRelatedHighlight?: () => void;
  onHighlightRelated?: () => void;
  showTags?: boolean;
}) {
  if (!item) return null;

  return (
    <div
      ref={detailRef}
      className={`
        sticky top-[62px] z-20 border-b border-[#292e37] bg-[#11141a]/95 px-8
        py-5 shadow-[0_18px_40px_rgba(0,0,0,0.25)] backdrop-blur

        xl:hidden
      `}
    >
      <div className={`
        grid gap-5

        lg:grid-cols-[minmax(0,1fr)_320px]
      `}>
        <div>
          <div className={`
            mb-2 text-xs font-semibold uppercase tracking-[0.12em]
            text-[#60a5fa]
          `}>
            已选节点
          </div>
          <h2 className="text-lg font-bold text-stone-100">
            {toChineseDisplayText(item.title)}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-400">
            {toChineseDisplayText(
              item.content_preview || item.summary || "暂无原文片段。",
            )}
          </p>
          {item.has_source_file && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className={`
                  rounded-full border border-[#60a5fa]/45 bg-[#2563eb]/20 px-3
                  py-1.5 text-xs font-semibold text-[#bfdbfe] transition-colors

                  hover:border-[#93c5fd] hover:text-white
                `}
                href={`/api/items/${item.id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                在线阅读
              </a>
              <a
                className={`
                  rounded-full border border-[#2c313b] bg-black/10 px-3 py-1.5
                  text-xs font-semibold text-stone-300 transition-colors

                  hover:border-[#60a5fa]/50 hover:text-white
                `}
                href={`/api/items/${item.id}/pdf?download=true`}
              >
                下载 PDF
              </a>
            </div>
          )}
          <div className={`
            mt-4 grid gap-2 text-xs text-stone-500

            sm:grid-cols-4
          `}>
            <div className={`
              rounded-[8px] border border-[#2c313b] bg-black/10 px-3 py-2
            `}>
              <div className="mb-1 text-stone-400">资料类型</div>
              <div className="font-semibold text-stone-200">
                {getItemTypeLabel(item.item_type)}
              </div>
            </div>
            <div className={`
              rounded-[8px] border border-[#2c313b] bg-black/10 px-3 py-2
            `}>
              <div className="mb-1 text-stone-400">来源</div>
              <div className="line-clamp-1 font-semibold text-stone-200">
                {toChineseDisplayText(
                  item.source_name ?? getSourceTypeLabel(item.source_type),
                )}
              </div>
            </div>
            <div className={`
              rounded-[8px] border border-[#2c313b] bg-black/10 px-3 py-2
            `}>
              <div className="mb-1 text-stone-400">年份</div>
              <div className="font-semibold text-stone-200">
                {item.year ?? "未知"}
              </div>
            </div>
            <div className={`
              rounded-[8px] border border-[#2c313b] bg-black/10 px-3 py-2
            `}>
              <div className="mb-1 text-stone-400">可见范围</div>
              <div className="font-semibold text-stone-200">
                {item.visibility ?? "课题组可见"}
              </div>
            </div>
          </div>
          {showTags && (
            <div className={`
              mt-4 rounded-[10px] border border-[#2c313b] bg-black/10 p-4
            `}>
              <div className="mb-3 text-xs font-semibold text-stone-500">
                标签
              </div>
              <DetailTagsPanel
                sections={tagSections}
                onLegacyTagClick={onLegacyTagClick}
                onStructuredTagClick={onStructuredTagClick}
              />
            </div>
          )}
        </div>
        <div className={`
          rounded-[10px] border border-[#2c313b] bg-black/15 p-4 text-xs
          text-stone-400
        `}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="font-semibold text-stone-200">
              {relatedItems.length > 0 ? "关联推荐" : "相似条目"}
            </div>
            {relatedItems.length > 0 && (
              <button
                type="button"
                className="text-[11px] font-semibold text-[#93c5fd] hover:text-white"
                onClick={
                  highlightedRelated ? onClearRelatedHighlight : onHighlightRelated
                }
              >
                {highlightedRelated ? "清除高亮" : "高亮相关节点"}
              </button>
            )}
          </div>
          <RelatedItemsList
            emptyText="暂无相似条目。第一版使用同聚类或坐标邻近的占位结果。"
            items={similarItems}
            limit={3}
            onItemClick={onRelatedItemClick}
            relatedItems={relatedItems}
            variant="compact"
          />
        </div>
      </div>
    </div>
  );
}

export function KnowledgeNodeDetailPanel({
  item,
  onLegacyTagClick,
  onClose,
  onRelatedItemClick,
  onStructuredTagClick,
  tagSections,
  relatedItems = [],
  similarItems,
  highlightedRelated = false,
  onClearRelatedHighlight,
  onHighlightRelated,
  showTags = true,
}: {
  item: KnowledgeItem | null;
  onLegacyTagClick: (tagName: string) => void;
  onClose: () => void;
  onRelatedItemClick?: (itemId: string) => void;
  onStructuredTagClick: (tagId: string) => void;
  tagSections: DetailTagSection[];
  relatedItems?: RelatedKnowledgeItem[];
  similarItems: KnowledgeItem[];
  highlightedRelated?: boolean;
  onClearRelatedHighlight?: () => void;
  onHighlightRelated?: () => void;
  showTags?: boolean;
}) {
  if (!item) return null;

  return (
    <aside className={`
      fixed right-4 top-[78px] z-40 hidden w-[360px] max-w-[calc(100vw-32px)]
      overflow-hidden rounded-[18px] border border-[#303640] bg-[#11141a]/95
      shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl

      xl:block
    `}>
      <div className="border-b border-[#292e37] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`
              text-xs font-semibold tracking-[0.12em] text-[#60a5fa]
            `}>
              节点详情
            </div>
            <h2 className={`
              mt-2 line-clamp-2 text-base font-bold leading-snug text-stone-100
            `}>
              {toChineseDisplayText(item.title)}
            </h2>
          </div>
          <button
            type="button"
            className={`
              flex h-8 w-8 shrink-0 items-center justify-center rounded-full
              border border-[#2c313b] text-stone-500 transition-colors

              hover:border-[#60a5fa]/50 hover:text-stone-200
            `}
            onClick={onClose}
            aria-label="关闭节点详情"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-160px)] overflow-y-auto px-5 py-4">
        <div className="rounded-[12px] border border-[#2c313b] bg-black/15 p-4">
          <div className="text-xs font-semibold text-stone-500">摘要</div>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            {toChineseDisplayText(item.summary || "该条目已通过管理员审核并进入知识地图。")}
          </p>
          {item.has_source_file && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className={`
                  rounded-full border border-[#60a5fa]/45 bg-[#2563eb]/20 px-3
                  py-1.5 text-xs font-semibold text-[#bfdbfe] transition-colors

                  hover:border-[#93c5fd] hover:text-white
                `}
                href={`/api/items/${item.id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                在线阅读
              </a>
              <a
                className={`
                  rounded-full border border-[#2c313b] bg-black/10 px-3 py-1.5
                  text-xs font-semibold text-stone-300 transition-colors

                  hover:border-[#60a5fa]/50 hover:text-white
                `}
                href={`/api/items/${item.id}/pdf?download=true`}
              >
                下载 PDF
              </a>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {[
            ["资料类型", getItemTypeLabel(item.item_type)],
            ["来源类型", getSourceTypeLabel(item.source_type)],
            ["年份", String(item.year ?? "未知")],
            ["可见范围", item.visibility ?? "课题组可见"],
          ].map(([label, value]) => (
            <div
              key={label}
              className={`
                rounded-[10px] border border-[#2c313b] bg-black/10 px-3 py-2
              `}
            >
              <div className="text-stone-500">{label}</div>
              <div className="mt-1 line-clamp-1 font-semibold text-stone-200">
                {toChineseDisplayText(value)}
              </div>
            </div>
          ))}
        </div>

        {showTags && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-stone-500">标签</div>
            <div className="mt-3">
              <DetailTagsPanel
                sections={tagSections}
                onLegacyTagClick={onLegacyTagClick}
                onStructuredTagClick={onStructuredTagClick}
              />
            </div>
          </div>
        )}

        <div className={`
          mt-4 rounded-[12px] border border-[#2c313b] bg-black/10 p-4
        `}>
          <div className="text-xs font-semibold text-stone-500">原文片段</div>
          <p className="mt-2 line-clamp-5 text-sm leading-6 text-stone-400">
            {toChineseDisplayText(item.content_preview || "暂无原文片段。")}
          </p>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-stone-500">
              {relatedItems.length > 0 ? "关联推荐" : "相似条目"}
            </div>
            {relatedItems.length > 0 && (
              <button
                type="button"
                className={`
                  rounded-full border border-[#60a5fa]/35 px-2.5 py-1 text-[11px]
                  font-semibold text-[#93c5fd] transition-colors

                  hover:border-[#93c5fd] hover:text-white
                `}
                onClick={
                  highlightedRelated ? onClearRelatedHighlight : onHighlightRelated
                }
              >
                {highlightedRelated ? "清除高亮" : "高亮相关节点"}
              </button>
            )}
          </div>
          <RelatedItemsList
            items={similarItems}
            limit={4}
            onItemClick={onRelatedItemClick}
            relatedItems={relatedItems}
          />
        </div>
      </div>
    </aside>
  );
}
