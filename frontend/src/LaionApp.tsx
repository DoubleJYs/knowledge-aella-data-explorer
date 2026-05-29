import { useSwipeRightDetector } from "~/lib/ui-shared";
import {
  Button,
  Card,
  Centered,
  Checkbox,
  cn,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  InferenceIcon,
  Input,
  Label,
  Row,
  Select,
  Sheet,
  SheetContent,
  SheetTrigger,
  Skeleton,
  Slider,
  ThemeToggle,
} from "~/ui";
import {
  AtomIcon,
  BarChart3Icon,
  BarChartIcon,
  ChartNetworkIcon,
  LayoutGridIcon,
  Menu,
  MicroscopeIcon,
  NetworkIcon,
  PlusIcon,
  SunMoonIcon,
} from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import LaionDarkLogo from "./assets/logos/Laion-dark.svg";
import LaionLightLogo from "./assets/logos/Laion-light.svg";
import { ClusterLegend } from "./components/ClusterLegend";
import { ClusterVisualization } from "./components/ClusterVisualization";
import { DistributionChart } from "./components/DistributionChart";
import { ForceDirectedCluster } from "./components/ForceDirectedCluster";
import { LearnMoreContent } from "./components/LearnMoreContent";
import { LearnMoreSheet } from "./components/LearnMoreSheet";
import { PaperDetail } from "./components/PaperDetail";
import { PaperSampleViewer } from "./components/PaperSampleViewer";
import type { HeatmapSortOption } from "./components/TemporalHeatmap";
import { TemporalHeatmap } from "./components/TemporalHeatmap";
import type {
  StackedSortOption,
  StackMode,
} from "./components/TemporalStackedChart";
import { TemporalStackedChart } from "./components/TemporalStackedChart";
import type {
  ClusterInfo,
  ClustersResponse,
  PapersResponse,
  PaperSummary,
} from "./types";
import { fetchCompressed, getApiUrl } from "./utils/api";
import type { LayoutType } from "./utils/layoutTransforms";
import { getPathFromViewMode, getViewModeFromPath } from "./utils/routeMapping";
import type { ViewMode } from "./utils/routeMapping";

type SwipeableSheetContentProps = {
  children: React.ReactNode;
  className?: string;
  setMobileMenuOpen: (open: boolean) => void;
};

function SwipeableSheetContent({
  children,
  className = "",
  setMobileMenuOpen,
}: SwipeableSheetContentProps) {
  const { onTouchEnd, onTouchMove, onTouchStart } =
    useSwipeRightDetector(setMobileMenuOpen);

  return (
    <SheetContent
      className={cn(
        `
          fixed right-0 top-0 flex h-full w-full flex-col px-0 pt-6

          sm:w-[350px]
        `,
        className,
      )}
      closeButtonAriaLabel="关闭移动端导航菜单"
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onTouchStart={onTouchStart}
      side="right"
    >
      <DialogTitle className="border-b pb-6 pl-5">
        <div className="flex items-center">
          <a
            href="https://inference.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <InferenceIcon height={20} width={120} />
          </a>
          <PlusIcon className="ml-4 h-4 w-4 text-muted-foreground" />
          <a
            href="https://laion.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <img
              src={LaionLightLogo}
              alt="LAION"
              className={`
                h-12

                dark:hidden
              `}
            />
            <img
              src={LaionDarkLogo}
              alt="LAION"
              className={`
                hidden h-12

                dark:block
              `}
            />
          </a>
        </div>
      </DialogTitle>
      <DialogDescription className="hidden">
        数据集控制项和聚类图例导航菜单。
      </DialogDescription>
      <div className="flex-1 overflow-hidden">{children}</div>
    </SheetContent>
  );
}

