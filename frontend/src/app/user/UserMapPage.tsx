import {
  KnowledgeMapCanvas,
  knowledgeMapAxisDomains,
} from "~/components/KnowledgeMapCanvas";
import type {
  KnowledgeMapAxisNode,
  KnowledgeMapTimeAxisLevel,
  KnowledgeMapTimeAxisRange,
} from "~/components/KnowledgeMapCanvas";
import {
  getItemTypeLabel,
  getSourceTypeLabel,
} from "~/components/review/KnowledgeItemForm";
import {
  KnowledgeNodeDetailPanel,
  KnowledgeNodeDetailStrip,
} from "~/components/map/KnowledgeNodeDetailPanel";
import type { DetailTagSection } from "~/components/map/DetailTagsPanel";
import { Button } from "~/components/ui/Button";
import { EmptyState } from "~/components/ui/EmptyState";
import { ErrorState } from "~/components/ui/ErrorState";
import { LoadingState } from "~/components/ui/LoadingState";
import type {
  ItemType,
  KnowledgeItem,
  KnowledgeMapPoint,
  KnowledgeMapResponse,
  RelatedKnowledgeItem,
} from "~/types/knowledge";
import type { Tag, TagGroup, TagNode } from "~/types/tags";
import { cn } from "~/ui";
import {
  fetchPublishedKnowledgeItem,
  fetchRelatedPublishedItems,
  fetchSimilarPublishedItems,
  fetchUserKnowledgeMap,
} from "~/utils/userKnowledgeApi";
import { getActiveTagTree } from "~/utils/userTagApi";
import {
  BeakerIcon,
  BookOpenIcon,
  BoxIcon,
  BrainCircuitIcon,
  BugIcon,
  CalendarDaysIcon,
  ChartNetworkIcon,
  DatabaseIcon,
  DatabaseZapIcon,
  FileTextIcon,
  FlaskConicalIcon,
  FolderIcon,
  GraduationCapIcon,
  KeyRoundIcon,
  InboxIcon,
  LayersIcon,
  MoreHorizontalIcon,
  NetworkIcon,
  RadarIcon,
  SearchIcon,
  UploadCloudIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_KNOWLEDGE_BASE_ID = "default";

const MAP_TAG_FILTER_GROUPS: TagGroup[] = [
  "content_type",
  "academic_domain",
  "research_topic",
  "data_origin",
  "data_modality",
];

const DETAIL_TAG_GROUPS: TagGroup[] = [
  "content_type",
  "academic_domain",
  "research_topic",
  "data_origin",
  "data_modality",
];

const MAP_TAG_GROUP_LABELS: Record<TagGroup, string> = {
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

const publicMapAxisIcons: Record<string, ReactNode> = {
  ai_security: <BrainCircuitIcon className="h-3.5 w-3.5" />,
  cyberspace_security: <ChartNetworkIcon className="h-3.5 w-3.5" />,
  cryptography: <KeyRoundIcon className="h-3.5 w-3.5" />,
  data_privacy: <DatabaseZapIcon className="h-3.5 w-3.5" />,
  network_communication: <NetworkIcon className="h-3.5 w-3.5" />,
  research_engineering: <LayersIcon className="h-3.5 w-3.5" />,
  software_system_security: <BugIcon className="h-3.5 w-3.5" />,
  threat_response: <RadarIcon className="h-3.5 w-3.5" />,
};

const DEFAULT_CONTENT_TYPE_SLUG = "paper";

const DEFAULT_CONTENT_TYPE_LABELS: { name: string; slug: string }[] = [
  { name: "论文", slug: "paper" },
  { name: "实验数据", slug: "experiment-data" },
  { name: "会议记录", slug: "meeting-record" },
  { name: "周报", slug: "weekly-report" },
  { name: "实验记录", slug: "experiment-record" },
  { name: "阅读笔记", slug: "reading-note" },
  { name: "项目资料", slug: "project-document" },
  { name: "课程材料", slug: "course-material" },
  { name: "其他", slug: "other" },
];

const CONTENT_TYPE_AXIS_GROUP_BY_SLUG: Record<string, TagGroup> = {
  "course-material": "course_type",
  "experiment-data": "dataset_type",
  "experiment-record": "experiment_type",
  "meeting-record": "meeting_type",
  other: "custom",
  paper: "research_topic",
  "project-document": "project_type",
  "reading-note": "research_topic",
  "weekly-report": "report_type",
};

const CONTENT_TYPE_ITEM_TYPE_BY_SLUG: Record<string, ItemType[]> = {
  "course-material": ["course_material"],
  "experiment-record": ["experiment_record"],
  other: ["other"],
  paper: ["paper"],
  "project-document": ["project_doc"],
  "reading-note": ["note"],
};

const TAG_AXIS_COLORS = [
  "#60a5fa",
  "#2dd4bf",
  "#a78bfa",
  "#38bdf8",
  "#34d399",
  "#f472b6",
  "#f59e0b",
  "#94a3b8",
];

const contentTypeIcons: Record<string, ReactNode> = {
  "course-material": <GraduationCapIcon className="h-3.5 w-3.5" />,
  "experiment-data": <DatabaseIcon className="h-3.5 w-3.5" />,
  "experiment-record": <FlaskConicalIcon className="h-3.5 w-3.5" />,
  "meeting-record": <CalendarDaysIcon className="h-3.5 w-3.5" />,
  other: <MoreHorizontalIcon className="h-3.5 w-3.5" />,
  paper: <FileTextIcon className="h-3.5 w-3.5" />,
  "project-document": <FolderIcon className="h-3.5 w-3.5" />,
  "reading-note": <BookOpenIcon className="h-3.5 w-3.5" />,
  "weekly-report": <FileTextIcon className="h-3.5 w-3.5" />,
};

function createFallbackContentTypeTag(
  option: { name: string; slug: string },
  sortOrder: number,
): Tag {
  return {
    createdAt: "",
    description: null,
    id: `fallback-content-type-${option.slug}`,
    isActive: true,
    isSelectable: true,
    isSystem: true,
    level: 0,
    name: option.name,
    parentId: null,
    path: option.slug,
    slug: option.slug,
    sortOrder,
    synonyms: [],
    tagGroup: "content_type",
    updatedAt: "",
  };
}

const fallbackContentTypeTags = DEFAULT_CONTENT_TYPE_LABELS.map(
  createFallbackContentTypeTag,
);

type TimeAxisState = KnowledgeMapTimeAxisRange & {
  level: KnowledgeMapTimeAxisLevel;
};

type TimeAxisNode = {
  count: number;
  id: string;
  label: string;
  range: KnowledgeMapTimeAxisRange;
};

const initialTimeAxisState: TimeAxisState = { level: "year" };

function getPointPublishedDate(point: KnowledgeMapPoint) {
  if (point.published_at) {
    const date = new Date(point.published_at);
    if (!Number.isNaN(date.getTime())) return date;
  }

  if (typeof point.year === "number") return new Date(point.year, 0, 1);
  return null;
}

function getWeekOfMonth(date: Date) {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

function getTimeAxisNodeId(
  level: KnowledgeMapTimeAxisLevel,
  range: KnowledgeMapTimeAxisRange,
) {
  if (level === "year") return range.year ? `year-${range.year}` : null;
  if (level === "month" && range.year && range.month) {
    return `month-${range.year}-${range.month}`;
  }
  if (level === "week" && range.year && range.month && range.week) {
    return `week-${range.year}-${range.month}-${range.week}`;
  }
  if (
    level === "day" &&
    range.year &&
    range.month &&
    range.week &&
    range.day
  ) {
    return `day-${range.year}-${range.month}-${range.week}-${range.day}`;
  }
  return null;
}

function countTimeAxisNode(
  counts: Map<string, number>,
  id: string,
  label: string,
  range: KnowledgeMapTimeAxisRange,
) {
  return {
    count: counts.get(id) ?? 0,
    id,
    label,
    range,
  };
}

function buildTimeAxisNodes(points: KnowledgeMapPoint[], state: TimeAxisState) {
  const dates = points
    .map((point) => getPointPublishedDate(point))
    .filter((date): date is Date => Boolean(date));

  if (state.level === "month" && state.year) {
    const counts = new Map<string, number>();
    for (const date of dates) {
      if (date.getFullYear() !== state.year) continue;
      const month = date.getMonth() + 1;
      const id = `month-${state.year}-${month}`;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return Array.from({ length: 12 }, (_, index) => 12 - index)
      .map((month) =>
        countTimeAxisNode(counts, `month-${state.year}-${month}`, `${month}月`, {
          month,
          year: state.year,
        }),
      )
      .filter((node) => node.count > 0 || node.range.month === state.month);
  }

  if (state.level === "week" && state.year && state.month) {
    const counts = new Map<string, number>();
    for (const date of dates) {
      if (
        date.getFullYear() !== state.year ||
        date.getMonth() + 1 !== state.month
      ) {
        continue;
      }
      const week = getWeekOfMonth(date);
      const id = `week-${state.year}-${state.month}-${week}`;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return Array.from({ length: 5 }, (_, index) => 5 - index)
      .map((week) =>
        countTimeAxisNode(
          counts,
          `week-${state.year}-${state.month}-${week}`,
          `第${week}周`,
          { month: state.month, week, year: state.year },
        ),
      )
      .filter((node) => node.count > 0 || node.range.week === state.week);
  }

  if (state.level === "day" && state.year && state.month && state.week) {
    const counts = new Map<string, number>();
    for (const date of dates) {
      if (
        date.getFullYear() !== state.year ||
        date.getMonth() + 1 !== state.month ||
        getWeekOfMonth(date) !== state.week
      ) {
        continue;
      }
      const day = date.getDate();
      const id = `day-${state.year}-${state.month}-${state.week}-${day}`;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([id, count]) => {
        const idParts = id.split("-");
        const day = Number(idParts[idParts.length - 1]);
        return {
          count,
          id,
          label: `${day}日`,
          range: {
            day,
            month: state.month,
            week: state.week,
            year: state.year,
          },
        };
      })
      .sort((first, second) => second.range.day - first.range.day);
  }

  const counts = new Map<number, number>();
  for (const date of dates) {
    const year = date.getFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([firstYear], [secondYear]) => secondYear - firstYear)
    .map(([year, count]) => ({
      count,
      id: `year-${year}`,
      label: String(year),
      range: { year },
    }));
}

function pointMatchesTimeAxis(point: KnowledgeMapPoint, state: TimeAxisState) {
  const date = getPointPublishedDate(point);
  if (!date) return true;

  if (state.year && date.getFullYear() !== state.year) return false;
  if (state.month && date.getMonth() + 1 !== state.month) return false;
  if (state.week && getWeekOfMonth(date) !== state.week) return false;
  if (state.day && date.getDate() !== state.day) return false;

  return true;
}

function getTimeAxisSummary(state: TimeAxisState) {
  if (!state.year) return "";
  if (state.day && state.month) {
    return `${state.year}年${state.month}月${state.day}日`;
  }
  if (state.week && state.month) {
    return `${state.year}年${state.month}月第${state.week}周`;
  }
  if (state.month) return `${state.year}年${state.month}月`;
  return `${state.year}年`;
}

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

function flattenTagTree(nodes: TagNode[]): Tag[] {
  return nodes.flatMap((node) => [node, ...flattenTagTree(node.children)]);
}

function getTagGroupLabel(tagGroup: TagGroup) {
  return MAP_TAG_GROUP_LABELS[tagGroup];
}

function normalizeTagValue(value: string) {
  return value.trim().toLowerCase();
}

function pointHasTag(point: KnowledgeMapPoint, tag: Tag) {
  const pointTagIds = new Set(point.tag_ids ?? []);
  if (pointTagIds.has(tag.id)) return true;

  const pointTagNames = new Set(point.tags.map(normalizeTagValue));
  if (pointTagNames.has(normalizeTagValue(tag.name))) return true;
  if (pointTagNames.has(normalizeTagValue(tag.slug))) return true;

  const fallbackItemTypes = CONTENT_TYPE_ITEM_TYPE_BY_SLUG[tag.slug] ?? [];
  return fallbackItemTypes.includes(point.item_type);
}

function getUniqueTagNames(tags: string[]) {
  const normalized = new Set<string>();
  const uniqueTags: string[] = [];
  for (const tag of tags) {
    const trimmedTag = tag.trim();
    if (!trimmedTag) continue;
    const normalizedTag = normalizeTagValue(trimmedTag);
    if (normalized.has(normalizedTag)) continue;
    normalized.add(normalizedTag);
    uniqueTags.push(trimmedTag);
  }
  return uniqueTags;
}

function pointMatchesSelectedTags(
  point: KnowledgeMapPoint,
  selectedTagsByGroup: Map<TagGroup, Tag[]>,
) {
  if (selectedTagsByGroup.size === 0) return true;
  const pointTagIds = new Set(point.tag_ids ?? []);
  const pointTagNames = new Set(point.tags.map(normalizeTagValue));

  for (const selectedTags of selectedTagsByGroup.values()) {
    const groupMatches = selectedTags.some((tag) => {
      if (pointTagIds.size > 0 && pointTagIds.has(tag.id)) return true;
      return pointTagNames.has(normalizeTagValue(tag.name));
    });
    if (!groupMatches) return false;
  }
  return true;
}

function getAxisNodeRawId(nodeId: string) {
  return nodeId.startsWith("tag:") ? nodeId.slice(4) : nodeId;
}

function pointMatchesAxisNode(point: KnowledgeMapPoint, axisNode: KnowledgeMapAxisNode) {
  const pointTagIds = new Set(point.tag_ids ?? []);
  const pointTagNames = new Set(point.tags.map(normalizeTagValue));

  if (pointTagIds.has(getAxisNodeRawId(axisNode.id))) return true;

  return axisNode.aliases.some((alias) => {
    const normalizedAlias = normalizeTagValue(alias);
    return pointTagIds.has(alias) || pointTagNames.has(normalizedAlias);
  });
}

function scopePointsByAxisPath(
  points: KnowledgeMapPoint[],
  axisPath: KnowledgeMapAxisNode[],
  selectedAxisNodeId: string | null,
  visibleAxisNodes: KnowledgeMapAxisNode[],
) {
  const selectedAxisNode =
    visibleAxisNodes.find((axisNode) => axisNode.id === selectedAxisNodeId) ?? null;
  const scopeNodes = [...axisPath, ...(selectedAxisNode ? [selectedAxisNode] : [])];
  if (scopeNodes.length === 0) return points;

  const scopedPoints = points.filter((point) =>
    scopeNodes.every((axisNode) => pointMatchesAxisNode(point, axisNode)),
  );
  return scopedPoints;
}

function sortDetailTags(tags: Tag[]) {
  return [...tags].sort((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }
    return first.name.localeCompare(second.name, "zh-Hans-CN");
  });
}

function sortTagsForDisplay<T extends Tag>(tags: T[]): T[] {
  return [...tags].sort((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }
    return first.name.localeCompare(second.name, "zh-Hans-CN");
  });
}

function getTagTreeRootsByGroup(tagTree: TagNode[], group: TagGroup): TagNode[] {
  return sortTagsForDisplay(tagTree.filter((tag) => tag.tagGroup === group));
}

function tagToAxisNode(
  tag: TagNode,
  index: number,
  parentColor?: string,
): KnowledgeMapAxisNode {
  const color = parentColor ?? TAG_AXIS_COLORS[index % TAG_AXIS_COLORS.length];
  return {
    aliases: [tag.id, tag.slug, tag.name, ...tag.synonyms],
    children:
      tag.children.length > 0
        ? sortTagsForDisplay(tag.children).map((child, childIndex) =>
            tagToAxisNode(child, childIndex, color),
          )
        : undefined,
    color,
    id: `tag:${tag.id}`,
    label: tag.name,
  };
}

function tagsToAxisNodes(tags: TagNode[]) {
  return sortTagsForDisplay(tags).map((tag, index) => tagToAxisNode(tag, index));
}

function findAxisNodeById(
  nodes: KnowledgeMapAxisNode[],
  nodeId: string | null,
): KnowledgeMapAxisNode | null {
  if (!nodeId) return null;
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const childMatch = findAxisNodeById(node.children ?? [], nodeId);
    if (childMatch) return childMatch;
  }
  return null;
}

function getContentTypeIcon(tag: Tag) {
  return (
    contentTypeIcons[tag.slug] ??
    contentTypeIcons[normalizeTagValue(tag.name)] ?? (
      <MoreHorizontalIcon className="h-3.5 w-3.5" />
    )
  );
}

function getDetailTagSections(
  item: KnowledgeItem | null,
  tagsById: Map<string, Tag>,
): DetailTagSection[] {
  if (!item) return [];

  const structuredTags = sortDetailTags(
    (item.tag_ids ?? [])
      .map((tagId) => tagsById.get(tagId))
      .filter((tag): tag is Tag => Boolean(tag)),
  );
  const structuredTagNames = new Set(
    structuredTags.map((tag) => normalizeTagValue(tag.name)),
  );
  const legacyTags = getUniqueTagNames(item.tags).filter(
    (tagName) => !structuredTagNames.has(normalizeTagValue(tagName)),
  );
  const sections: DetailTagSection[] = [];

  for (const group of DETAIL_TAG_GROUPS) {
    const groupTags = structuredTags.filter((tag) => tag.tagGroup === group);
    if (groupTags.length === 0) continue;
    sections.push({
      key: group,
      label: getTagGroupLabel(group),
      tags: groupTags,
    });
  }

  const otherTags = structuredTags.filter(
    (tag) => !DETAIL_TAG_GROUPS.includes(tag.tagGroup),
  );
  if (otherTags.length > 0) {
    sections.push({
      key: "other",
      label: "其他标签",
      tags: otherTags,
    });
  }

  if (legacyTags.length > 0 || sections.length === 0) {
    sections.push({
      key: "legacy",
      label: "普通标签",
      legacyTags:
        legacyTags.length > 0
          ? legacyTags
          : getUniqueTagNames(item.tags).map(toChineseDisplayText),
    });
  }

  return sections.filter(
    (section) => (section.tags?.length ?? section.legacyTags?.length ?? 0) > 0,
  );
}

function getRankLabel(point: KnowledgeMapPoint) {
  if (point.item_type === "experiment_record") return "关键记录";
  if (point.item_type === "course_material") return "教学资料";
  if (point.item_type === "project_doc") return "前 5%";
  return "前 1%";
}

function getPointSourceLine(point: KnowledgeMapPoint, item?: KnowledgeItem | null) {
  const author = item?.author ?? "知识库";
  const source =
    item?.source_name ??
    (item ? getSourceTypeLabel(item.source_type) : getItemTypeLabel(point.item_type));
  return `${toChineseDisplayText(author)} · ${toChineseDisplayText(source)}`;
}

function getPointDateLine(point: KnowledgeMapPoint, item?: KnowledgeItem | null) {
  const year = item?.year ?? point.year;
  return `发布日期：${year ?? "未知"}`;
}

function MapAxisOverlay({
  activeAxisNodeId,
  axisNodes,
  activeTimeNodeId,
  onAxisClick,
  onTimeAxisBack,
  onTimeAxisClick,
  timeAxisLevel,
  timeNodes,
}: {
  activeAxisNodeId: string | null;
  axisNodes: KnowledgeMapAxisNode[];
  activeTimeNodeId: string | null;
  onAxisClick: (node: KnowledgeMapAxisNode) => void;
  onTimeAxisBack: () => void;
  onTimeAxisClick: (node: TimeAxisNode) => void;
  timeAxisLevel: KnowledgeMapTimeAxisLevel;
  timeNodes: TimeAxisNode[];
}) {
  const timeAxisLabel =
    timeAxisLevel === "day"
      ? "日"
      : timeAxisLevel === "week"
        ? "周"
        : timeAxisLevel === "month"
          ? "月"
          : "年";

  return (
    <>
      <div className={`
        pointer-events-none absolute left-0 top-0 z-30 flex h-[calc(100%-54px)]
        w-24 flex-col gap-3 px-2 py-5 text-[11px] font-semibold
        text-[#93c5fd]/85
      `}>
        <div className="flex items-center gap-1 text-[#bfdbfe]">
          <CalendarDaysIcon className="h-3.5 w-3.5" />
          <span>时间轴 · {timeAxisLabel}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-around gap-1">
          {timeNodes.length > 0 ? (
            timeNodes.slice(0, 12).map((node) => {
              const active = activeTimeNodeId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={cn(
                    `
                      pointer-events-auto flex items-center justify-between
                      gap-1 rounded-full border px-2 py-1 text-left
                      transition-colors
                    `,
                    active
                      ? `
                        border-[#60a5fa] bg-[#2563eb]/30 text-white
                        shadow-[0_0_18px_rgba(96,165,250,0.25)]
                      `
                      : `
                        border-transparent text-[#93c5fd]/90

                        hover:border-[#60a5fa]/40 hover:bg-[#2563eb]/10
                      `,
                  )}
                  onClick={() => onTimeAxisClick(node)}
                  title={`切换时间轴：${node.label}`}
                >
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#60a5fa]" />
                    <span>{node.label}</span>
                  </span>
                  <span className="text-[10px] text-[#93c5fd]/70">{node.count}</span>
                </button>
              );
            })
          ) : (
            <span className="text-[#64748b]">暂无时间</span>
          )}
        </div>
        {timeAxisLevel !== "year" ? (
          <button
            type="button"
            className={`
              pointer-events-auto rounded-full border border-[#334155]/80 px-2
              py-1 text-[#93c5fd]/90 transition-colors

              hover:border-[#60a5fa]/60 hover:text-white
            `}
            onClick={onTimeAxisBack}
          >
            返回上级
          </button>
        ) : (
          <span className="text-[#64748b]">更早</span>
        )}
      </div>
      <div
        className={`
          absolute bottom-0 left-0 right-0 h-[58px] border-t border-[#334155]/70
          bg-[#0f172a]/92
        `}
      >
        <div className={`
          pointer-events-none absolute inset-x-0 top-3 mx-auto h-3 max-w-[640px]
          opacity-45

          [background-image:repeating-linear-gradient(90deg,rgba(147,197,253,0.7)_0_1px,transparent_1px_8px)]
        `} />
        <div className={`
          pointer-events-none absolute inset-x-0 top-3 mx-auto h-5 max-w-[640px]
          opacity-55

          [background-image:repeating-linear-gradient(90deg,rgba(147,197,253,0.9)_0_1px,transparent_1px_40px)]
        `} />
        <div className={`
          relative z-10 mx-auto flex h-full max-w-[980px] items-center
          justify-between gap-2 px-6 text-[10px] font-semibold text-[#93c5fd]/90
        `}>
          {axisNodes.map((domain) => {
            const active = activeAxisNodeId === domain.id;
            const canDrill = Boolean(domain.children?.length);
            const icon =
              publicMapAxisIcons[domain.id] ?? (
                <LayersIcon className="h-3.5 w-3.5" />
              );
            return (
              <button
                key={domain.id}
                type="button"
                className={cn(
                  "pointer-events-auto flex flex-col items-center gap-1",
                  `
                    transition-opacity

                    hover:opacity-100
                  `,
                  active ? "opacity-100" : "opacity-90",
                )}
                onClick={() => onAxisClick(domain)}
                title={canDrill ? `展开${domain.label}的子标签` : `突出显示：${domain.label}`}
              >
              <span className="text-[#60a5fa]">▼</span>
                <span
                  className={cn(
                    `
                      flex items-center gap-1 rounded-full border px-2 py-0.5
                      transition-colors
                    `,
                    active
                      ? `
                        border-[#60a5fa] bg-[#2563eb]/30 text-white
                        shadow-[0_0_24px_rgba(96,165,250,0.25)]
                      `
                      : `border-[#334155]/80 bg-[#111827]/80 text-[#93c5fd]/90`,
                  )}
                  style={{
                    borderColor: active ? domain.color : undefined,
                    boxShadow: active
                      ? `0 0 24px ${domain.color}45`
                      : undefined,
                  }}
                >
                {icon}
                {domain.label}
              </span>
              <span className="h-2 w-px bg-[#60a5fa]/45" />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function CategoryButton({
  active,
  children,
  count,
  icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  count: number;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        `
          inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs
          font-semibold transition-colors
        `,
        active
          ? "border-[#60a5fa]/80 bg-[#2563eb]/15 text-[#bfdbfe]"
          : `
            border-[#2c313b] bg-[#151820] text-stone-500 opacity-55

            hover:border-[#60a5fa]/45 hover:text-stone-100 hover:opacity-100
          `,
      )}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
      <span className={`
        rounded-full bg-white/5 px-1.5 text-[10px] text-stone-400
      `}>
        {count}
      </span>
    </button>
  );
}

function TagFilterPanel({
  error,
  groups,
  loading,
  onClear,
  onToggle,
  selectedTagIds,
  tagCounts,
  tagsByGroup,
}: {
  error: string | null;
  groups: TagGroup[];
  loading: boolean;
  onClear: () => void;
  onToggle: (tagId: string) => void;
  selectedTagIds: string[];
  tagCounts: Map<string, number>;
  tagsByGroup: Map<TagGroup, Tag[]>;
}) {
  const hasSelectedTags = selectedTagIds.length > 0;

  return (
    <aside className={`
      border-b border-[#292e37] bg-[#11141a] p-5

      lg:border-b-0 lg:border-r
    `}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-stone-100">标签筛选</div>
          <div className="mt-1 text-xs text-stone-500">
            内容类型、学科领域、研究主题
          </div>
        </div>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={!hasSelectedTags}
          onClick={onClear}
        >
          清空
        </Button>
      </div>

      {loading ? (
        <LoadingState
          className="border-[#2c313b] bg-[#151820]"
          label="正在加载标签..."
          rows={4}
        />
      ) : error ? (
        <ErrorState
          className="border-[#2c313b] bg-[#151820]"
          title="标签筛选加载失败"
          description={error}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const tags = tagsByGroup.get(group) ?? [];
            if (tags.length === 0) return null;
            return (
              <section key={group} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold text-stone-300">
                    {getTagGroupLabel(group)}
                  </h3>
                  <span className="text-[11px] text-stone-600">
                    {tags.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={cn(
                          `
                            inline-flex max-w-full items-center gap-1.5
                            rounded-full border px-2.5 py-1 text-xs
                            transition-colors
                          `,
                          selected
                            ? `
                              border-[#60a5fa]/75 bg-[#2563eb]/20 text-[#bfdbfe]
                            `
                            : `
                              border-[#303640] bg-[#151820] text-stone-400

                              hover:border-[#60a5fa]/45 hover:text-stone-200
                            `,
                        )}
                        onClick={() => onToggle(tag.id)}
                      >
                        <span className="truncate">{tag.name}</span>
                        <span className={`
                          rounded-full bg-white/5 px-1.5 text-[10px]
                          text-stone-500
                        `}>
                          {tagCounts.get(tag.id) ?? 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function DataCard({
  item,
  onClick,
  point,
  selected,
  showTags = true,
}: {
  item?: KnowledgeItem | null;
  onClick: () => void;
  point: KnowledgeMapPoint;
  selected: boolean;
  showTags?: boolean;
}) {
  const tags = item?.tags.length ? item.tags : point.tags;
  const summary =
    item?.summary ??
    point.summary_preview ??
    "该科研资料已经完成审核并发布到知识地图。点击条目可查看元数据、来源详情和相似资料。";

  const scoreLabel = getRankLabel(point);

  return (
    <button
      type="button"
      className={cn(
        `
          block w-full border-b border-[#292e37] px-8 py-6 text-left
          transition-colors

          hover:bg-white/[0.035]

          last:border-b-0
        `,
        selected && "bg-[#181b22] shadow-[inset_3px_0_0_#60a5fa]",
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className={`
            mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold
          `}>
            <span className={`
              rounded-[4px] border border-[#60a5fa]/70 px-2 py-0.5
              text-[#93c5fd]
            `}>
              已发布
            </span>
            <span className="text-slate-500">
              {toChineseDisplayText(point.cluster_label) || "通用研究"} /{" "}
              {getItemTypeLabel(point.item_type)}
            </span>
          </div>
          <h2 className={`
            max-w-4xl text-xl font-bold leading-snug text-stone-100
          `}>
            {toChineseDisplayText(point.title)}
          </h2>
          <p className={`
            mt-4 line-clamp-3 max-w-5xl text-[15px] leading-7 text-stone-400
          `}>
            ↳ {toChineseDisplayText(summary)}
          </p>
          {showTags && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className={`
                    rounded-[4px] border border-[#303640] bg-[#11141a] px-2.5
                    py-1 text-xs font-medium text-stone-500
                  `}
                >
                  {toChineseDisplayText(tag)}
                </span>
              ))}
            </div>
          )}
          <div className={`
            mt-6 flex flex-wrap items-center justify-between gap-3 border-t
            border-[#292e37]/70 pt-4 text-xs font-semibold text-stone-500
          `}>
            <span>{getPointSourceLine(point, item)}</span>
            <span className="tracking-[0.08em] text-stone-400">
              {getPointDateLine(point, item)}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "mt-9 shrink-0 rounded-[6px] px-3 py-1 text-xs font-bold",
            scoreLabel.includes("%")
              ? "bg-emerald-400 text-[#101318]"
              : "border border-[#60a5fa]/45 bg-[#2563eb]/20 text-[#bfdbfe]",
          )}
        >
          {scoreLabel}
        </span>
      </div>
    </button>
  );
}

export function UserMapPage({
  initialContentTypeSlug,
  navigate,
  onContentTypeChange,
  publicScreen = false,
}: {
  initialContentTypeSlug?: string | null;
  navigate: (path: string) => void;
  onContentTypeChange?: (contentTypeSlug: string) => void;
  publicScreen?: boolean;
}) {
  const [mapData, setMapData] = useState<KnowledgeMapResponse>({
    clusters: [],
    points: [],
  });
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [similarItems, setSimilarItems] = useState<KnowledgeItem[]>([]);
  const [relatedItems, setRelatedItems] = useState<RelatedKnowledgeItem[]>([]);
  const [highlightedPointIds, setHighlightedPointIds] = useState<string[]>([]);
  const [tagTree, setTagTree] = useState<TagNode[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedContentTypeSlug, setSelectedContentTypeSlug] = useState(
    initialContentTypeSlug ?? DEFAULT_CONTENT_TYPE_SLUG,
  );
  const [selectedAxisNodeId, setSelectedAxisNodeId] = useState<string | null>(null);
  const [axisDrillPath, setAxisDrillPath] = useState<KnowledgeMapAxisNode[]>([]);
  const [timeAxisState, setTimeAxisState] =
    useState<TimeAxisState>(initialTimeAxisState);
  const selectedDetailRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const loadMap = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchUserKnowledgeMap({
      knowledgeBaseId: DEFAULT_KNOWLEDGE_BASE_ID,
      q: query,
    })
      .then((data) => {
        setMapData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [query]);

  useEffect(loadMap, [loadMap]);

  useEffect(() => {
    setTagLoading(true);
    setTagError(null);
    getActiveTagTree()
      .then((tree) => {
        setTagTree(tree);
        setTagLoading(false);
      })
      .catch((err: Error) => {
        setTagError(err.message);
        setTagLoading(false);
      });
  }, []);

  useEffect(() => {
    setSelectedContentTypeSlug(
      initialContentTypeSlug ?? DEFAULT_CONTENT_TYPE_SLUG,
    );
    setSelectedAxisNodeId(null);
    setAxisDrillPath([]);
  }, [initialContentTypeSlug]);

  useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      setSimilarItems([]);
      setRelatedItems([]);
      setHighlightedPointIds([]);
      return;
    }
    Promise.all([
      fetchPublishedKnowledgeItem(selectedItemId),
      fetchSimilarPublishedItems(selectedItemId),
      fetchRelatedPublishedItems(selectedItemId).catch(() => ({ items: [] })),
    ])
      .then(([item, similar, related]) => {
        setSelectedItem(item);
        setSimilarItems(similar.items);
        setRelatedItems(related.items);
        setHighlightedPointIds([]);
      })
      .catch((err: Error) => setError(err.message));
  }, [selectedItemId]);

  useEffect(() => {
    if (!selectedItem) return;
    if (window.matchMedia("(min-width: 1280px)").matches) return;
    selectedDetailRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedItem]);

  const allTags = useMemo(() => flattenTagTree(tagTree), [tagTree]);

  const filterTags = useMemo(
    () =>
      allTags.filter((tag) => MAP_TAG_FILTER_GROUPS.includes(tag.tagGroup)),
    [allTags],
  );

  const tagById = useMemo(
    () => new Map(allTags.map((tag) => [tag.id, tag])),
    [allTags],
  );

  const selectedTags = useMemo(() => {
    return selectedTagIds
      .map((tagId) => tagById.get(tagId))
      .filter((tag): tag is Tag => Boolean(tag));
  }, [selectedTagIds, tagById]);

  const selectedTagsByGroup = useMemo(() => {
    const grouped = new Map<TagGroup, Tag[]>();
    for (const tag of selectedTags) {
      grouped.set(tag.tagGroup, [...(grouped.get(tag.tagGroup) ?? []), tag]);
    }
    return grouped;
  }, [selectedTags]);

  const tagsByGroup = useMemo(() => {
    const grouped = new Map<TagGroup, Tag[]>();
    for (const group of MAP_TAG_FILTER_GROUPS) grouped.set(group, []);
    for (const tag of filterTags) {
      grouped.set(tag.tagGroup, [...(grouped.get(tag.tagGroup) ?? []), tag]);
    }
    return grouped;
  }, [filterTags]);

  const publishedPoints = useMemo(
    () =>
      mapData.points.filter((point) => point.review_status === "published"),
    [mapData.points],
  );

  const fetchedContentTypeTags = useMemo(
    () =>
      sortTagsForDisplay(
        allTags.filter((tag) => tag.tagGroup === "content_type" && tag.isSelectable),
      ),
    [allTags],
  );
  const contentTypeTags =
    fetchedContentTypeTags.length > 0
      ? fetchedContentTypeTags
      : fallbackContentTypeTags;
  const selectedContentTypeTag =
    contentTypeTags.find((tag) => tag.slug === selectedContentTypeSlug) ??
    contentTypeTags[0];
  const selectedContentTypeAxisGroup =
    CONTENT_TYPE_AXIS_GROUP_BY_SLUG[selectedContentTypeTag.slug] ??
    "academic_domain";
  const selectedContentTypeAxisTags = getTagTreeRootsByGroup(
    tagTree,
    selectedContentTypeAxisGroup,
  );
  const publicAxisRootNodes = selectedContentTypeAxisTags.length
    ? tagsToAxisNodes(selectedContentTypeAxisTags)
    : knowledgeMapAxisDomains;
  const currentAxisParent =
    axisDrillPath.length > 0 ? axisDrillPath[axisDrillPath.length - 1] : null;
  const currentAxisChildren = currentAxisParent?.children ?? [];
  const publicAxisNodes =
    currentAxisChildren.length > 0
      ? currentAxisChildren
      : publicAxisRootNodes;
  const publicAxisLabel =
    selectedContentTypeAxisTags.length > 0
      ? getTagGroupLabel(selectedContentTypeAxisGroup)
      : "学科领域";
  const selectedAxisNode = findAxisNodeById(publicAxisRootNodes, selectedAxisNodeId);

  const baseDisplayedPoints = useMemo(
    () =>
      publishedPoints.filter((point) => {
        if (publicScreen) {
          return pointHasTag(point, selectedContentTypeTag);
        }
        return pointMatchesSelectedTags(point, selectedTagsByGroup);
      }),
    [
      publicScreen,
      publishedPoints,
      selectedContentTypeTag,
      selectedTagsByGroup,
    ],
  );

  const axisScopedPoints = useMemo(
    () =>
      scopePointsByAxisPath(
        baseDisplayedPoints,
        axisDrillPath,
        selectedAxisNodeId,
        publicAxisNodes,
      ),
    [axisDrillPath, baseDisplayedPoints, publicAxisNodes, selectedAxisNodeId],
  );
  const timeAxisNodes = useMemo(
    () => buildTimeAxisNodes(axisScopedPoints, timeAxisState),
    [axisScopedPoints, timeAxisState],
  );
  const activeTimeNodeId = getTimeAxisNodeId(timeAxisState.level, timeAxisState);
  const timeAxisSummary = getTimeAxisSummary(timeAxisState);
  const displayedPoints = useMemo(
    () =>
      axisScopedPoints.filter((point) =>
        pointMatchesTimeAxis(point, timeAxisState),
      ),
    [axisScopedPoints, timeAxisState],
  );

  const contentTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    contentTypeTags.forEach((tag) => counts.set(tag.id, 0));
    publishedPoints.forEach((point) => {
      contentTypeTags.forEach((tag) => {
        if (pointHasTag(point, tag)) {
          counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
        }
      });
    });
    return counts;
  }, [contentTypeTags, publishedPoints]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filterTags.forEach((tag) => counts.set(tag.id, 0));
    for (const point of publishedPoints) {
      const pointTagIds = new Set(point.tag_ids ?? []);
      const pointTagNames = new Set(point.tags.map(normalizeTagValue));
      for (const tag of filterTags) {
        const matchesById = pointTagIds.size > 0 && pointTagIds.has(tag.id);
        const matchesByName = pointTagNames.has(normalizeTagValue(tag.name));
        if (matchesById || matchesByName) {
          counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [filterTags, publishedPoints]);

  const localizedPoints = useMemo<KnowledgeMapPoint[]>(
    () =>
      displayedPoints.map((point) => ({
        ...point,
        cluster_label: toChineseDisplayText(point.cluster_label) || null,
        summary_preview: toChineseDisplayText(point.summary_preview) || null,
        tags: point.tags.map(toChineseDisplayText),
        title: toChineseDisplayText(point.title),
      })),
    [displayedPoints],
  );

  const listPoints = useMemo(() => {
    return [...localizedPoints].sort((a, b) => {
      const bYear = b.year ?? 0;
      const aYear = a.year ?? 0;
      if (bYear !== aYear) return bYear - aYear;
      return b.id.localeCompare(a.id);
    });
  }, [localizedPoints]);

  const currentCategoryLabel = selectedContentTypeTag.name;
  const publicAxisSummary = [
    ...axisDrillPath.map((axisNode) => axisNode.label),
    ...(selectedAxisNode ? [selectedAxisNode.label] : []),
  ].join(" / ");
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const hasTagFilters = !publicScreen && selectedTagIds.length > 0;
  const filterSummary = selectedTags
    .map((tag) => `${getTagGroupLabel(tag.tagGroup)}：${tag.name}`)
    .join(" / ");
  const detailTagSections = useMemo(
    () => getDetailTagSections(selectedItem, tagById),
    [selectedItem, tagById],
  );
  const clearSelection = () => {
    setSelectedItemId(null);
    setSelectedItem(null);
    setSimilarItems([]);
    setRelatedItems([]);
    setHighlightedPointIds([]);
  };

  useEffect(() => {
    if (
      selectedItemId &&
      !displayedPoints.some((point) => point.id === selectedItemId)
    ) {
      clearSelection();
    }
  }, [displayedPoints, selectedItemId]);

  const resetFilters = () => {
    setQuery("");
    setSelectedContentTypeSlug(DEFAULT_CONTENT_TYPE_SLUG);
    onContentTypeChange?.(DEFAULT_CONTENT_TYPE_SLUG);
    setSelectedTagIds([]);
    setSelectedAxisNodeId(null);
    setAxisDrillPath([]);
    setTimeAxisState(initialTimeAxisState);
    clearSelection();
  };
  const clearSearch = () => {
    setQuery("");
    clearSelection();
  };
  const clearTagFilters = () => {
    setSelectedTagIds([]);
    clearSelection();
  };
  const selectStructuredTagFilter = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current : [...current, tagId],
    );
  };
  const searchLegacyTag = (tagName: string) => {
    setQuery(tagName);
  };
  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((currentId) => currentId !== tagId)
        : [...current, tagId],
    );
    clearSelection();
  };
  const selectPublicAxisNode = (axisNode: KnowledgeMapAxisNode) => {
    if (axisNode.children?.length && axisDrillPath.length < 3) {
      setAxisDrillPath((current) => [...current, axisNode]);
      setSelectedAxisNodeId(null);
      clearSelection();
      return;
    }

    setSelectedAxisNodeId((current) =>
      current === axisNode.id ? null : axisNode.id,
    );
    clearSelection();
  };
  const stepBackAxis = () => {
    setAxisDrillPath((current) => current.slice(0, -1));
    setSelectedAxisNodeId(null);
    clearSelection();
  };
  const selectTimeAxisNode = (node: TimeAxisNode) => {
    setTimeAxisState((current) => {
      if (current.level === "year") {
        return { level: "month", year: node.range.year };
      }

      if (current.level === "month") {
        if (selectedContentTypeTag.slug === "paper") {
          return {
            level: "month",
            month: node.range.month,
            year: node.range.year,
          };
        }
        return {
          level: "week",
          month: node.range.month,
          year: node.range.year,
        };
      }

      if (current.level === "week") {
        return {
          level: "day",
          month: node.range.month,
          week: node.range.week,
          year: node.range.year,
        };
      }

      return {
        level: "day",
        day: node.range.day,
        month: node.range.month,
        week: node.range.week,
        year: node.range.year,
      };
    });
    clearSelection();
  };
  const stepBackTimeAxis = () => {
    setTimeAxisState((current) => {
      if (current.level === "day") {
        return { level: "week", month: current.month, year: current.year };
      }
      if (current.level === "week") {
        return { level: "month", year: current.year };
      }
      return initialTimeAxisState;
    });
    clearSelection();
  };
  const selectContentType = (tag: Tag) => {
    if (tag.slug === selectedContentTypeSlug) return;
    setSelectedContentTypeSlug(tag.slug);
    setSelectedAxisNodeId(null);
    setAxisDrillPath([]);
    setTimeAxisState(initialTimeAxisState);
    clearSelection();
    onContentTypeChange?.(tag.slug);
  };
  const selectRelatedItem = (itemId: string) => {
    setSelectedItemId(itemId);
  };
  const highlightRelatedNodes = () => {
    setHighlightedPointIds(relatedItems.map((related) => related.item.id));
  };
  const clearRelatedHighlight = () => setHighlightedPointIds([]);
  const highlightedRelated =
    highlightedPointIds.length > 0 &&
    relatedItems.some((related) => highlightedPointIds.includes(related.item.id));

  return (
    <main className="h-screen overflow-y-auto bg-[#0b0c10] text-stone-100">
      <header className={`
        sticky top-0 z-30 border-b border-[#252a33] bg-[#0c0d11]/95
        backdrop-blur
      `}>
        <div className="flex h-[62px] items-center justify-between gap-4 px-5">
          <button
            type="button"
            className={`
              flex h-9 w-9 items-center justify-center overflow-hidden
              rounded-full border border-[#2d3340] bg-[#151922]
            `}
            onClick={() => navigate("/app")}
            aria-label="返回用户端首页"
          >
            <BoxIcon className="h-5 w-5 text-[#60a5fa]" />
          </button>
          <form
            className={`
              mx-auto flex h-11 w-full max-w-[380px] items-center rounded-full
              border border-[#2c313b] bg-[#151820] px-4 text-sm text-stone-400
              shadow-[0_12px_30px_rgba(0,0,0,0.18)]
            `}
            onSubmit={(event) => {
              event.preventDefault();
              loadMap();
            }}
          >
            <input
              aria-label="知识库搜索"
              className={`
                min-w-0 flex-1 bg-transparent text-sm text-stone-200
                outline-none

                placeholder:text-stone-500
              `}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder={publicScreen ? "搜索标题、摘要..." : "搜索标题、摘要、标签..."}
            />
            {hasQuery && (
              <button
                type="button"
                className={`
                  mr-2 flex h-6 w-6 shrink-0 items-center justify-center
                  rounded-full text-stone-500 transition-colors

                  hover:bg-white/5 hover:text-stone-200
                `}
                onClick={clearSearch}
                aria-label="清空搜索"
                title="清空搜索"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
            <SearchIcon className="h-4 w-4 text-stone-500" />
          </form>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`
                flex h-10 w-10 items-center justify-center rounded-full
                bg-[#2563eb] text-white shadow-[0_0_0_1px_rgba(96,165,250,0.34)]
              `}
              onClick={() => navigate("/admin")}
              aria-label="进入管理端"
            >
              <BeakerIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={`
                flex h-9 w-9 items-center justify-center rounded-full border
                border-[#2c313b] text-stone-400
              `}
              onClick={() => navigate("/app/uploads")}
              aria-label="我的上传"
            >
              <UserIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`
                hidden rounded-[8px] border border-[#2c313b] px-3 py-2 text-xs
                font-semibold text-stone-300

                hover:border-[#60a5fa]/50

                md:inline-flex
              `}
              onClick={() => navigate("/app/upload")}
            >
              <UploadCloudIcon className="mr-2 h-4 w-4" />
              上传资料
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "px-3 pb-8 pt-4 transition-[margin,max-width] duration-200",
          selectedItem
            ? `
              max-w-none

              xl:mr-[380px]
            `
            : publicScreen
              ? "max-w-none"
              : "mx-auto max-w-[1420px]",
        )}
      >
        <section className={`
          relative h-[calc(100vh-94px)] min-h-[620px] overflow-hidden
          rounded-[18px] border border-[#383d48] bg-[#02040a]
          shadow-[0_18px_60px_rgba(0,0,0,0.28)]
        `}>
          <div className={`
            pointer-events-none absolute left-24 top-3 z-10 flex
            max-w-[calc(100%-220px)] flex-wrap items-center gap-2 text-[11px]
            font-semibold text-stone-300
          `}>
            <span className={`
              rounded-full border border-[#2f3540] bg-[#101318]/80 px-2.5 py-1
              text-[#bfdbfe] backdrop-blur
            `}>
              仅已发布
            </span>
            <span className={`
              rounded-full border border-[#2f3540] bg-[#101318]/80 px-2.5 py-1
              backdrop-blur
            `}>
              {displayedPoints.length} 个节点
            </span>
            <span className={`
              rounded-full border border-[#2f3540] bg-[#101318]/80 px-2.5 py-1
              backdrop-blur
            `}>
              当前分类：{currentCategoryLabel}
            </span>
            {publicAxisSummary && (
              <span
                className={`
                  max-w-[360px] truncate rounded-full border border-[#60a5fa]/45
                  bg-[#2563eb]/15 px-2.5 py-1 text-[#bfdbfe] backdrop-blur
                `}
              >
                {publicAxisLabel}：{publicAxisSummary}
              </span>
            )}
            {axisDrillPath.length > 0 && (
              <button
                type="button"
                className={`
                  pointer-events-auto rounded-full border border-[#60a5fa]/45
                  bg-[#0f172a]/80 px-2.5 py-1 text-[#bfdbfe] backdrop-blur
                  transition-colors

                  hover:border-[#93c5fd] hover:text-white
                `}
                onClick={stepBackAxis}
              >
                返回上一级
              </button>
            )}
            {timeAxisSummary && (
              <span
                className={`
                  max-w-[280px] truncate rounded-full border border-[#60a5fa]/45
                  bg-[#2563eb]/15 px-2.5 py-1 text-[#bfdbfe] backdrop-blur
                `}
              >
                时间：{timeAxisSummary}
              </span>
            )}
            {hasTagFilters && (
              <span className={`
                max-w-[360px] truncate rounded-full border border-[#60a5fa]/45
                bg-[#2563eb]/15 px-2.5 py-1 text-[#bfdbfe] backdrop-blur
              `}>
                标签：{filterSummary}
              </span>
            )}
            {hasQuery && (
              <span className={`
                max-w-[280px] truncate rounded-full border border-[#60a5fa]/45
                bg-[#2563eb]/15 px-2.5 py-1 text-[#bfdbfe] backdrop-blur
              `}>
                搜索：{trimmedQuery}
              </span>
            )}
          </div>
          <div className={`
            absolute left-24 right-44 top-12 z-20 flex flex-wrap items-center
            gap-2
          `}>
            {contentTypeTags.map((tag) => (
              <CategoryButton
                key={tag.id}
                active={selectedContentTypeTag.id === tag.id}
                count={contentTypeCounts.get(tag.id) ?? 0}
                icon={getContentTypeIcon(tag)}
                onClick={() => selectContentType(tag)}
              >
                {tag.name}
              </CategoryButton>
            ))}
          </div>
          <div className={`
            absolute inset-x-0 top-0 h-[calc(100%-54px)] p-3 pl-20
          `}>
            {loading ? (
              <LoadingState
                className="h-full border-[#2c313b] bg-[#151820]"
                label="正在加载知识地图..."
                rows={4}
              />
            ) : error ? (
              <ErrorState
                className="h-full border-[#2c313b] bg-[#151820]"
                title="知识地图加载失败"
                description={error}
                onRetry={loadMap}
              />
            ) : displayedPoints.length === 0 ? (
              <EmptyState
                className="h-full border-[#2c313b] bg-[#151820] text-stone-300"
                icon={<InboxIcon className="h-8 w-8" />}
                title="当前筛选条件下没有已发布知识节点"
                description="请调整搜索、资料分类或标签组筛选。上传资料需要管理员审核通过后才会显示。"
                action={
                  <Button type="button" size="xs" onClick={resetFilters}>
                    重置
                  </Button>
                }
              />
            ) : (
              <KnowledgeMapCanvas
                activeAxisNodeId={selectedAxisNodeId}
                axisNodes={publicAxisNodes}
                points={localizedPoints}
                clusters={mapData.clusters}
                highlightedPointIds={highlightedPointIds}
                selectedPointId={selectedItemId}
                onPointClick={setSelectedItemId}
                timeAxisLevel={timeAxisState.level}
                timeAxisRange={timeAxisState}
                variant="odatamap"
              />
            )}
          </div>
          <MapAxisOverlay
            activeAxisNodeId={selectedAxisNodeId}
            activeTimeNodeId={activeTimeNodeId}
            axisNodes={publicAxisNodes}
            onAxisClick={selectPublicAxisNode}
            onTimeAxisBack={stepBackTimeAxis}
            onTimeAxisClick={selectTimeAxisNode}
            timeAxisLevel={timeAxisState.level}
            timeNodes={timeAxisNodes}
          />
        </section>

        <section className={`
          mt-6 overflow-hidden rounded-[18px] border border-[#303640]
          bg-[#151820] shadow-[0_20px_80px_rgba(0,0,0,0.3)]
        `}>
          <div className="border-b border-[#292e37] px-8 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className={`
                  text-[32px] font-extrabold leading-none tracking-[-0.02em]
                  text-stone-100
                `}>
                  {publicScreen ? "公共知识地图" : "知识数据"}
                </h1>
                <div className="mt-3 text-sm text-stone-500">
                  当前分类：{currentCategoryLabel} · 已发布资料{" "}
                  {displayedPoints.length} 条
                  {publicAxisSummary
                    ? ` · ${publicAxisLabel}：${publicAxisSummary}`
                    : ""}
                  {hasQuery ? ` · 搜索：${trimmedQuery}` : ""}
                  {hasTagFilters ? ` · 标签：${filterSummary}` : ""}
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "grid",
              publicScreen ? "grid-cols-1" : `
                lg:grid-cols-[300px_minmax(0,1fr)]
              `,
            )}
          >
            {!publicScreen && (
              <TagFilterPanel
                error={tagError}
                groups={MAP_TAG_FILTER_GROUPS}
                loading={tagLoading}
                selectedTagIds={selectedTagIds}
                tagCounts={tagCounts}
                tagsByGroup={tagsByGroup}
                onClear={clearTagFilters}
                onToggle={toggleTagFilter}
              />
            )}

            <div className="min-w-0">
              <div className={`
                border-b border-[#292e37] bg-[#11141a] px-8 py-4 text-sm
                text-stone-400
              `}>
                命中 {displayedPoints.length} / {publishedPoints.length} 个已发布节点
                {hasTagFilters && (
                  <span className="ml-2 text-[#93c5fd]">{filterSummary}</span>
                )}
              </div>

              <KnowledgeNodeDetailStrip
                detailRef={selectedDetailRef}
                item={selectedItem}
                tagSections={detailTagSections}
                relatedItems={relatedItems}
                similarItems={similarItems}
                highlightedRelated={highlightedRelated}
                onClearRelatedHighlight={clearRelatedHighlight}
                onLegacyTagClick={searchLegacyTag}
                onHighlightRelated={highlightRelatedNodes}
                onRelatedItemClick={selectRelatedItem}
                onStructuredTagClick={selectStructuredTagFilter}
                showTags={!publicScreen}
              />

              {displayedPoints.length === 0 ? (
                <EmptyState
                  className={`
                    m-8 min-h-72 border-[#303640] bg-[#101318] text-stone-300
                  `}
                  icon={<DatabaseIcon className="h-8 w-8" />}
                  title="当前筛选条件下没有已发布知识节点"
                  description="请清空标签筛选、切换资料分类，或上传资料并等待管理员发布。"
                  action={
                    <Button type="button" size="xs" onClick={resetFilters}>
                      清空筛选
                    </Button>
                  }
                />
              ) : (
                <div>
                  {listPoints.map((point) => (
                    <DataCard
                      key={point.id}
                      point={point}
                      item={selectedItem?.id === point.id ? selectedItem : null}
                      selected={selectedItemId === point.id}
                      showTags={!publicScreen}
                      onClick={() => setSelectedItemId(point.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      <KnowledgeNodeDetailPanel
        item={selectedItem}
        tagSections={detailTagSections}
        onClose={clearSelection}
        onLegacyTagClick={searchLegacyTag}
        onRelatedItemClick={selectRelatedItem}
        onStructuredTagClick={selectStructuredTagFilter}
        relatedItems={relatedItems}
        similarItems={similarItems}
        highlightedRelated={highlightedRelated}
        onClearRelatedHighlight={clearRelatedHighlight}
        onHighlightRelated={highlightRelatedNodes}
        showTags={!publicScreen}
      />
    </main>
  );
}
