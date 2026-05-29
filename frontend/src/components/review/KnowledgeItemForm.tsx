import { SelectField } from "~/components/ui/SelectField";
import type {
  ItemType,
  KnowledgeItem,
  KnowledgeItemPayload,
  SourceType,
} from "~/types/knowledge";
import { cn, Input, Textarea } from "~/ui";
import type { Dispatch, SetStateAction } from "react";

const KNOWLEDGE_BASE_ID = "default";

export type FormState = {
  title: string;
  summary: string;
  tags: string;
  clusterId: string;
  clusterLabel: string;
  sourceType: SourceType;
  itemType: ItemType;
  author: string;
  year: string;
  doiUrl: string;
  sourceName: string;
  visibility: string;
  contentPreview: string;
  rejectReason: string;
};

export const emptyFormState: FormState = {
  title: "",
  summary: "",
  tags: "",
  clusterId: "",
  clusterLabel: "",
  sourceType: "other",
  itemType: "other",
  author: "",
  year: "",
  doiUrl: "",
  sourceName: "",
  visibility: "课题组可见",
  contentPreview: "",
  rejectReason: "",
};

export const itemTypeOptions: { label: string; value: ItemType }[] = [
  { label: "论文", value: "paper" },
  { label: "实验记录", value: "experiment_record" },
  { label: "阅读笔记", value: "note" },
  { label: "项目资料", value: "project_doc" },
  { label: "课程材料", value: "course_material" },
  { label: "其他", value: "other" },
];

export const sourceTypeOptions: { label: string; value: SourceType }[] = [
  { label: "文档文件", value: "pdf" },
  { label: "标记文档", value: "markdown" },
  { label: "纯文本", value: "txt" },
  { label: "表格文件", value: "csv" },
  { label: "手动录入", value: "manual" },
  { label: "网页链接", value: "url" },
  { label: "其他", value: "other" },
];

export function payloadFromForm(form: FormState): KnowledgeItemPayload {
  return {
    knowledge_base_id: KNOWLEDGE_BASE_ID,
    title: form.title,
    summary: form.summary,
    tags: form.tags
      .split(/[,，\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    cluster_id: form.clusterId || null,
    cluster_label: form.clusterLabel || null,
    source_type: form.sourceType,
    item_type: form.itemType,
    author: form.author || null,
    year: form.year ? Number(form.year) : null,
    doi_url: form.doiUrl || null,
    source_name: form.sourceName || null,
    visibility: form.visibility,
    content_preview: form.contentPreview || null,
    reject_reason: form.rejectReason || null,
  };
}

export function formFromItem(item: KnowledgeItem): FormState {
  return {
    title: item.title,
    summary: item.summary ?? "",
    tags: item.tags.join("，"),
    clusterId: item.cluster_id ?? "",
    clusterLabel: item.cluster_label ?? "",
    sourceType: item.source_type,
    itemType: item.item_type,
    author: item.author ?? "",
    year: item.year ? String(item.year) : "",
    doiUrl: item.doi_url ?? "",
    sourceName: item.source_name ?? "",
    visibility: item.visibility ?? "课题组可见",
    contentPreview: item.content_preview ?? "",
    rejectReason: item.reject_reason ?? "",
  };
}

export function getItemTypeLabel(value: ItemType) {
  return (
    itemTypeOptions.find((option) => option.value === value)?.label ?? value
  );
}

export function getSourceTypeLabel(value: SourceType) {
  return (
    sourceTypeOptions.find((option) => option.value === value)?.label ?? value
  );
}

export function getFormTags(tags: string) {
  return tags
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function getMissingReviewFields(form: FormState) {
  const requiredFields: [keyof FormState, string][] = [
    ["title", "标题"],
    ["summary", "摘要"],
    ["tags", "标签"],
    ["clusterLabel", "聚类名称"],
    ["sourceName", "来源"],
  ];

  return requiredFields
    .filter(([key]) => !form[key].trim())
    .map(([, label]) => label);
}

export function FieldGrid({
  compact = false,
  form,
  setForm,
  showTagsInput = true,
}: {
  compact?: boolean;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  showTagsInput?: boolean;
}) {
  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const wideClass = compact ? "" : "lg:col-span-2";

  return (
    <div
      className={cn("grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-2")}
    >
      <Input
        label="标题"
        value={form.title}
        onChange={(event) => update("title", event.target.value)}
      />
      <Input
        label="作者"
        value={form.author}
        onChange={(event) => update("author", event.target.value)}
      />
      <Textarea
        label="摘要"
        className={wideClass}
        value={form.summary}
        onChange={(event) => update("summary", event.target.value)}
      />
      {showTagsInput && (
        <Input
          label="标签（逗号分隔）"
          value={form.tags}
          onChange={(event) => update("tags", event.target.value)}
        />
      )}
      <Input
        label="年份"
        type="number"
        value={form.year}
        onChange={(event) => update("year", event.target.value)}
      />
      <Input
        label="聚类 ID"
        value={form.clusterId}
        onChange={(event) => update("clusterId", event.target.value)}
      />
      <Input
        label="聚类名称"
        value={form.clusterLabel}
        onChange={(event) => update("clusterLabel", event.target.value)}
      />
      <SelectField
        label="来源类型"
        value={form.sourceType}
        options={sourceTypeOptions}
        onChange={(event) => update("sourceType", event.target.value)}
      />
      <SelectField
        label="资料类型"
        value={form.itemType}
        options={itemTypeOptions}
        onChange={(event) => update("itemType", event.target.value)}
      />
      <Input
        label="文献标识或网页链接"
        value={form.doiUrl}
        onChange={(event) => update("doiUrl", event.target.value)}
      />
      <Input
        label="来源文件或网页链接"
        value={form.sourceName}
        onChange={(event) => update("sourceName", event.target.value)}
      />
      <Textarea
        label="原文片段"
        className={wideClass}
        value={form.contentPreview}
        onChange={(event) => update("contentPreview", event.target.value)}
      />
    </div>
  );
}
