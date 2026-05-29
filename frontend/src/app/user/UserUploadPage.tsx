import { Button } from "~/components/ui/Button";
import { EmptyState } from "~/components/ui/EmptyState";
import { InfoTile } from "~/components/ui/InfoTile";
import { KeyValueGrid } from "~/components/ui/KeyValueGrid";
import { MetricCard } from "~/components/ui/MetricCard";
import { PageShell } from "~/components/ui/PageShell";
import { Section } from "~/components/ui/Section";
import { SelectField } from "~/components/ui/SelectField";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { StatusNotice } from "~/components/ui/StatusNotice";
import { StepIndicator } from "~/components/ui/StepIndicator";
import type {
  ItemType,
  KnowledgeBase,
  KnowledgeItem,
  SourceType,
} from "~/types/knowledge";
import { cn, Textarea } from "~/ui";
import {
  createUserUploadItem,
  fetchUserKnowledgeBases,
} from "~/utils/userKnowledgeApi";
import { FileTextIcon, InboxIcon, UploadCloudIcon } from "lucide-react";
import { useEffect, useState } from "react";

const KNOWLEDGE_BASE_ID = "default";

const uploadStepItems = [
  { label: "选择知识库" },
  { label: "上传文件" },
  { label: "设置类型" },
  { label: "进入审核队列" },
];

const itemTypeOptions: Array<{ label: string; value: ItemType }> = [
  { label: "论文", value: "paper" },
  { label: "实验记录", value: "experiment_record" },
  { label: "阅读笔记", value: "note" },
  { label: "项目资料", value: "project_doc" },
  { label: "课程材料", value: "course_material" },
  { label: "其他", value: "other" },
];

const sourceTypeOptions: Array<{ label: string; value: SourceType }> = [
  { label: "文档文件", value: "pdf" },
  { label: "标记文档", value: "markdown" },
  { label: "纯文本", value: "txt" },
  { label: "表格文件", value: "csv" },
  { label: "手动录入", value: "manual" },
  { label: "网页链接", value: "url" },
  { label: "其他", value: "other" },
];

function inferSourceType(fileName: string): SourceType {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".csv")) return "csv";
  return "other";
}

