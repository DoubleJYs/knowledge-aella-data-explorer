import {
  emptyFormState,
  FieldGrid,
  getFormTags,
  getItemTypeLabel,
  getMissingReviewFields,
  getSourceTypeLabel,
  payloadFromForm,
} from "~/components/review/KnowledgeItemForm";
import type { FormState } from "~/components/review/KnowledgeItemForm";
import { TagSelector } from "~/components/tags/TagSelector";
import { Button } from "~/components/ui/Button";
import { DetailPanel } from "~/components/ui/DetailPanel";
import { InfoTile } from "~/components/ui/InfoTile";
import { KeyValueGrid } from "~/components/ui/KeyValueGrid";
import { Section } from "~/components/ui/Section";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { StatusNotice } from "~/components/ui/StatusNotice";
import type { ItemType } from "~/types/knowledge";
import type { Tag, TagGroup } from "~/types/tags";
import { Badge } from "~/ui";
import { createAdminManualItem } from "~/utils/adminKnowledgeApi";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminCyberPage } from "./AdminCyberPage";

const BASE_MANUAL_TAG_GROUPS: TagGroup[] = [
  "content_type",
  "academic_domain",
  "research_topic",
];

const REQUIRED_MANUAL_TAG_GROUPS: TagGroup[] = ["content_type"];

const CONTENT_TYPE_EXTRA_GROUPS: Record<string, TagGroup[]> = {
  会议记录: ["meeting_type"],
  周报: ["report_type"],
  实验数据: ["data_origin", "data_modality", "dataset_type"],
  实验记录: ["experiment_type"],
  课程材料: ["course_type"],
  项目资料: ["project_type"],
};

const CONTENT_TYPE_ITEM_TYPE: Partial<Record<string, ItemType>> = {
  其他: "other",
  会议记录: "other",
  周报: "other",
  实验数据: "other",
  实验记录: "experiment_record",
  课程材料: "course_material",
  论文: "paper",
  阅读笔记: "note",
  项目资料: "project_doc",
};

const SINGLE_SELECT_TAG_GROUPS: TagGroup[] = [
  "content_type",
  "meeting_type",
  "report_type",
  "experiment_type",
  "project_type",
  "course_type",
];

