import { Button } from "~/components/ui/Button";
import type { Tag, TagGroup } from "~/types/tags";
import { cn } from "~/ui";
import { CheckIcon, LockIcon } from "lucide-react";

export const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  academic_domain: "学科领域",
  content_type: "内容类型",
  course_type: "课程材料类型",
  custom: "自定义标签",
  data_modality: "数据模态",
  data_origin: "数据来源",
  dataset_type: "数据集类型",
  experiment_type: "实验类型",
  meeting_type: "会议类型",
  project_type: "项目资料类型",
  report_type: "周报类型",
  research_topic: "研究主题",
  status: "状态标签",
};

export function getTagGroupLabel(tagGroup: TagGroup) {
  return TAG_GROUP_LABELS[tagGroup];
}

export function TagGroupSection({
  disabled = false,
  group,
  isRequired = false,
  multiple = true,
  onToggle,
  selectedIds,
  tags,
}: {
  disabled?: boolean;
  group: TagGroup;
  isRequired?: boolean;
  multiple?: boolean;
  onToggle: (tag: Tag) => void;
  selectedIds: Set<string>;
  tags: Tag[];
}) {
  if (tags.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{getTagGroupLabel(group)}</h4>
          {isRequired && (
            <span className={`
              rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning
            `}>
              必选
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {multiple ? "多选" : "单选"}
        </span>
      </div>
      <div className="grid gap-2">
        {tags.map((tag) => {
          const selected = selectedIds.has(tag.id);
          const canSelect = tag.isActive && tag.isSelectable && !disabled;
          return (
            <Button
              key={tag.id}
              type="button"
              variant="outline"
              className={cn(
                `
                  h-auto justify-start rounded-[10px] border-border bg-card px-3
                  py-2 text-left text-sm
                `,
                selected && "border-primary bg-primary/10 text-primary",
                !tag.isActive && "border-slate-200 bg-slate-100 text-slate-500",
              )}
              disabled={!canSelect}
              onClick={() => onToggle(tag)}
            >
              <span
                className="mr-2 shrink-0 text-muted-foreground"
                style={{ width: Math.max(tag.level, 0) * 12 }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{tag.name}</span>
                  {tag.isSystem && (
                    <span className={`
                      rounded-full bg-muted px-1.5 py-0.5 text-[11px]
                      text-muted-foreground
                    `}>
                      系统
                    </span>
                  )}
                  {!tag.isActive && (
                    <span className={`
                      rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px]
                      text-slate-500
                    `}>
                      已禁用
                    </span>
                  )}
                  {!tag.isSelectable && (
                    <LockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
                {tag.description && (
                  <span className={`
                    mt-1 line-clamp-1 block text-xs text-muted-foreground
                  `}>
                    {tag.description}
                  </span>
                )}
              </span>
              {selected && <CheckIcon className="ml-2 h-4 w-4 shrink-0" />}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
