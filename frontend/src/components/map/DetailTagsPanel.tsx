import { TagBadge } from "~/components/tags/TagBadge";
import type { Tag, TagGroup } from "~/types/tags";

export type DetailTagSection = {
  key: TagGroup | "other" | "legacy";
  label: string;
  legacyTags?: string[];
  tags?: Tag[];
};

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

export function DetailTagsPanel({
  onLegacyTagClick,
  onStructuredTagClick,
  sections,
}: {
  onLegacyTagClick: (tagName: string) => void;
  onStructuredTagClick: (tagId: string) => void;
  sections: DetailTagSection[];
}) {
  if (sections.length === 0) {
    return (
      <div className="text-xs text-stone-500">
        暂无标签。后台补全后会在这里按组展示。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section key={section.key} className="space-y-1.5">
          <div className={`
            text-[11px] font-semibold tracking-[0.08em] text-stone-500
          `}>
            {section.label}
          </div>
          <div className="flex flex-wrap gap-2">
            {section.tags?.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="max-w-full rounded-full text-left"
                title={`按${section.label}筛选：${tag.name}`}
                onClick={() => onStructuredTagClick(tag.id)}
              >
                <TagBadge
                  className={`
                    pointer-events-none border-[#303640] bg-[#151820]
                    text-stone-300
                  `}
                  tag={tag}
                />
              </button>
            ))}
            {section.legacyTags?.map((tagName) => (
              <button
                key={tagName}
                type="button"
                className={`
                  max-w-full rounded-full border border-[#303640] bg-[#151820]
                  px-2.5 py-1 text-left text-xs text-stone-400 transition-colors

                  hover:border-[#60a5fa]/45 hover:text-stone-200
                `}
                title={`按普通标签搜索：${tagName}`}
                onClick={() => onLegacyTagClick(tagName)}
              >
                <span className="block truncate">
                  {toChineseDisplayText(tagName)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