type MobileNavigationProps = {
  viewMode: "3d" | "heatmap" | "stacked" | "distribution" | "samples" | "force";
  onRandomPaper: () => void;
  clusters: ClusterInfo[];
  selectedClusterIds: Set<number>;
  onToggleCluster: (clusterId: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectRandom: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  totalPapers: number;
  setMobileMenuOpen: (open: boolean) => void;
  loading: boolean;
  onEmailCTAClick: () => void;
};

function MobileNavigation({
  clusters,
  loading,
  onClearAll,
  onEmailCTAClick,
  onRandomPaper,
  onSearchChange,
  onSearchSubmit,
  onSelectAll,
  onSelectRandom,
  onToggleCluster,
  searchQuery,
  selectedClusterIds,
  setMobileMenuOpen,
  totalPapers,
  viewMode,
}: MobileNavigationProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="space-y-4 p-4">
        <div
          className={`space-y-3 rounded-lg border border-border bg-muted/50 p-4`}
        >
          <div className="flex items-start gap-3">
            <AtomIcon
              className={`mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground`}
            />
            <div>
              <h3 className="text-sm font-semibold">Aella 数据集探索器</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                这是一个包含 100,000 篇科研论文结构化摘要的数据集，摘要由定制微调模型生成。
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                在桌面端查看可使用更多可视化方式和控制项。
              </p>
              <Button
                type="button"
                onClick={() => {
                  onEmailCTAClick();
                  setMobileMenuOpen(false);
                }}
                variant="default"
                size="xs"
                className="mt-4 flex w-full items-center justify-center gap-2"
              >
                想了解完整数据集？
              </Button>
            </div>
          </div>
        </div>

        {/* Controls for 3D View */}
        {!loading && (
          <div className="space-y-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                onRandomPaper();
                setMobileMenuOpen(false);
              }}
              variant="outline"
              size="xs"
              className="flex w-full items-center gap-2"
            >
              <MicroscopeIcon className="h-4 w-4" />
              随机选择论文
            </Button>
          </div>
        )}

        {/* Theme Toggle */}
        <div>
          <ThemeToggle
            trigger={
              <Button
                variant="outline"
                size="xs"
                className="flex w-full items-center gap-2"
              >
                <SunMoonIcon className="h-4 w-4" />
                切换主题
              </Button>
            }
          />
        </div>

        {/* Cluster Legend */}
        {loading ? (
          <div className="space-y-3 border-t pt-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="border-t pt-4">
            <ClusterLegend
              clusters={clusters}
              selectedClusterIds={selectedClusterIds}
              onToggleCluster={onToggleCluster}
              onSelectAll={onSelectAll}
              onClearAll={onClearAll}
              onSelectRandom={onSelectRandom}
              isCollapsed={false}
              onToggleCollapse={() => null}
              viewMode={viewMode}
              paperSearchQuery={searchQuery}
              onPaperSearchChange={onSearchChange}
              onPaperSearchSubmit={onSearchSubmit}
              totalPapers={totalPapers}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function LaionApp() {
  const posthog = usePostHog();
  const [location, setLocation] = useLocation();

  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);
  const [selectedClusterIds, setSelectedClusterIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [allPapers, setAllPapers] = useState<PaperSummary[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    getViewModeFromPath(location),
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>("original");
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(() => {
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcomeDialog");
    return hasSeenWelcome !== "true";
  });
  const [learnMoreSheetOpen, setLearnMoreSheetOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSubmitSuccess, setEmailSubmitSuccess] = useState(false);
  const [interestedInFullDataset, setInterestedInFullDataset] = useState(true);
  const [interestedInModelTraining, setInterestedInModelTraining] =
    useState(false);
  const [hasOpenedPaperDetail, setHasOpenedPaperDetail] = useState(false);

  // Heatmap controls
  const [heatmapMinYear, setHeatmapMinYear] = useState(1990);
  const [heatmapMaxYear, setHeatmapMaxYear] = useState(2025);
  const [heatmapTopN, setHeatmapTopN] = useState(30);
  const [heatmapSortBy, setHeatmapSortBy] =
    useState<HeatmapSortOption>("total");
  const [heatmapColorScale, setHeatmapColorScale] = useState("Viridis");
  const [heatmapNormalizeByYear, setHeatmapNormalizeByYear] = useState(false);

  // Stacked chart controls
  const [stackedMinYear, setStackedMinYear] = useState(1990);
  const [stackedMaxYear, setStackedMaxYear] = useState(2025);
  const [stackedTopN, setStackedTopN] = useState(20);
  const [stackedStackMode, setStackedStackMode] =
    useState<StackMode>("absolute");
  const [stackedSortBy, setStackedSortBy] =
    useState<StackedSortOption>("total");
  const [stackedShowOther, setStackedShowOther] = useState(false);

  // Distribution chart controls
  const [distributionTopN, setDistributionTopN] = useState(100);
  const [totalClusters, setTotalClusters] = useState(100);

  // Store in local storage when welcome dialog is closed
  useEffect(() => {
    if (!welcomeDialogOpen) {
      localStorage.setItem("hasSeenWelcomeDialog", "true");
    }
  }, [welcomeDialogOpen]);

  // Sync viewMode changes to URL (except for samples mode, which manages its own URL with paper index)
  useEffect(() => {
    // Skip URL updates for samples mode - PaperSampleViewer manages its own URL including paper index
    if (viewMode === "samples") {
      return;
    }

    const newPath = getPathFromViewMode(viewMode);
    if (location !== newPath) {
      setLocation(newPath);
    }
  }, [viewMode, location, setLocation]);

  // Sync URL changes to viewMode (for browser back/forward)
  useEffect(() => {
    const newViewMode = getViewModeFromPath(location);
    if (newViewMode !== viewMode) {
      setViewMode(newViewMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Track when user opens their first paper detail
  useEffect(() => {
    if (selectedPaperId !== null && !hasOpenedPaperDetail) {
      setHasOpenedPaperDetail(true);
    }
  }, [selectedPaperId, hasOpenedPaperDetail]);

  // Trigger window resize when sidebar is collapsed/expanded to force plot to resize
  useEffect(() => {
    // Small delay to let CSS transition complete
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 350);
    return () => clearTimeout(timer);
  }, [sidebarCollapsed]);

  // Fetch papers and clusters on mount
  useEffect(() => {
    Promise.all([
      fetchCompressed<PapersResponse>(getApiUrl("/api/papers")),
      fetch(getApiUrl("/api/clusters")).then((res) => res.json()),
    ])
      .then(
        ([papersData, clustersData]: [PapersResponse, ClustersResponse]) => {
          setAllPapers(papersData.papers);
          setClusters(clustersData.clusters);
          setLoading(false);
        },
      )
      .catch((err: Error) => {
        console.error("Error fetching papers and clusters", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Force embeddings view on mobile regardless of URL
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 1024 && viewMode !== "3d") {
        setViewMode("3d");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [viewMode]);

  // Always filter for full text papers only
  useEffect(() => {
    setPapers(allPapers.filter((p) => p.classification === "FULL_TEXT"));
  }, [allPapers]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      // If search is empty, reset to all papers
      fetchCompressed<PapersResponse>(getApiUrl("/api/papers"))
        .then((data) => setAllPapers(data.papers))
        .catch((err: Error) => setError(err.message));
      return;
    }

    fetchCompressed<PapersResponse>(
      getApiUrl(`/api/search?q=${encodeURIComponent(searchQuery)}`),
    )
      .then((data) => setAllPapers(data.papers))
      .catch((err: Error) => setError(err.message));
  };

  const handleToggleCluster = (clusterId: number) => {
    const newSelected = new Set(selectedClusterIds);
    if (newSelected.has(clusterId)) {
      newSelected.delete(clusterId);
    } else {
      newSelected.add(clusterId);
    }
    setSelectedClusterIds(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedClusterIds(new Set());
  };

  const handleClearAll = () => {
    setSelectedClusterIds(new Set(clusters.map(() => -1))); // Select none by using invalid IDs
  };

  const handleSelectRandom = () => {
    if (clusters.length === 0) return;
    const randomIndex = Math.floor(Math.random() * clusters.length);
    const randomCluster = clusters[randomIndex];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (randomCluster) {
      setSelectedClusterIds(new Set([randomCluster.cluster_id]));
    }
  };

  const handleRandomPaper = () => {
    if (papers.length === 0) return;
    const randomIndex = Math.floor(Math.random() * papers.length);
    const randomPaper = papers[randomIndex];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (randomPaper) {
      setSelectedPaperId(randomPaper.id);
    }
  };

  const handleHeatmapClick = (clusterId: number, year: number) => {
    // Filter papers by cluster and year, then show the first one
    const filteredPapers = papers.filter(
      (p) => p.cluster_id === clusterId && p.publication_year === year,
    );
    if (filteredPapers.length > 0 && filteredPapers[0]) {
      setSelectedPaperId(filteredPapers[0].id);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("请输入邮箱");
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError("请输入有效的邮箱地址");
      return;
    }

    // Clear any previous errors and start submitting
    setEmailError("");
    setEmailSubmitting(true);

    try {
      // Track email submission in PostHog
      posthog.capture("email_submitted", {
        email,
        interested_in_full_dataset: interestedInFullDataset,
        interested_in_model_training: interestedInModelTraining,
      });

      // Show success state
      setEmailSubmitSuccess(true);

      // Close dialog after a delay to show success message
      setTimeout(() => {
        setEmailDialogOpen(false);
        // Reset form state after dialog closes
        setTimeout(() => {
          setEmail("");
          setEmailError("");
          setEmailSubmitting(false);
          setEmailSubmitSuccess(false);
          setInterestedInFullDataset(true);
          setInterestedInModelTraining(false);
        }, 300); // Wait for dialog close animation
      }, 1500); // Show success for 1.5 seconds
    } catch (err: unknown) {
      console.error("Error submitting email", err);
      setEmailError("提交失败，请重试。");
      setEmailSubmitting(false);
    }
  };

  if (error) {
    return (
      <Centered className="flex h-screen flex-col bg-background">
        <Card
          className={`
            flex flex-col items-center justify-center gap-6 p-6 py-8 text-xl
          `}
        >
          <h3 className="font-semibold">加载失败</h3>
          <p className="text-muted-foreground">请稍后重试。</p>
        </Card>
      </Centered>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <style>{`
        @keyframes shimmer {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
        .shimmer-text {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
      <header
        className={cn(`
          border-b border-border bg-background text-foreground shadow-md

          lg:hidden
        `)}
      >
        {/* First row: logos and menu */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <a
              href="https://inference.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <InferenceIcon height={20} width={120} />
            </a>
            <PlusIcon className="ml-3 h-3 w-3 text-muted-foreground" />
            <a
              href="https://laion.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <img
                src={LaionLightLogo}
                alt="LAION"
                className={`
                  h-10

                  dark:hidden
                `}
              />
              <img
                src={LaionDarkLogo}
                alt="LAION"
                className={`
                  hidden h-10

                  dark:block
                `}
              />
            </a>
          </div>
          <Sheet onOpenChange={setMobileMenuOpen} open={mobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                aria-label="打开移动端导航菜单"
                size="icon"
                variant="ghost"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SwipeableSheetContent setMobileMenuOpen={setMobileMenuOpen}>
              <MobileNavigation
                viewMode={viewMode}
                onRandomPaper={handleRandomPaper}
                clusters={clusters}
                selectedClusterIds={selectedClusterIds}
                onToggleCluster={handleToggleCluster}
                onSelectAll={handleSelectAll}
                onClearAll={handleClearAll}
                onSelectRandom={handleSelectRandom}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={handleSearch}
                totalPapers={papers.length}
                setMobileMenuOpen={setMobileMenuOpen}
                loading={loading}
                onEmailCTAClick={() => setEmailDialogOpen(true)}
              />
            </SwipeableSheetContent>
          </Sheet>
        </div>
        {/* Second row: cluster plot select and what is this button */}
        <div
          className={`
            flex items-center justify-between border-t border-border px-4 py-2
          `}
        >
          {loading ? (
            <span className="text-sm text-muted-foreground">加载中...</span>
          ) : viewMode === "3d" ? (
            <Select
              value={layoutType}
              onValueChange={(value) => setLayoutType(value as LayoutType)}
              options={[
                { value: "original", label: "嵌入视图" },
                { value: "sphere", label: "球面" },
                { value: "galaxy", label: "星系" },
                { value: "wave", label: "波形" },
                { value: "helix", label: "螺旋" },
                { value: "torus", label: "环面" },
              ]}
              placeholder="选择布局"
              className="w-[160px]"
            />
          ) : (
            <div />
          )}
          <Button
            size="xs"
            onClick={() => setLearnMoreSheetOpen(true)}
            variant="outline"
          >
            <AtomIcon className="mr-1.5 h-3.5 w-3.5" />
            这是什么？
          </Button>
        </div>
      </header>
      <header
        className={`
          hidden border-b border-border bg-background text-foreground shadow-md

          lg:block
        `}
      >
        <div className="space-y-1 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setViewMode("3d")}
                variant={viewMode === "3d" ? "default" : "outline"}
                size="xs"
                className="flex w-fit items-center justify-start gap-1.5"
              >
                <ChartNetworkIcon className="h-3.5 w-3.5" />
                嵌入视图
              </Button>
              <Button
                type="button"
                onClick={() => setViewMode("force")}
                variant={viewMode === "force" ? "default" : "outline"}
                size="xs"
                className="flex w-fit items-center justify-start gap-1.5"
              >
                <NetworkIcon className="h-3.5 w-3.5" />
                力导向图
              </Button>
              <Button
                type="button"
                onClick={() => setViewMode("distribution")}
                variant={viewMode === "distribution" ? "default" : "outline"}
                size="xs"
                className="flex w-32 items-center gap-1.5"
              >
                <BarChart3Icon className="h-3.5 w-3.5" />
                分布图
              </Button>
              <Button
                type="button"
                onClick={() => setViewMode("stacked")}
                variant={viewMode === "stacked" ? "default" : "outline"}
                size="xs"
                className="flex w-fit items-center justify-start gap-1.5"
              >
                <BarChartIcon className="h-3.5 w-3.5" />
                堆叠图
              </Button>
              <Button
                type="button"
                onClick={() => setViewMode("heatmap")}
                variant={viewMode === "heatmap" ? "default" : "outline"}
                size="xs"
                className="flex w-fit items-center justify-start gap-1.5"
              >
                <LayoutGridIcon className="h-3.5 w-3.5" />
                热力图
              </Button>
              {viewMode === "3d" && (
                <span
                  className={`
                    ml-2 text-xs text-muted-foreground

                    ${!hasOpenedPaperDetail ? "shimmer-text" : ""}
                  `}
                >
                  按住 Cmd/Ctrl 并点击聚类节点，可打开论文详情
                </span>
              )}
            </div>
            <Row className="items-center gap-4">
              {!loading && viewMode === "3d" && (
                <>
                  <Select
                    value={layoutType}
                    onValueChange={(value) =>
                      setLayoutType(value as LayoutType)
                    }
                    options={[
                      { value: "original", label: "嵌入视图" },
                      { value: "sphere", label: "球面" },
                      { value: "galaxy", label: "星系" },
                      { value: "wave", label: "波形" },
                      { value: "helix", label: "螺旋" },
                      { value: "torus", label: "环面" },
                    ]}
                    placeholder="选择布局"
                    className="w-[180px]"
                  />
                  <Button
                    type="button"
                    onClick={handleRandomPaper}
                    variant="outline"
                    size="xs"
                    className="flex items-center gap-2"
                  >
                    <MicroscopeIcon className="h-4 w-4" />
                    随机选择论文
                  </Button>
                </>
              )}
              {!loading && viewMode === "distribution" && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-foreground">
                    聚类数：{" "}
                    <span className="font-semibold">{distributionTopN}</span>
                  </label>
                  <Slider
                    aria-label="要显示的聚类数量"
                    className="w-48"
                    value={[distributionTopN]}
                    min={10}
                    max={totalClusters}
                    step={1}
                    onValueChange={([value]) =>
                      value && setDistributionTopN(value)
                    }
                  />
                </div>
              )}
            </Row>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {viewMode === "3d" ? (
          <>
            <aside
              className={`
                hidden overflow-y-auto border-r border-border bg-background
                shadow-sm transition-all duration-300

                lg:block

                ${sidebarCollapsed ? "w-10 overflow-hidden" : "w-[360px]"}
              `}
            >
              {loading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-10 w-full" />
                  <Row className="gap-4">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-8 w-1/3" />
                  </Row>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <ClusterLegend
                  clusters={clusters}
                  selectedClusterIds={selectedClusterIds}
                  onToggleCluster={handleToggleCluster}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                  onSelectRandom={handleSelectRandom}
                  isCollapsed={sidebarCollapsed}
                  onToggleCollapse={() =>
                    setSidebarCollapsed(!sidebarCollapsed)
                  }
                  viewMode={viewMode}
                  paperSearchQuery={searchQuery}
                  onPaperSearchChange={setSearchQuery}
                  onPaperSearchSubmit={handleSearch}
                  totalPapers={papers.length}
                />
              )}
            </aside>
            <main className="flex-1 overflow-hidden bg-background p-0">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="relative">
                    <Skeleton className="h-96 w-96 rounded-full" />
                    <span
                      className={`
                        absolute left-1/2 top-1/2 -translate-x-1/2
                        -translate-y-1/2 text-base text-muted-foreground

                        lg:hidden
                      `}
                    >
                      正在加载可视化...
                    </span>
                  </div>
                </div>
              ) : (
                <ClusterVisualization
                  papers={papers}
                  clusters={clusters}
                  onPaperClick={(paperId) => {
                    if (!selectedPaperId) {
                      setSelectedPaperId(paperId);
                    }
                  }}
                  selectedClusterIds={selectedClusterIds}
                  layoutType={layoutType}
                />
              )}
            </main>
          </>
        ) : viewMode === "distribution" ? (
          <main className="flex-1 overflow-hidden bg-background">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="relative">
                  <Skeleton className="h-96 w-96 rounded-full" />
                  <span
                    className={`
                      absolute left-1/2 top-1/2 -translate-x-1/2
                      -translate-y-1/2 text-base text-muted-foreground

                      lg:hidden
                    `}
                  >
                    正在加载分布图...
                  </span>
                </div>
              </div>
            ) : (
              <DistributionChart
                onClusterClick={(clusterId) => {
                  // When clicking a cluster in the distribution chart, switch to 3D view and select that cluster
                  setViewMode("3d");
                  setSelectedClusterIds(new Set([clusterId]));
                }}
                topN={distributionTopN}
                onTotalClustersLoaded={setTotalClusters}
              />
            )}
          </main>
        ) : viewMode === "heatmap" ? (
          <main className="flex-1 overflow-hidden bg-background">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="relative">
                  <Skeleton className="h-96 w-96 rounded-full" />
                  <span
                    className={`
                      absolute left-1/2 top-1/2 -translate-x-1/2
                      -translate-y-1/2 text-base text-muted-foreground

                      lg:hidden
                    `}
                  >
                    正在加载热力图...
                  </span>
                </div>
              </div>
            ) : (
              <TemporalHeatmap
                onPaperClick={handleHeatmapClick}
                minYear={heatmapMinYear}
                maxYear={heatmapMaxYear}
                topN={heatmapTopN}
                sortBy={heatmapSortBy}
                colorScale={heatmapColorScale}
                normalizeByYear={heatmapNormalizeByYear}
                onMinYearChange={setHeatmapMinYear}
                onMaxYearChange={setHeatmapMaxYear}
                onTopNChange={setHeatmapTopN}
                onSortByChange={setHeatmapSortBy}
                onColorScaleChange={setHeatmapColorScale}
                onNormalizeByYearChange={setHeatmapNormalizeByYear}
              />
            )}
          </main>
        ) : viewMode === "samples" ? (
          <main className="flex-1 overflow-hidden bg-background">
            <PaperSampleViewer
              clusters={clusters}
              currentPath={location}
              onPathChange={setLocation}
            />
          </main>
        ) : viewMode === "force" ? (
          <main className="flex-1 overflow-hidden bg-background">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="relative">
                  <Skeleton className="h-96 w-96 rounded-full" />
                  <span
                    className={`
                      absolute left-1/2 top-1/2 -translate-x-1/2
                      -translate-y-1/2 text-base text-muted-foreground

                      lg:hidden
                    `}
                  >
                    正在加载力导向图...
                  </span>
                </div>
              </div>
            ) : (
              <ForceDirectedCluster
                papers={papers}
                clusters={clusters}
                onPaperClick={(paperId) => setSelectedPaperId(paperId)}
                selectedClusterIds={selectedClusterIds}
              />
            )}
          </main>
        ) : (
          <main className="flex-1 overflow-hidden bg-background">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="relative">
                  <Skeleton className="h-96 w-96 rounded-full" />
                  <span
                    className={`
                      absolute left-1/2 top-1/2 -translate-x-1/2
                      -translate-y-1/2 text-base text-muted-foreground

                      lg:hidden
                    `}
                  >
                    正在加载堆叠图...
                  </span>
                </div>
              </div>
            ) : (
              <TemporalStackedChart
                onPaperClick={handleHeatmapClick}
                minYear={stackedMinYear}
                maxYear={stackedMaxYear}
                topN={stackedTopN}
                stackMode={stackedStackMode}
                sortBy={stackedSortBy}
                showOther={stackedShowOther}
                onMinYearChange={setStackedMinYear}
                onMaxYearChange={setStackedMaxYear}
                onTopNChange={setStackedTopN}
                onStackModeChange={setStackedStackMode}
                onSortByChange={setStackedSortBy}
                onShowOtherChange={setStackedShowOther}
              />
            )}
          </main>
        )}
      </div>
      <PaperDetail
        paperId={selectedPaperId}
        onClose={() => setSelectedPaperId(null)}
        onPaperClick={(paperId) => {
          setSelectedPaperId(paperId);
          if (!hasOpenedPaperDetail) {
            setHasOpenedPaperDetail(true);
          }
        }}
        clusters={clusters}
      />
      <DialogRoot open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>欢迎使用科学数据集探索器</DialogTitle>
            <DialogDescription>
              探索综合性的科研论文数据集
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <LearnMoreContent />
          </div>
          <DialogFooter className="flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setWelcomeDialogOpen(false);
                setLearnMoreSheetOpen(true);
              }}
            >
              了解更多
            </Button>
            <Button onClick={() => setWelcomeDialogOpen(false)}>
              查看数据集
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
      <LearnMoreSheet
        open={learnMoreSheetOpen}
        onClose={() => setLearnMoreSheetOpen(false)}
        onEmailCTAClick={() => setEmailDialogOpen(true)}
      />
      <DialogRoot
        open={emailDialogOpen}
        onOpenChange={(open) => {
          // Prevent closing during submission
          if (emailSubmitting || emailSubmitSuccess) return;
          setEmailDialogOpen(open);
          if (!open) {
            setEmailError("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          {emailSubmitSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle>谢谢！</DialogTitle>
                <DialogDescription>
                  我们已收到你的信息，后续会向你同步更新。
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center p-8">
                <div
                  className={`
                    flex h-16 w-16 items-center justify-center rounded-full
                    bg-green-100

                    dark:bg-green-900
                  `}
                >
                  <svg
                    className={`
                      h-8 w-8 text-green-600

                      dark:text-green-400
                    `}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>订阅完整数据集更新</DialogTitle>
                <DialogDescription>
                  完整约 5,000 万条数据集仍在处理中。留下邮箱后，我们会在有更新时通知你。
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEmailSubmit}>
                <div className="space-y-4 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      required
                      disabled={emailSubmitting}
                      className={emailError ? "border-red-500" : ""}
                    />
                    {emailError && (
                      <p className="text-sm text-red-500">{emailError}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="full-dataset"
                        checked={interestedInFullDataset}
                        onCheckedChange={(checked) =>
                          setInterestedInFullDataset(checked === true)
                        }
                        disabled={emailSubmitting}
                      />
                      <Label htmlFor="full-dataset" className="cursor-pointer">
                        我对完整数据集感兴趣
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="model-training"
                        checked={interestedInModelTraining}
                        onCheckedChange={(checked) =>
                          setInterestedInModelTraining(checked === true)
                        }
                        disabled={emailSubmitting}
                      />
                      <Label
                        htmlFor="model-training"
                        className="cursor-pointer"
                      >
                        我对定制模型训练感兴趣
                      </Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEmailDialogOpen(false)}
                    disabled={emailSubmitting}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={emailSubmitting}>
                    {emailSubmitting ? "提交中..." : "提交"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