export function UserUploadPage({
  navigate,
  showReviewLink = true,
}: {
  navigate: (path: string) => void;
  showReviewLink?: boolean;
}) {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState(KNOWLEDGE_BASE_ID);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<ItemType>("paper");
  const [selectedSourceType, setSelectedSourceType] =
    useState<SourceType>("other");
  const [reviewNote, setReviewNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<KnowledgeItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserKnowledgeBases()
      .then((data) => {
        setBases(data);
        if (data.length > 0) setSelectedBaseId(data[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const handleSelectFile = (file: File | null) => {
    setSelectedFile(file);
    if (file) setSelectedSourceType(inferSourceType(file.name));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      const isReadable = /\.(txt|md|markdown|csv)$/i.test(selectedFile.name);
      const filePreview = isReadable
        ? (await selectedFile.text()).slice(0, 1200)
        : `已接收文件 ${selectedFile.name}，管理员审核时补全摘要和标签。`;
      const contentPreview = reviewNote.trim()
        ? `${filePreview}\n\n审核说明：${reviewNote.trim()}`
        : filePreview;
      const item = await createUserUploadItem({
        knowledge_base_id: selectedBaseId,
        title: selectedFile.name.replace(/\.[^.]+$/, ""),
        file_name: selectedFile.name,
        source_name: selectedFile.name,
        source_type: selectedSourceType,
        item_type: selectedItemType,
        content_preview: contentPreview,
      });
      setUploadedItems((current) => [item, ...current]);
      setSelectedFile(null);
      setReviewNote("");
      setUploading(false);
      setMessage(
        "上传成功，已进入后台审核队列。管理员审核通过后，该资料会出现在知识地图中。",
      );
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "上传失败，请稍后重试。");
    }
  };

  const selectedBase =
    bases.find((base) => base.id === selectedBaseId) ?? bases[0] ?? null;
  const completedStep = selectedFile ? 3 : uploadedItems.length > 0 ? 4 : 1;
  const selectedTypeLabel =
    itemTypeOptions.find((option) => option.value === selectedItemType)
      ?.label ?? "未设置";
  const selectedSourceLabel =
    sourceTypeOptions.find((option) => option.value === selectedSourceType)
      ?.label ?? "未设置";
  const uploadDisabled = !selectedFile || uploading;

  return (
    <PageShell
      actions={
        showReviewLink ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/review")}
          >
            查看审核队列
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/app/uploads")}
          >
            我的上传
          </Button>
        )
      }
      eyebrow="上传流程"
      title="上传科研资料"
      description="选择知识库、上传文件并设置资料类型。资料提交后只会进入待审核状态，审核通过前不会显示在知识地图。"
    >
      {(message || error) && (
        <StatusNotice className="mb-4" tone={error ? "danger" : "success"}>
          {error ?? message}
        </StatusNotice>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Section
            title="1. 选择知识库"
            description="第二版第一阶段使用默认知识库跑通审核入库流程。"
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <SelectField
                label="目标知识库"
                value={selectedBaseId}
                onChange={(event) => setSelectedBaseId(event.target.value)}
              >
                {bases.length === 0 ? (
                  <option value={KNOWLEDGE_BASE_ID}>默认知识库</option>
                ) : (
                  bases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.name}
                    </option>
                  ))
                )}
              </SelectField>
              <MetricCard
                title="当前待审核"
                tone="warning"
                value={selectedBase?.pending_review_count ?? "0"}
                description="提交后会进入后台审核队列"
              />
            </div>
            <div className="mt-4 rounded-[12px] border border-border bg-background p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {selectedBase?.name ?? "默认知识库"}
              </div>
              <div className="mt-1">
                {selectedBase?.description ??
                  "用于演示高校科研资料审核入库和知识地图浏览。"}
              </div>
            </div>
          </Section>

          <Section
            title="2. 上传文件"
            description="支持论文文档、阅读笔记、纯文本或文献表。"
          >
            <label
              className={cn(
                `
                  flex min-h-[220px] cursor-pointer flex-col items-center
                  justify-center rounded-[14px] border border-dashed
                  border-border bg-background p-8 text-center transition-colors

                  hover:bg-muted/50
                `,
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const droppedFile =
                  event.dataTransfer.files.length > 0
                    ? event.dataTransfer.files[0]
                    : null;
                handleSelectFile(droppedFile);
              }}
            >
              <UploadCloudIcon className="mb-4 h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selectedFile ? selectedFile.name : "还没有选择文件"}
              </span>
              <span className="mt-2 text-sm text-muted-foreground">
                你可以上传论文文档、阅读笔记、纯文本或文献表。
              </span>
              <input
                className="hidden"
                type="file"
                onChange={(event) =>
                  handleSelectFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
            {selectedFile && (
              <KeyValueGrid
                className="mt-4"
                items={[
                  {
                    label: "文件名",
                    value: (
                      <span className="block truncate">
                        {selectedFile.name}
                      </span>
                    ),
                  },
                  {
                    label: "文件大小",
                    value: `${(selectedFile.size / 1024).toFixed(1)} 千字节`,
                  },
                  { label: "当前状态", value: "等待进入审核队列" },
                ]}
              />
            )}
          </Section>

          <Section
            title="3. 设置类型和审核说明"
            description="这里只生成审核队列中的元数据初稿，不承诺自动摘要、自动标签或自动分析。"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="资料类型"
                value={selectedItemType}
                options={itemTypeOptions}
                onChange={(event) =>
                  setSelectedItemType(event.target.value as ItemType)
                }
              />
              <SelectField
                label="来源类型"
                value={selectedSourceType}
                options={sourceTypeOptions}
                onChange={(event) =>
                  setSelectedSourceType(event.target.value as SourceType)
                }
              />
              <Textarea
                label="给审核员的说明"
                className="md:col-span-2"
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="例如：请重点补全研究方法、年份和实验对象；如不确定标签，可先保存草稿。"
              />
            </div>
          </Section>

          <Section
            title="4. 提交到待审核队列"
            description="上传成功后状态为待审核。管理员通过并发布后才会进入知识地图。"
            actions={
              <Button
                type="button"
                disabled={uploadDisabled}
                loading={uploading}
                onClick={() => void handleUpload()}
              >
                上传并进入审核队列
              </Button>
            }
          >
            <KeyValueGrid
              items={[
                {
                  label: "知识库",
                  value: selectedBase?.name ?? "默认知识库",
                },
                { label: "条目类型", value: selectedTypeLabel },
                { label: "来源类型", value: selectedSourceLabel },
              ]}
            />
            <InfoTile className="mt-4" tone="warning">
              上传资料后将进入后台审核队列。管理员审核通过后才会显示在知识地图中。
            </InfoTile>
          </Section>
        </div>

        <aside className="space-y-4">
          <Section title="流程进度" description="当前上传任务的完成位置。">
            <StepIndicator
              currentStep={completedStep}
              items={uploadStepItems}
            />
          </Section>

          <Section
            title="本次上传队列"
            description="仅展示当前会话提交的资料。"
          >
            {uploadedItems.length === 0 ? (
              <EmptyState
                className="min-h-40"
                icon={<InboxIcon className="h-8 w-8" />}
                title="还没有上传记录"
                description="完成左侧四步后，资料会以待审核状态出现在这里。"
              />
            ) : (
              <div className="space-y-3">
                {uploadedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[12px] border border-border bg-background p-3"
                  >
                    <div className="flex items-start gap-2">
                      <FileTextIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <StatusBadge status={item.review_status} />
                          <span className="text-xs text-muted-foreground">
                            已进入审核队列
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="审核边界">
            <div className="space-y-3">
              <InfoTile>上传成功不等于发布成功。</InfoTile>
              <InfoTile>
                未审核资料不会进入地图数据接口，也不会显示在前台地图。
              </InfoTile>
              <InfoTile>智能辅助分析默认关闭，上传流程不依赖外部服务。</InfoTile>
            </div>
          </Section>
        </aside>
      </div>
    </PageShell>
  );
}
