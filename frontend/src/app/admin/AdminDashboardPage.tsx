import {
  getItemTypeLabel,
  itemTypeOptions,
} from "~/components/review/KnowledgeItemForm";
import type {
  ItemType,
  KnowledgeBase,
  KnowledgeItem,
  KnowledgeMapResponse,
} from "~/types/knowledge";
import { cn } from "~/ui";
import {
  fetchAdminKnowledgeBases,
  fetchAdminKnowledgeMap,
  fetchAdminReviewItems,
} from "~/utils/adminKnowledgeApi";
import {
  BookOpenIcon,
  DatabaseIcon,
  FileTextIcon,
  FlaskConicalIcon,
  FolderIcon,
  GraduationCapIcon,
  MoreHorizontalIcon,
  RadioIcon,
  ServerCogIcon,
  UsersIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

const MOCK_USER_METRICS = {
  activeToday: 42,
  onlineUsers: 18,
  totalUsers: 186,
};

const itemTypeIcons: Record<ItemType, ReactNode> = {
  paper: <FileTextIcon className="h-4 w-4" />,
  experiment_record: <FlaskConicalIcon className="h-4 w-4" />,
  note: <BookOpenIcon className="h-4 w-4" />,
  project_doc: <FolderIcon className="h-4 w-4" />,
  course_material: <GraduationCapIcon className="h-4 w-4" />,
  other: <MoreHorizontalIcon className="h-4 w-4" />,
};

type CategoryStat = {
  itemType: ItemType;
  label: string;
  pending: number;
  published: number;
  total: number;
};

function CyberPanel({
  actions,
  children,
  className,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: string;
}) {
  return (
    <section
      className={cn(
        `
          relative overflow-hidden rounded-[6px] border border-cyan-400/45
          bg-[#041329]/80 shadow-[inset_0_0_26px_rgba(14,165,233,0.12),0_0_22px_rgba(14,165,233,0.12)]
        `,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.15),transparent_26%,transparent_74%,rgba(34,211,238,0.1))]" />
      <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-cyan-300" />
      <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-cyan-300" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-cyan-300" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-cyan-300" />
      {(title || description || actions) && (
        <div className="relative flex items-start justify-between gap-4 border-b border-cyan-400/20 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-cyan-50">{title}</h2>}
            {description && (
              <div className="mt-1 text-xs text-cyan-100/55">{description}</div>
            )}
          </div>
          {actions}
        </div>
      )}
      <div className="relative p-5">{children}</div>
    </section>
  );
}

function MetricBox({
  detail,
  icon,
  label,
  value,
}: {
  detail: ReactNode;
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <CyberPanel className="min-h-[128px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-cyan-100/65">{label}</div>
          <div className="mt-3 text-3xl font-semibold leading-none text-cyan-50">
            {value}
          </div>
          <div className="mt-4 text-xs text-cyan-100/55">{detail}</div>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 p-3 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.22)]">
          {icon}
        </div>
      </div>
    </CyberPanel>
  );
}

function CyberButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-[6px] border border-cyan-300/55 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-50 shadow-[inset_0_0_18px_rgba(14,165,233,0.14)] transition-colors hover:bg-cyan-400/20"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function AdminDashboardPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [mapData, setMapData] = useState<KnowledgeMapResponse>({
    clusters: [],
    points: [],
  });
  const [reviewItems, setReviewItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAdminKnowledgeBases(),
      fetchAdminKnowledgeMap(),
      fetchAdminReviewItems(),
    ])
      .then(([nextBases, nextMapData, nextReviewItems]) => {
        setBases(nextBases);
        setMapData(nextMapData);
        setReviewItems(nextReviewItems.items);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const publishedCount = mapData.points.length;
  const reviewWorkCount = reviewItems.length;
  const pendingCount = bases.reduce(
    (sum, base) => sum + base.pending_review_count,
    0,
  );

  const categoryStats = useMemo<CategoryStat[]>(() => {
    return itemTypeOptions.map((option) => {
      const published = mapData.points.filter(
        (point) => point.item_type === option.value,
      ).length;
      const pending = reviewItems.filter(
        (item) => item.item_type === option.value,
      ).length;
      return {
        itemType: option.value,
        label: getItemTypeLabel(option.value),
        pending,
        published,
        total: published + pending,
      };
    });
  }, [mapData.points, reviewItems]);

  const maxCategoryTotal = Math.max(
    1,
    ...categoryStats.map((category) => category.total),
  );
  const totalMaterialCount = categoryStats.reduce(
    (sum, category) => sum + category.total,
    0,
  );

  const nowText = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const recentReviewItems = reviewItems.slice(0, 3);

  return (
    <main className="h-full overflow-y-auto bg-[#020817] text-cyan-50">
      <div className="relative min-h-full overflow-hidden px-6 py-5">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="pointer-events-none absolute right-12 top-12 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-[1500px] space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-cyan-100/65">
                管理控制台
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-wide text-cyan-50">
                管理后台数据大屏
              </h1>
              <p className="mt-2 text-sm text-cyan-100/65">
                实时监控科研知识库运行状态，支持审核发布、知识管理与平台运维。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-cyan-100/70">
              <span>{nowText}</span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                系统正常
              </span>
              <CyberButton onClick={() => navigate("/admin/review")}>
                进入审核队列
              </CyberButton>
            </div>
          </div>

          {loading ? (
            <CyberPanel>
              <div className="h-48 animate-pulse rounded bg-cyan-400/10" />
            </CyberPanel>
          ) : error ? (
            <CyberPanel title="管理概览加载失败">
              <div className="space-y-4">
                <p className="text-sm text-rose-200">{error}</p>
                <CyberButton onClick={() => window.location.reload()}>
                  重新加载
                </CyberButton>
              </div>
            </CyberPanel>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricBox
                  label="当前用户总数"
                  value={MOCK_USER_METRICS.totalUsers}
                  detail="较昨日 ↑ 12"
                  icon={<UsersIcon className="h-8 w-8" />}
                />
                <MetricBox
                  label="当前在线用户"
                  value={MOCK_USER_METRICS.onlineUsers}
                  detail="较昨日 ↑ 3"
                  icon={<RadioIcon className="h-8 w-8" />}
                />
                <MetricBox
                  label="资料总数"
                  value={totalMaterialCount}
                  detail={`已发布 ${publishedCount} / 待处理 ${reviewWorkCount}`}
                  icon={<FileTextIcon className="h-8 w-8" />}
                />
                <MetricBox
                  label="知识库数量"
                  value={bases.length}
                  detail={`${pendingCount} 条待审核资料`}
                  icon={<DatabaseIcon className="h-8 w-8" />}
                />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.9fr)]">
                <div className="space-y-5">
                  <CyberPanel
                    title="资料类别总览"
                    description="按资料类型汇总已发布节点和后台待处理条目"
                    actions={
                      <span className="rounded-full border border-cyan-300/30 px-3 py-1 text-xs text-cyan-100/80">
                        {totalMaterialCount} 条资料
                      </span>
                    }
                  >
                    <div className="grid grid-cols-[1fr_70px_70px_70px] gap-3 px-3 pb-3 text-xs text-cyan-100/55">
                      <span>类型</span>
                      <span className="text-right">已发布</span>
                      <span className="text-right">待处理</span>
                      <span className="text-right">总数</span>
                    </div>
                    <div className="space-y-3">
                      {categoryStats.map((category) => (
                        <div
                          key={category.itemType}
                          className="grid items-center gap-3 rounded-[8px] border border-cyan-400/10 bg-cyan-400/[0.04] px-3 py-3 sm:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1fr)_70px_70px_70px]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
                              {itemTypeIcons[category.itemType]}
                            </span>
                            <span className="font-medium text-cyan-50">
                              {category.label}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-cyan-950">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]"
                              style={{
                                width: `${Math.max(
                                  5,
                                  (category.total / maxCategoryTotal) * 100,
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-right text-cyan-100/75">
                            {category.published}
                          </span>
                          <span className="text-right text-cyan-100/75">
                            {category.pending}
                          </span>
                          <span className="text-right text-lg font-semibold text-cyan-50">
                            {category.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CyberPanel>

                  <CyberPanel title="知识库概览">
                    <div className="grid gap-5 md:grid-cols-[140px_minmax(0,1fr)]">
                      <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-blue-500 bg-blue-500/10 text-center shadow-[0_0_28px_rgba(59,130,246,0.55)]">
                        <div>
                          <div className="text-3xl font-semibold">
                            {bases.length}
                          </div>
                          <div className="text-xs text-cyan-100/55">
                            总知识库
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[8px] border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {bases[0]?.name ?? "默认知识库"}
                          </span>
                          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200">
                            默认
                          </span>
                        </div>
                        <div className="mt-3 text-sm text-cyan-100/65">
                          已发布 {publishedCount} / 待处理 {pendingCount} 条
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-cyan-950">
                          <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                        </div>
                      </div>
                    </div>
                  </CyberPanel>
                </div>

                <div className="space-y-5">
                  <CyberPanel
                    title="实时运行态"
                    description="平台运行状态与关键指标"
                    actions={
                      <button
                        type="button"
                        className="text-xs font-medium text-cyan-300 hover:text-cyan-100"
                      >
                        查看详情 &gt;
                      </button>
                    }
                  >
                    <div className="relative overflow-hidden rounded-[8px] border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
                      <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full border border-cyan-400/25" />
                      <div className="absolute -right-8 bottom-3 h-24 w-24 rounded-full border border-cyan-400/30" />
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-100/65">今日活跃用户</span>
                          <span className="text-2xl font-semibold">
                            {MOCK_USER_METRICS.activeToday}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-100/65">今日访问量</span>
                          <span className="text-2xl font-semibold">128</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-100/65">系统负载</span>
                          <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs text-emerald-300">
                            健康
                          </span>
                        </div>
                      </div>
                    </div>
                  </CyberPanel>

                  <CyberPanel
                    title="审核队列"
                    description="待处理资料需要管理员审核"
                    actions={
                      <button
                        type="button"
                        className="text-xs font-medium text-cyan-300 hover:text-cyan-100"
                        onClick={() => navigate("/admin/review")}
                      >
                        进入审核队列 &gt;
                      </button>
                    }
                  >
                    <div className="space-y-3">
                      {(recentReviewItems.length > 0
                        ? recentReviewItems
                        : [
                            {
                              id: "mock-review-1",
                              source_name: "示例：课程设计说明文档.pdf",
                              title: "示例：课程设计说明文档",
                            },
                            {
                              id: "mock-review-2",
                              source_name: "示例：深度学习综述.pdf",
                              title: "示例：深度学习综述",
                            },
                          ]
                      ).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-[8px] border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm text-cyan-50">
                              {item.title ?? item.source_name ?? "待审核资料"}
                            </div>
                            <div className="mt-1 text-xs text-cyan-100/50">
                              上传者：演示用户 · 上传时间：{nowText}
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-medium text-orange-300">
                            待处理
                          </span>
                        </div>
                      ))}
                    </div>
                  </CyberPanel>

                  <CyberPanel title="智能分析状态" description="智能分析与生成服务">
                    <div className="flex items-center justify-between rounded-[8px] border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                          <ServerCogIcon className="h-6 w-6" />
                        </span>
                        <div>
                          <div className="text-lg font-semibold">默认关闭</div>
                          <div className="text-sm text-cyan-100/55">
                            无密钥、无虚拟专用网络可运行
                          </div>
                        </div>
                      </div>
                      <div className="flex h-7 w-12 items-center rounded-full border border-cyan-300/20 bg-slate-800 px-1">
                        <span className="h-5 w-5 rounded-full bg-slate-200" />
                      </div>
                    </div>
                  </CyberPanel>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
