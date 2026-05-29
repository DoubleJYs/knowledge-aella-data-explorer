import {
  emptyFormState,
  FieldGrid,
  formFromItem,
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
import { EmptyState } from "~/components/ui/EmptyState";
import { ErrorState } from "~/components/ui/ErrorState";
import { FilterChip } from "~/components/ui/FilterChip";
import { InfoTile } from "~/components/ui/InfoTile";
import { KeyValueGrid } from "~/components/ui/KeyValueGrid";
import { LoadingState } from "~/components/ui/LoadingState";
import { MetricCard } from "~/components/ui/MetricCard";
import { SplitPane } from "~/components/ui/SplitPane";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { StatusNotice } from "~/components/ui/StatusNotice";
import type { KnowledgeItem, ReviewStatus } from "~/types/knowledge";
import type { Tag, TagGroup } from "~/types/tags";
import { Badge, cn, Textarea } from "~/ui";
import { AdminCyberPage } from "./AdminCyberPage";
import {
  fetchAdminReviewItems,
  publishAdminReviewItem,
  rejectAdminReviewItem,
  saveAdminReviewDraft,
} from "~/utils/adminKnowledgeApi";
import {
  CheckCircle2Icon,
  FileTextIcon,
  InboxIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ReviewQueueFilter = "all" | ReviewStatus;

const reviewQueueFilterOptions: {
  label: string;
  value: ReviewQueueFilter;
}[] = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending_review" },
  { label: "审核中", value: "reviewing" },
  { label: "草稿", value: "draft" },
  { label: "已驳回", value: "rejected" },
];

const REVIEW_TAG_GROUPS: TagGroup[] = [
  "content_type",
  "academic_domain",
  "research_topic",
  "data_origin",
  "data_modality",
];

const REVIEW_REQUIRED_TAG_GROUPS: TagGroup[] = ["content_type"];

function getReviewFilterCount(
  items: KnowledgeItem[],
  filter: ReviewQueueFilter,
) {
  if (filter === "all") return items.length;
  return items.filter((item) => item.review_status === filter).length;
}

function formatDateTime(value?: string | null) {
  if (!value) return "暂无";
  return new Date(value).toLocaleString();
}

function mergeUniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

export function AdminReviewPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<ReviewQueueFilter>("all");
  const [form, setForm] = useState<FormState>(emptyFormState);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStructuredTags, setSelectedStructuredTags] = useState<Tag[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<
    "save" | "publish" | "reject" | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const visibleItems = useMemo(
    () =>
      queueFilter === "all"
        ? items
        : items.filter((item) => item.review_status === queueFilter),
    [items, queueFilter],
  );
  const legacyTags = useMemo(() => getFormTags(form.tags), [form.tags]);
  const selectedStructuredTagNames = useMemo(
    () => selectedStructuredTags.map((tag) => tag.name),
    [selectedStructuredTags],
  );
  const previewTags = useMemo(
    () => mergeUniqueTags([...legacyTags, ...selectedStructuredTagNames]),
    [legacyTags, selectedStructuredTagNames],
  );
  const missingFields = useMemo(
    () => getMissingReviewFields({ ...form, tags: previewTags.join("，") }),
    [form, previewTags],
  );
  const hasContentTypeTag = selectedStructuredTags.some(
    (tag) => tag.tagGroup === "content_type",
  );

  const loadItems = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminReviewItems()
      .then((data) => {
        const firstItem = data.items.length > 0 ? data.items[0] : undefined;
        setItems(data.items);
        setSelectedId((current) => current ?? firstItem?.id ?? null);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!selectedItem) {
      setForm(emptyFormState);
      setSelectedTagIds([]);
      setSelectedStructuredTags([]);
      return;
    }
    setForm(formFromItem(selectedItem));
    setSelectedTagIds(selectedItem.tag_ids ?? []);
    setSelectedStructuredTags([]);
  }, [selectedItem]);

  useEffect(() => {
    if (visibleItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0].id);
    }
  }, [selectedId, visibleItems]);

  const runAction = async (action: "save" | "publish" | "reject") => {
    if (!selectedItem) return;
    if (action === "publish" && !hasContentTypeTag) {
      setMessage(null);
      setError("请选择一个内容类型标签后再通过并发布。");
      return;
    }
    setActiveAction(action);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        ...payloadFromForm(form),
        tag_ids: selectedTagIds,
        tags: previewTags,
      };
      if (action === "save") {
        await saveAdminReviewDraft(selectedItem.id, payload);
        setMessage("审核草稿已保存。");
      }
      if (action === "publish") {
        await publishAdminReviewItem(selectedItem.id, payload);
        setMessage("已通过并发布。该知识条目现在会显示在地图中。");
      }
      if (action === "reject") {
        await rejectAdminReviewItem(selectedItem.id, payload);
        setMessage("已驳回。该资料不会显示在知识地图中。");
      }
      setSelectedId(null);
      loadItems();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "审核操作失败，请稍后重试。",
      );
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <AdminCyberPage
      actions={
        <Button type="button" variant="outline" onClick={loadItems}>
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          刷新队列
        </Button>
      }
      eyebrow="审核工作台"
      title="后台审核"
      description="左侧处理队列，中间查看上传内容，右侧补全结构化字段并决定保存、发布或驳回。"
    >
      <div className={`
        mb-4 grid gap-3

        md:grid-cols-3
      `}>
        <MetricCard
          title="待审核资料"
          value={items.length}
          tone="warning"
          description="包含上传后尚未发布的资料"
        />
        <MetricCard
          title="当前状态"
          value={selectedItem ? "审核中" : "未选择"}
          tone={selectedItem ? "info" : "default"}
          description="选择队列条目后进入结构化审核"
        />
        <MetricCard
          title="智能辅助"
          value="未开启"
          description="当前使用人工审核流程"
        />
      </div>

      {(message || error) && (
        <StatusNotice className="mb-4" tone={error ? "danger" : "success"}>
          {error ?? message}
        </StatusNotice>
      )}

      <SplitPane
        className="min-h-[720px]"
        columns="xl:grid-cols-[300px_minmax(0,1fr)_420px]"
      >
        <DetailPanel
          title="待审核队列"
          description={`当前筛选 ${visibleItems.length} / ${items.length} 条`}
          className={`
            min-h-[420px]

            xl:min-h-[720px]
          `}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {reviewQueueFilterOptions.map((option) => (
              <FilterChip
                key={option.value}
                className="w-auto"
                count={getReviewFilterCount(items, option.value)}
                selected={queueFilter === option.value}
                onClick={() => setQueueFilter(option.value)}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
          {loading ? (
            <LoadingState label="正在加载审核队列..." rows={5} />
          ) : error ? (
            <ErrorState description={error} onRetry={loadItems} />
          ) : items.length === 0 ? (
            <EmptyState
              className="min-h-64"
              icon={<InboxIcon className="h-8 w-8" />}
              title="当前没有待审核资料"
              description="上传资料后会先进入这里，管理员审核通过后才会进入知识地图。"
            />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              className="min-h-64"
              icon={<InboxIcon className="h-8 w-8" />}
              title="当前状态下没有资料"
              description="切换上方状态筛选查看其他审核资料，或等待新的上传资料进入待审核队列。"
            />
          ) : (
            <div className="space-y-2">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    `
                      block w-full rounded-[12px] border border-border
                      bg-background p-3 text-left transition-colors

                      hover:bg-muted/50
                    `,
                    selectedId === item.id &&
                      `
                        border-cyan-300 bg-cyan-500/15 text-cyan-50
                        shadow-[inset_0_0_18px_rgba(14,165,233,0.12)]
                      `,
                  )}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="line-clamp-2 text-sm font-medium">
                    {item.title}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={item.review_status} />
                    <span className="truncate text-xs text-muted-foreground">
                      {item.source_name ?? getSourceTypeLabel(item.source_type)}
                    </span>
                  </div>
                  <div className={`
                    mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground
                  `}>
                    <span>{getItemTypeLabel(item.item_type)}</span>
                    <span>{formatDateTime(item.updated_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DetailPanel>

        <section
          className={`
            flex min-h-[420px] flex-col rounded-[14px] border border-border
            bg-card text-card-foreground shadow-sm

            xl:min-h-[720px]
          `}
        >
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">文档 / 文本预览</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              上传内容只作为审核依据，发布前需补全结构化字段。
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {!selectedItem ? (
              <EmptyState
                className="h-full min-h-64"
                icon={<FileTextIcon className="h-8 w-8" />}
                title="选择左侧资料开始审核"
                description="这里会展示上传文件的文本预览、来源、资料类型和发布影响。"
              />
            ) : (
              <div className="space-y-4">
                <KeyValueGrid
                  items={[
                    {
                      label: "来源类型",
                      value: getSourceTypeLabel(selectedItem.source_type),
                    },
                    {
                      label: "资料类型",
                      value: getItemTypeLabel(selectedItem.item_type),
                    },
                    {
                      label: "知识库",
                      value: selectedItem.knowledge_base_id,
                    },
                  ]}
                />
                <div className={`
                  rounded-[14px] border border-border bg-background p-4
                `}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">上传内容预览</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {selectedItem.source_name ?? "未记录来源文件"}
                      </div>
                    </div>
                    <StatusBadge status={selectedItem.review_status} />
                  </div>
                  <div className={`
                    max-h-[420px] overflow-y-auto whitespace-pre-wrap
                    rounded-[12px] bg-[var(--kl-surface-subtle)] p-4 text-sm
                    leading-6 text-muted-foreground
                  `}>
                    {selectedItem.content_preview || "暂无预览内容。"}
                  </div>
                </div>
                <InfoTile className="p-4" tone="warning">
                  通过并发布后，该资料会以已发布
                  状态进入知识地图；保存草稿或驳回都不会进入地图。
                </InfoTile>
              </div>
            )}
          </div>
        </section>

        <DetailPanel
          title="结构化审核表单"
          description="补全标题、摘要、标签、聚类、来源和年份。"
          className={`
            min-h-[520px]

            xl:min-h-[720px]
          `}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedItem || Boolean(activeAction)}
                loading={activeAction === "save"}
                onClick={() => void runAction("save")}
              >
                保存草稿
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!selectedItem || Boolean(activeAction)}
                loading={activeAction === "reject"}
                onClick={() => void runAction("reject")}
              >
                <XCircleIcon className="mr-2 h-4 w-4" />
                驳回
              </Button>
              <Button
                type="button"
                disabled={!selectedItem || Boolean(activeAction)}
                loading={activeAction === "publish"}
                onClick={() => void runAction("publish")}
              >
                <CheckCircle2Icon className="mr-2 h-4 w-4" />
                通过并发布
              </Button>
            </div>
          }
        >
          {!selectedItem ? (
            <EmptyState
              className="min-h-64"
              title="等待选择审核资料"
              description="选择队列中的资料后，这里会显示可编辑字段和发布预览。"
            />
          ) : (
            <div className="space-y-4">
              <div className={`
                rounded-[14px] border border-border bg-background p-4
              `}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">发布预览</div>
                  <StatusBadge status={selectedItem.review_status} />
                </div>
                <div className="text-base font-semibold">
                  {form.title || "未填写标题"}
                </div>
                <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {form.summary || "未填写摘要。"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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
                <div className={`
                  mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground
                `}>
                  <span>聚类：{form.clusterLabel || "未填写"}</span>
                  <span>年份：{form.year || "未知"}</span>
                </div>
              </div>

              <StatusNotice
                tone={missingFields.length > 0 ? "warning" : "success"}
              >
                {missingFields.length > 0
                  ? `建议发布前补全：${missingFields.join("、")}。`
                  : "必填展示字段已补全，可以保存草稿或发布。"}
              </StatusNotice>

              <FieldGrid
                compact
                form={form}
                setForm={setForm}
                showTagsInput={false}
              />

              <div className={`
                rounded-[14px] border border-border bg-background p-4
              `}>
                <TagSelector
                  mode="admin"
                  value={selectedTagIds}
                  disabled={Boolean(activeAction)}
                  requiredGroups={REVIEW_REQUIRED_TAG_GROUPS}
                  tagGroups={REVIEW_TAG_GROUPS}
                  singleSelectGroups={["content_type"]}
                  placeholder="搜索内容类型、学科领域、研究主题、数据来源或数据模态"
                  onChange={setSelectedTagIds}
                  onSelectedTagsChange={setSelectedStructuredTags}
                />
                <StatusNotice
                  className="mt-4"
                  tone={hasContentTypeTag ? "info" : "warning"}
                >
                  {hasContentTypeTag
                    ? "结构化标签会在提交时同步为旧 tags 字段，兼容当前地图和详情展示。"
                    : "内容类型为必选项；未选择内容类型时不能通过并发布。"}
                </StatusNotice>
              </div>

              <Textarea
                label="驳回原因"
                value={form.rejectReason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rejectReason: event.target.value,
                  }))
                }
                placeholder="如果驳回，请说明需要补充或修正的内容。"
              />
              <div className={`
                rounded-[12px] border border-border bg-background p-3 text-xs
                text-muted-foreground
              `}>
                最近更新：{formatDateTime(selectedItem.updated_at)}
              </div>
            </div>
          )}
        </DetailPanel>
      </SplitPane>
    </AdminCyberPage>
  );
}
