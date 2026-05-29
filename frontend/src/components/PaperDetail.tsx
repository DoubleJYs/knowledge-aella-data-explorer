import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/ui";
import { useEffect, useState } from "react";
import type {
  ClusterInfo,
  PaperDetail as PaperDetailType,
  SummarizationData,
} from "../types";
import { getApiUrl } from "../utils/api";
import { getClusterDisplayLabel } from "../utils/clusterLabelTranslations";

interface PaperDetailProps {
  paperId: number | null;
  onClose: () => void;
  onPaperClick?: (paperId: number) => void;
  clusters?: ClusterInfo[];
}

export function PaperDetail({
  paperId,
  onClose,
  onPaperClick,
  clusters = [],
}: PaperDetailProps) {
  const [paper, setPaper] = useState<PaperDetailType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string>("");

  useEffect(() => {
    if (!paperId) {
      setPaper(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(getApiUrl(`/api/papers/${paperId}`))
      .then((res) => {
        if (!res.ok) throw new Error("论文获取失败");
        return res.json();
      })
      .then((data: PaperDetailType) => {
        setPaper(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [paperId]);

  const handleNearestPaperClick = (nearPaperId: number) => {
    // Close the accordion when navigating to a nearest paper
    setAccordionValue("");
    if (onPaperClick) {
      onPaperClick(nearPaperId);
    }
  };

  let summaryData: SummarizationData | null = null;
  if (paper?.summarization) {
    try {
      summaryData = JSON.parse(paper.summarization);
    } catch (e) {
      console.error("Failed to parse summarization:", e);
    }
  }

  // Get cluster color from clusters data
  const clusterColor = paper?.cluster_id
    ? (clusters.find((c) => c.cluster_id === paper.cluster_id)?.color ??
      "#888888")
    : "#888888";

  // Convert hex color to rgba with opacity for border
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const clusterBorderColor = hexToRgba(clusterColor, 0.8);

  return (
    <Sheet
      open={paperId !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setAccordionValue("");
        }
      }}
    >
      <SheetContent
        autoFocus={false}
        className={`
          w-full overflow-y-auto border-none

          lg:w-[1000px] lg:max-w-[1000px]

          sm:w-[600px] sm:max-w-[600px]
        `}
      >
        <SheetHeader
          className={`-mx-6 -mt-6 mb-6 border-b border-border bg-background p-6`}
        >
          <SheetTitle
            className={`text-left text-2xl leading-tight text-foreground`}
          >
            论文详情
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-6">
          {loading && (
            <p className="text-muted-foreground">正在加载论文详情...</p>
          )}
          {error && <p className="text-destructive">错误：{error}</p>}
          {paper && (
            <>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div>
                  <h3
                    className={`
                      mb-3 text-base font-semibold text-card-foreground
                    `}
                  >
                    论文标题
                  </h3>
                  <h2 className="w-[95%] leading-tight text-foreground">
                    {paper.title === ""
                      ? "[未抽取到标题]"
                      : (paper.title ?? "无标题")}
                  </h2>
                </div>
                <div
                  className={`
                    mt-4 flex flex-col gap-8

                    sm:flex-row
                  `}
                >
                  <div>
                    <div
                      className={`
                        mb-1 text-xs font-medium uppercase tracking-wide
                        text-muted-foreground
                      `}
                    >
                      聚类
                    </div>
                    <div
                      className={`
                        inline-flex items-center rounded-sm px-3 py-1 text-sm
                        font-medium text-foreground
                      `}
                      style={{
                        border: `1px solid ${clusterBorderColor}`,
                      }}
                    >
                      {getClusterDisplayLabel(paper.cluster_label)}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`
                        mb-1 text-xs font-medium uppercase tracking-wide
                        text-muted-foreground
                      `}
                    >
                      领域
                    </div>
                    <div className="py-1 text-sm font-medium text-foreground">
                      {paper.field_subfield ?? "未知"}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`
                        mb-1 text-xs font-medium uppercase tracking-wide
                        text-muted-foreground
                      `}
                    >
                      年份
                    </div>
                    <div className="py-1 text-sm font-medium text-foreground">
                      {paper.publication_year ?? "未知"}
                    </div>
                  </div>
                </div>
              </div>
              {paper.nearest_papers.length > 0 && (
                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  value={accordionValue}
                  onValueChange={setAccordionValue}
                >
                  <AccordionItem value="nearest" className="border-border">
                    <AccordionTrigger>
                      <p
                        className={`
                          ml-1 text-base font-semibold text-foreground

                          hover:underline
                        `}
                      >
                        查看相近论文
                      </p>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="mb-1 text-base text-muted-foreground">
                        正在显示嵌入空间中与本文最接近的 {paper.nearest_papers.length} 篇论文，距离按欧氏距离计算。
                      </p>
                      <p className="mb-4 text-base text-muted-foreground">
                        这些论文在内容和方法上具有较高语义相似度。
                      </p>
                      <div className="space-y-2">
                        {paper.nearest_papers.map((nearPaper) => (
                          <button
                            key={nearPaper.id}
                            onClick={() =>
                              handleNearestPaperClick(nearPaper.id)
                            }
                            className={`
                              w-full rounded-md border border-border bg-card p-3
                              text-left text-sm transition-colors

                              hover:bg-accent hover:text-accent-foreground
                            `}
                          >
                            <div className="font-medium text-card-foreground">
                              {nearPaper.title ?? "无标题"}
                            </div>
                            <div
                              className={`
                                mt-1 flex items-center gap-2 text-xs
                                text-muted-foreground
                              `}
                            >
                              {nearPaper.publication_year && (
                                <span>{nearPaper.publication_year}</span>
                              )}
                              {nearPaper.field_subfield && (
                                <>
                                  <span>•</span>
                                  <span>{nearPaper.field_subfield}</span>
                                </>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {summaryData?.summary && (
                <div className="space-y-6">
                  {summaryData.summary.authors && (
                    <section
                      className={`rounded-lg border border-border bg-card p-4`}
                    >
                      <h3
                        className={`
                          mb-3 text-base font-semibold text-card-foreground
                        `}
                      >
                        作者
                      </h3>
                      <p
                        className={`
                          text-sm leading-relaxed text-muted-foreground
                        `}
                      >
                        {summaryData.summary.authors}
                      </p>
                    </section>
                  )}
                  <section
                    className={`rounded-lg border border-border bg-card p-4`}
                  >
                    <h3
                      className={`
                        mb-3 text-base font-semibold text-card-foreground
                      `}
                    >
                      执行摘要
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {summaryData.summary.executive_summary}
                    </p>
                  </section>
                  <section
                    className={`rounded-lg border border-border bg-card p-4`}
                  >
                    <h3
                      className={`
                        mb-3 text-base font-semibold text-card-foreground
                      `}
                    >
                      研究背景
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {summaryData.summary.research_context}
                    </p>
                  </section>
                  <section
                    className={`rounded-lg border border-border bg-card p-4`}
                  >
                    <h3
                      className={`
                        mb-3 text-base font-semibold text-card-foreground
                      `}
                    >
                      关键结果
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {summaryData.summary.key_results}
                    </p>
                  </section>
                  <section
                    className={`rounded-lg border border-border bg-card p-4`}
                  >
                    <h3
                      className={`
                        mb-3 text-base font-semibold text-card-foreground
                      `}
                    >
                      三点要点
                    </h3>
                    <p
                      className={`
                        whitespace-pre-wrap text-sm leading-relaxed
                        text-muted-foreground
                      `}
                    >
                      {summaryData.summary.three_takeaways}
                    </p>
                  </section>
                  {summaryData.summary.claims &&
                    summaryData.summary.claims.length > 0 && (
                      <section>
                        <h3
                          className={`
                            mb-4 text-base font-semibold text-foreground
                          `}
                        >
                          关键主张
                        </h3>
                        <div className="space-y-3">
                          {summaryData.summary.claims.map((claim, idx) => (
                            <div
                              key={idx}
                              className={`
                                rounded-lg border border-border bg-card p-4
                              `}
                            >
                              <h4
                                className={`
                                  mb-3 font-semibold text-card-foreground
                                `}
                              >
                                主张 {idx + 1}
                              </h4>
                              <div className="space-y-2">
                                <div>
                                  <span
                                    className={`
                                      text-sm font-semibold text-foreground
                                    `}
                                  >
                                    详情：
                                  </span>{" "}
                                  <span
                                    className={`text-sm text-muted-foreground`}
                                  >
                                    {claim.details}
                                  </span>
                                </div>
                                <div>
                                  <span
                                    className={`
                                      text-sm font-semibold text-foreground
                                    `}
                                  >
                                    支持证据：
                                  </span>{" "}
                                  <span
                                    className={`text-sm text-muted-foreground`}
                                  >
                                    {claim.supporting_evidence}
                                  </span>
                                </div>
                                {claim.contradicting_evidence && (
                                  <div>
                                    <span
                                      className={`
                                        text-sm font-semibold text-foreground
                                      `}
                                    >
                                      相反证据：
                                    </span>{" "}
                                    <span
                                      className={`text-sm text-muted-foreground`}
                                    >
                                      {claim.contradicting_evidence}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span
                                    className={`
                                      text-sm font-semibold text-foreground
                                    `}
                                  >
                                    影响：
                                  </span>{" "}
                                  <span
                                    className={`text-sm text-muted-foreground`}
                                  >
                                    {claim.implications}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