function getManualEntryInitialForm(): FormState {
  return {
    ...emptyFormState,
    sourceType: "manual",
    itemType: "note",
    clusterId: "manual",
    clusterLabel: "手动维护条目",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "暂无";
  return new Date(value).toLocaleString();
}

function mergeUniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

export function AdminManualEntryPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [form, setForm] = useState<FormState>(getManualEntryInitialForm);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStructuredTags, setSelectedStructuredTags] = useState<Tag[]>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const legacyTags = useMemo(() => getFormTags(form.tags), [form.tags]);
  const selectedStructuredTagNames = useMemo(
    () => selectedStructuredTags.map((tag) => tag.name),
    [selectedStructuredTags],
  );
  const previewTags = useMemo(
    () => mergeUniqueTags([...legacyTags, ...selectedStructuredTagNames]),
    [legacyTags, selectedStructuredTagNames],
  );
  const selectedContentType = selectedStructuredTags.find(
    (tag) => tag.tagGroup === "content_type",
  );
  const manualTagGroups = useMemo(() => {
    const extraGroups = selectedContentType
      ? CONTENT_TYPE_EXTRA_GROUPS[selectedContentType.name] ?? []
      : [];
    return mergeUniqueTags([
      ...BASE_MANUAL_TAG_GROUPS,
      ...extraGroups,
    ]) as TagGroup[];
  }, [selectedContentType]);
  const missingFields = useMemo(
    () => getMissingReviewFields({ ...form, tags: previewTags.join("，") }),
    [form, previewTags],
  );
  const hasContentTypeTag = Boolean(selectedContentType);
  const canPublish =
    form.title.trim().length > 0 && hasContentTypeTag && !publishing;

  useEffect(() => {
    if (!selectedContentType) return;
    const nextItemType = CONTENT_TYPE_ITEM_TYPE[selectedContentType.name];
    if (!nextItemType) return;
    setForm((current) =>
      current.itemType === nextItemType
        ? current
        : { ...current, itemType: nextItemType },
    );
  }, [selectedContentType]);

  const handleSelectedTagsChange = useCallback((tags: Tag[]) => {
    setSelectedStructuredTags(tags);
  }, []);

  const resetForm = () => {
    setForm(getManualEntryInitialForm());
    setSelectedTagIds([]);
    setSelectedStructuredTags([]);
  };

  const handleCreate = async () => {
    if (!hasContentTypeTag) {
      setMessage(null);
      setError("请选择一个内容类型标签后再创建并发布。");
      return;
    }
    if (!canPublish) return;
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const item = await createAdminManualItem({
        ...payloadFromForm(form),
        tag_ids: selectedStructuredTags.map((tag) => tag.id),
        tags: previewTags,
      });
      setMessage(`已创建并发布：${item.title}`);
      setDraftSavedAt(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请稍后重试。");
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveLocalDraft = () => {
    setDraftSavedAt(new Date().toISOString());
    setError(null);
    setMessage("本页草稿已保留。未发布前不会进入知识地图。");
  };

  return (
    <AdminCyberPage
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/app/map")}
        >
          打开地图
        </Button>
      }
      eyebrow="Manual Entry"
      title="管理员手动新增条目"
      description="无需上传文件即可结构化创建知识节点。保存本页草稿不会入库，创建并发布后会直接进入知识地图。"
    >
      {(message || error) && (
        <StatusNotice className="mb-4" tone={error ? "danger" : "success"}>
          {error ?? message}
        </StatusNotice>
      )}
      <div className={`
        grid gap-6

        lg:grid-cols-[minmax(0,1fr)_420px]
      `}>
        <Section
          title="结构化录入"
          description="补录核心论文、阅读笔记、项目资料或课程材料；无需上传文件。"
        >
          <FieldGrid form={form} setForm={setForm} showTagsInput={false} />
          <div className={`
            mt-5 rounded-[14px] border border-border bg-background p-4
          `}>
            <TagSelector
              mode="admin"
              value={selectedTagIds}
              disabled={publishing}
              requiredGroups={REQUIRED_MANUAL_TAG_GROUPS}
              tagGroups={manualTagGroups}
              singleSelectGroups={SINGLE_SELECT_TAG_GROUPS}
              placeholder="搜索内容类型、学科领域、研究主题或对应资料分类"
              onChange={setSelectedTagIds}
              onSelectedTagsChange={handleSelectedTagsChange}
            />
            <StatusNotice
              className="mt-4"
              tone={hasContentTypeTag ? "info" : "warning"}
            >
              {hasContentTypeTag
                ? `当前内容类型：${selectedContentType?.name}。页面会按内容类型显示对应附加标签组。`
                : "内容类型为必填项；选择后会展开对应的资料分类标签。"}
            </StatusNotice>
          </div>
          <StatusNotice className="mt-5" tone="info">
            手动新增会绕过上传队列，适合演示数据、已确认资料和管理员维护的核心条目。发布前请确认标题、摘要、标签和来源可直接展示给前台用户。
          </StatusNotice>
        </Section>

        <DetailPanel
          title="发布预览"
          description="检查该知识节点在详情面板中的展示效果。"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={publishing}
                onClick={handleSaveLocalDraft}
              >
                保存本页草稿
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={publishing}
                onClick={() => navigate("/admin/review")}
              >
                查看审核队列
              </Button>
              <Button
                type="button"
                disabled={!canPublish}
                loading={publishing}
                onClick={() => void handleCreate()}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                创建并发布
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className={`
              rounded-[14px] border border-border bg-background p-4
            `}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">前台详情预览</div>
                <StatusBadge status={draftSavedAt ? "draft" : "published"} />
              </div>
              <h2 className="text-lg font-semibold leading-tight">
                {form.title || "未填写标题"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {form.summary || "未填写摘要。"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {previewTags.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    暂无标签
                  </span>
                ) : (
                  previewTags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))
                )}
              </div>
              <KeyValueGrid
                className="mt-4"
                columns="grid-cols-2"
                items={[
                  {
                    label: "资料类型",
                    value: getItemTypeLabel(form.itemType),
                  },
                  {
                    label: "来源类型",
                    value: getSourceTypeLabel(form.sourceType),
                  },
                  { label: "聚类", value: form.clusterLabel || "未填写" },
                  { label: "年份", value: form.year || "未知" },
                ]}
              />
            </div>

            <StatusNotice
              tone={missingFields.length > 0 ? "warning" : "success"}
            >
              {missingFields.length > 0
                ? `建议发布前补全：${missingFields.join("、")}。`
                : "展示字段已补全，发布后会直接显示在知识地图和节点详情中。"}
            </StatusNotice>

            {draftSavedAt && (
              <div className={`
                rounded-[12px] border border-border bg-background p-3 text-xs
                text-muted-foreground
              `}>
                本页草稿保存时间：{formatDateTime(draftSavedAt)}
                。草稿仅保留在当前页面状态中，刷新页面后需要重新录入。
              </div>
            )}

            <InfoTile title="发布影响">
              <div>
                点击“创建并发布”会调用管理员新增接口，条目创建后即为已发布
                状态，并会出现在知识地图中。
              </div>
            </InfoTile>

            <Button
              type="button"
              className="w-full"
              variant="outline"
              onClick={resetForm}
              disabled={publishing}
            >
              清空并重新录入
            </Button>
          </div>
        </DetailPanel>
      </div>
    </AdminCyberPage>
  );
}
