import { Button } from "~/components/ui/Button";
import { DataTable, type DataTableColumn } from "~/components/ui/DataTable";
import { EmptyState } from "~/components/ui/EmptyState";
import { ErrorState } from "~/components/ui/ErrorState";
import { InfoTile } from "~/components/ui/InfoTile";
import { LoadingState } from "~/components/ui/LoadingState";
import { MetricCard } from "~/components/ui/MetricCard";
import { Section } from "~/components/ui/Section";
import { Toolbar } from "~/components/ui/Toolbar";
import type { KnowledgeBase } from "~/types/knowledge";
import { Input } from "~/ui";
import { fetchAdminKnowledgeBases } from "~/utils/adminKnowledgeApi";
import {
  ClipboardCheckIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  MapIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UploadCloudIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminCyberPage } from "./AdminCyberPage";

const DEFAULT_KNOWLEDGE_BASE_ID = "default";

function formatDateTime(value?: string | null) {
  if (!value) return "暂无";
  return new Date(value).toLocaleString();
}

export function AdminKnowledgeBasesPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [baseQuery, setBaseQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBases = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAdminKnowledgeBases()
      .then((data) => {
        setBases(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadBases();
  }, [loadBases]);

  const totalPublished = bases.reduce(
    (sum, base) => sum + base.published_count,
    0,
  );
  const totalPending = bases.reduce(
    (sum, base) => sum + base.pending_review_count,
    0,
  );
  const defaultBase =
    bases.find((base) => base.id === DEFAULT_KNOWLEDGE_BASE_ID) ??
    bases[0] ??
    null;
  const knowledgeBaseColumns: Array<DataTableColumn<KnowledgeBase>> = [
    {
      cellClassName: "min-w-0",
      header: "名称",
      key: "name",
      render: (base) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{base.name}</div>
          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {base.description ?? "暂无描述"}
          </div>
        </div>
      ),
    },
    {
      className: "w-28",
      header: "已发布",
      key: "published",
      render: (base) => base.published_count,
    },
    {
      className: "w-28",
      header: "待审核",
      key: "pending",
      render: (base) => base.pending_review_count,
    },
    {
      className: "w-40",
      cellClassName: "text-xs text-muted-foreground",
      header: "最近更新",
      key: "updated",
      render: (base) => formatDateTime(base.updated_at),
    },
    {
      className: "w-40",
      header: "操作",
      key: "actions",
      render: () => (
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => navigate("/app/map")}
        >
          打开地图
        </Button>
      ),
    },
  ];
  const filteredBases = useMemo(() => {
    const keyword = baseQuery.trim().toLowerCase();
    if (!keyword) return bases;
    return bases.filter((base) =>
      [base.id, base.name, base.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [baseQuery, bases]);

  return (
    <AdminCyberPage
      actions={
        <>
          <Button type="button" variant="outline" onClick={loadBases}>
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button type="button" onClick={() => navigate("/app/upload")}>
            <UploadCloudIcon className="mr-2 h-4 w-4" />
            上传资料
          </Button>
        </>
      }
      eyebrow="后台 / 知识库"
      title="知识库管理"
      description="管理当前审核型科研知识库。第三版第一阶段以默认知识库为主，不引入复杂空间、成员权限或计费能力。"
    >
      {loading ? (
        <LoadingState label="正在加载知识库..." rows={4} />
      ) : error ? (
        <ErrorState description={error} onRetry={loadBases} />
      ) : bases.length === 0 ? (
        <EmptyState
          icon={<DatabaseIcon className="h-8 w-8" />}
          title="还没有可管理的知识库"
          description="系统通常会初始化默认知识库。请确认后端服务和数据库初始化状态。"
          action={
            <Button type="button" size="xs" onClick={loadBases}>
              重新加载
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <Toolbar>
            <div>
              <div className="text-sm font-semibold">知识库检索</div>
              <div className="mt-1 text-sm text-muted-foreground">
                当前展示 {filteredBases.length} / {bases.length} 个知识库。
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[520px] lg:flex-row lg:items-center lg:justify-end">
              <Input
                aria-label="搜索知识库"
                value={baseQuery}
                icon={<SearchIcon className="h-4 w-4 text-muted-foreground" />}
                onChange={(event) => setBaseQuery(event.target.value)}
                placeholder="搜索知识库名称、描述或 ID"
              />
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setBaseQuery("")}
                  disabled={!baseQuery}
                >
                  清空
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled
                  title="第三版第一阶段固定使用默认知识库，不扩展创建接口。"
                >
                  创建知识库（后续）
                </Button>
              </div>
            </div>
          </Toolbar>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={<DatabaseIcon className="h-4 w-4" />}
              title="知识库数量"
              value={bases.length}
              description="第三版当前以默认知识库为主"
            />
            <MetricCard
              icon={<MapIcon className="h-4 w-4" />}
              title="已发布条目"
              tone="success"
              value={totalPublished}
              description="会进入知识地图"
            />
            <MetricCard
              icon={<ClipboardCheckIcon className="h-4 w-4" />}
              title="待审核条目"
              tone={totalPending > 0 ? "warning" : "default"}
              value={totalPending}
              description="需要管理员处理"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Section
              title="默认知识库"
              description="第三版第一阶段用于演示和运行主流程的核心知识库。"
              actions={
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => navigate("/app/map")}
                >
                  打开地图
                </Button>
              }
            >
              {defaultBase ? (
                <div className="space-y-5">
                  <div className="rounded-[14px] border border-border bg-background p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">
                            {defaultBase.name}
                          </h2>
                          <span className="rounded-full border border-cyan-300/60 bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-100">
                            默认知识库
                          </span>
                        </div>
                        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                          {defaultBase.description ??
                            "用于高校科研资料审核入库和二维知识地图展示。"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        最近更新：{formatDateTime(defaultBase.updated_at)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[12px] border border-border bg-background p-4">
                      <div className="text-xs text-muted-foreground">
                        已发布
                      </div>
                      <div className="mt-2 text-2xl font-semibold">
                        {defaultBase.published_count}
                      </div>
                    </div>
                    <div className="rounded-[12px] border border-border bg-background p-4">
                      <div className="text-xs text-muted-foreground">
                        待审核
                      </div>
                      <div className="mt-2 text-2xl font-semibold">
                        {defaultBase.pending_review_count}
                      </div>
                    </div>
                    <div className="rounded-[12px] border border-border bg-background p-4">
                      <div className="text-xs text-muted-foreground">
                        地图规则
                      </div>
                      <div className="mt-2 text-sm font-medium">
                        仅展示已发布内容
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Button type="button" onClick={() => navigate("/app/map")}>
                      <MapIcon className="mr-2 h-4 w-4" />
                      打开知识地图
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/app/upload")}
                    >
                      <UploadCloudIcon className="mr-2 h-4 w-4" />
                      上传资料
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/admin/review")}
                    >
                      <ClipboardCheckIcon className="mr-2 h-4 w-4" />
                      审核队列
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  className="min-h-44"
                  title="未找到默认知识库"
                  description="当前返回了知识库列表，但没有匹配默认知识库。"
                />
              )}
            </Section>

            <aside className="space-y-4">
              <Section title="管理范围" description="第三版第一阶段的边界。">
                <div className="space-y-3">
                  <InfoTile>不做复杂组织空间、成员权限和计费能力。</InfoTile>
                  <InfoTile>上传资料先进入待审核，发布后才进入地图。</InfoTile>
                  <InfoTile>智能分析不是核心依赖，默认关闭。</InfoTile>
                </div>
              </Section>

              <Section title="快捷维护">
                <div className="space-y-3">
                  <Button
                    type="button"
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => navigate("/admin/manual-entry")}
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    手动新增知识节点
                  </Button>
                  <Button
                    type="button"
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => navigate("/embeddings")}
                  >
                    <FlaskConicalIcon className="mr-2 h-4 w-4" />
                    打开实验视图
                  </Button>
                </div>
              </Section>
            </aside>
          </div>

          <Section title="全部知识库" description="当前后端返回的知识库列表。">
            {filteredBases.length === 0 ? (
              <EmptyState
                className="min-h-56"
                icon={<DatabaseIcon className="h-8 w-8" />}
                title="没有匹配的知识库"
                description="请调整搜索关键词，或清空筛选后查看全部知识库。"
                action={
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => setBaseQuery("")}
                  >
                    清空搜索
                  </Button>
                }
              />
            ) : (
              <DataTable
                columns={knowledgeBaseColumns}
                rows={filteredBases}
                getRowKey={(base) => base.id}
              />
            )}
          </Section>
        </div>
      )}
    </AdminCyberPage>
  );
}
