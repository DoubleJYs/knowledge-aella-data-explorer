import type { TagGroup } from "~/types/tags";
import { cn } from "~/ui";
import {
  BarChart3Icon,
  BookOpenIcon,
  BoxesIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileTextIcon,
  FlaskConicalIcon,
  FolderIcon,
  GraduationCapIcon,
  LayersIcon,
  MessageSquareTextIcon,
  NetworkIcon,
  TagIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type TagGroupOption = {
  description: string;
  icon: ReactNode;
  label: string;
  value: TagGroup;
};

export const TAG_GROUP_OPTIONS: TagGroupOption[] = [
  {
    description: "论文、笔记、项目资料等资料类型",
    icon: <FileTextIcon className="h-4 w-4" />,
    label: "内容类型",
    value: "content_type",
  },
  {
    description: "一级学科和研究方向归属",
    icon: <NetworkIcon className="h-4 w-4" />,
    label: "学科领域",
    value: "academic_domain",
  },
  {
    description: "多级研究主题树",
    icon: <LayersIcon className="h-4 w-4" />,
    label: "研究主题",
    value: "research_topic",
  },
  {
    description: "个人、公共、合作单位等来源",
    icon: <DatabaseIcon className="h-4 w-4" />,
    label: "数据来源",
    value: "data_origin",
  },
  {
    description: "文本、图像、网络流量等模态",
    icon: <BoxesIcon className="h-4 w-4" />,
    label: "数据模态",
    value: "data_modality",
  },
  {
    description: "训练集、测试集、基准数据集",
    icon: <BarChart3Icon className="h-4 w-4" />,
    label: "数据集类型",
    value: "dataset_type",
  },
  {
    description: "组会、项目会、外部合作会",
    icon: <MessageSquareTextIcon className="h-4 w-4" />,
    label: "会议类型",
    value: "meeting_type",
  },
  {
    description: "个人周报、项目周报、风险问题",
    icon: <ClipboardListIcon className="h-4 w-4" />,
    label: "周报类型",
    value: "report_type",
  },
  {
    description: "训练、评测、攻击、防御实验",
    icon: <FlaskConicalIcon className="h-4 w-4" />,
    label: "实验类型",
    value: "experiment_type",
  },
  {
    description: "方案、接口、测试、验收材料",
    icon: <FolderIcon className="h-4 w-4" />,
    label: "项目资料类型",
    value: "project_type",
  },
  {
    description: "课件、作业、实验指导和项目",
    icon: <GraduationCapIcon className="h-4 w-4" />,
    label: "课程材料类型",
    value: "course_type",
  },
  {
    description: "审核、发布等状态辅助标签",
    icon: <BookOpenIcon className="h-4 w-4" />,
    label: "状态标签",
    value: "status",
  },
  {
    description: "后台手动维护的扩展标签",
    icon: <TagIcon className="h-4 w-4" />,
    label: "自定义标签",
    value: "custom",
  },
];

export function getTagGroupLabel(tagGroup: TagGroup) {
  return (
    TAG_GROUP_OPTIONS.find((option) => option.value === tagGroup)?.label ??
    tagGroup
  );
}

export function TagGroupSidebar({
  activeGroup,
  countsByGroup,
  onChange,
}: {
  activeGroup: TagGroup;
  countsByGroup: Record<TagGroup, number>;
  onChange: (group: TagGroup) => void;
}) {
  return (
    <div className="space-y-2">
      {TAG_GROUP_OPTIONS.map((option) => {
        const active = option.value === activeGroup;
        return (
          <button
            key={option.value}
            type="button"
            aria-current={active ? "page" : undefined}
            className={cn(
              `
                flex w-full items-start gap-3 rounded-[6px] border px-3 py-3
                text-left transition-colors
              `,
              active
                ? `
                  border-cyan-300/70 bg-cyan-500/15 text-cyan-50
                  shadow-[inset_0_0_18px_rgba(14,165,233,0.12)]
                `
                : `
                  border-cyan-400/15 bg-cyan-950/10 text-cyan-100/72

                  hover:border-cyan-300/45 hover:bg-cyan-500/10
                `,
            )}
            onClick={() => onChange(option.value)}
            title={`打开${option.label}标签页`}
          >
            <span
              className={cn(
                `
                  mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center
                  rounded-[6px] border
                `,
                active
                  ? "border-cyan-200/70 bg-cyan-400/15 text-cyan-100"
                  : "border-cyan-500/20 bg-cyan-950/30 text-cyan-200/65",
              )}
            >
              {option.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold">
                  {option.label}
                </span>
                <span className={`
                  rounded-full border border-cyan-400/25 px-2 py-0.5 text-xs
                  text-cyan-100/65
                `}>
                  {countsByGroup[option.value]}
                </span>
              </span>
              <span className="mt-1 line-clamp-2 block text-xs text-cyan-100/45">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TagGroupTabs({
  activeGroup,
  countsByGroup,
  onChange,
}: {
  activeGroup: TagGroup;
  countsByGroup: Record<TagGroup, number>;
  onChange: (group: TagGroup) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_GROUP_OPTIONS.map((option) => {
        const active = option.value === activeGroup;
        return (
          <button
            key={option.value}
            type="button"
            aria-current={active ? "page" : undefined}
            className={cn(
              `
                inline-flex h-9 items-center gap-2 rounded-full border px-3
                text-xs font-medium transition-colors
              `,
              active
                ? `
                  border-cyan-200/80 bg-cyan-400/18 text-cyan-50
                  shadow-[0_0_18px_rgba(14,165,233,0.18)]
                `
                : `
                  border-cyan-400/20 bg-cyan-950/25 text-cyan-100/65

                  hover:border-cyan-300/55 hover:bg-cyan-500/10
                  hover:text-cyan-50
                `,
            )}
            onClick={() => onChange(option.value)}
            title={`打开${option.label}标签页`}
          >
            <span className="flex h-4 w-4 items-center justify-center">
              {option.icon}
            </span>
            <span>{option.label}</span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[11px]",
                active
                  ? "border-cyan-100/40 text-cyan-50"
                  : "border-cyan-400/25 text-cyan-100/55",
              )}
            >
              {countsByGroup[option.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
