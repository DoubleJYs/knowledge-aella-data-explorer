import {
  Button,
  CodeBlock,
  Col,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/ui";
import { GithubIcon } from "lucide-react";
import { LearnMoreLinks } from "./LearnMoreContent";

const SCHEMA_CODE = `interface ScientificSummary {
  title: string;
  authors: string;
  publication_year: number | null;
  field_subfield: string;
  type_of_paper: string;
  executive_summary: string;
  research_context: string;
  key_results: string;
  three_takeaways: string;
  claims?: {
    details: string;
    supporting_evidence: string;
    contradicting_evidence: string;
    implications: string;
  }[];
}

interface SummarizationData {
  article_classification:
    | "SCIENTIFIC_TEXT"
    | "PARTIAL_SCIENTIFIC_TEXT"
    | "NON_SCIENTIFIC_TEXT";
  summary: ScientificSummary | null;
}`;

interface LearnMoreSheetProps {
  open: boolean;
  onClose: () => void;
  onEmailCTAClick: () => void;
}

const BENCHMARK_BARS = [
  { label: "微调 14B\nDynamic FP8", score: 3.9, type: "fineTuned" },
  { label: "微调 14B", score: 4.0, type: "fineTuned" },
  { label: "微调 Qwen 8B", score: 3.72, type: "fineTuned" },
  { label: "微调 Qwen 8B\n无提示词", score: 3.68, type: "fineTuned" },
  { label: "Qwen 8B", score: 2.87, type: "other" },
  { label: "Qwen 14B", score: 2.43, type: "other" },
  { label: "GPT-4o", score: 3.34, type: "other" },
  { label: "Claude\nSonnet 4.5", score: 3.53, type: "other" },
  { label: "Gemini\nFlash 2.5", score: 3.99, type: "other" },
  { label: "Gemini\nPro 2.5", score: 4.0, type: "other" },
  { label: "GPT-5\n评审模型", score: 4.74, type: "judge" },
];

function BenchmarkChart() {
  return (
    <div className="my-4 rounded-lg border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold">
          LLM-as-a-Judge：各模型平均质量得分
        </h3>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-cyan-400" />
            微调模型
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-slate-300" />
            其他模型
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-slate-600" />
            评审模型
          </span>
        </div>
      </div>
      <div className="grid min-h-72 grid-cols-[2rem_1fr] gap-3">
        <div className="flex items-center justify-center text-xs text-muted-foreground [writing-mode:vertical-rl]">
          平均得分
        </div>
        <div className="relative flex items-end gap-2 border-b border-l px-3 pb-2 pt-6">
          {[5, 4, 3, 2].map((tick) => (
            <div
              key={tick}
              className="absolute left-0 right-0 border-t border-border/60"
              style={{ bottom: `${(tick / 5) * 100}%` }}
            >
              <span className="-translate-x-8 -translate-y-2 text-xs text-muted-foreground">
                {tick}.0
              </span>
            </div>
          ))}
          {BENCHMARK_BARS.map((bar) => (
            <div key={bar.label} className="z-10 flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {bar.score.toFixed(2)}
              </span>
              <div
                className={`
                  w-full max-w-16 rounded-t-sm

                  ${
                    bar.type === "fineTuned"
                      ? "bg-cyan-400"
                      : bar.type === "judge"
                        ? "bg-slate-600"
                        : "bg-slate-300"
                  }
                `}
                style={{ height: `${(bar.score / 5) * 210}px` }}
              />
              <span className="min-h-10 whitespace-pre-line text-center text-[0.65rem] leading-tight text-muted-foreground">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LearnMoreSheet({
  open,
  onClose,
  onEmailCTAClick,
}: LearnMoreSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        className={`
          flex h-full w-full flex-col overflow-y-auto

          sm:max-w-5xl
        `}
        side="right"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>关于本项目</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pb-6">
          <Col className="mt-6 gap-2">
            <LearnMoreLinks />
            <p className="text-base text-muted-foreground">
              我们微调了一个 14B Qwen 模型，使其专门用于从科研论文中抽取结构化摘要，并将该模型与多种闭源模型进行了细致基准评测。
            </p>
            <p className="text-base text-muted-foreground">
              我们在 1,000 条未进入训练集的样本上评估模型表现，采用 LLM-as-a-Judge 方法，并使用 5 分制质量量表。
            </p>
            <h2 className="mt-6">模型基准评测</h2>
            <BenchmarkChart />
            <h2 className="mt-6">结构化抽取模式</h2>
            <p className="text-base text-muted-foreground">
              微调模型会按照下面的 TypeScript 模式从论文中抽取结构化摘要：
            </p>
            <CodeBlock
              language="typescript"
              code={SCHEMA_CODE}
              obfuscatedCode={SCHEMA_CODE}
              copyButton={<></>}
              className="mt-2"
              customStyle={{ fontSize: "0.8rem" }}
            />
          </Col>
          <Col className="mt-12 gap-2">
            <h2>数据集探索</h2>
            <b>嵌入向量</b>
            <p className="text-base text-muted-foreground">
              论文嵌入向量由{" "}
              <a
                href="https://huggingface.co/allenai/specter2_base"
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  underline

                  hover:text-foreground
                `}
              >
                SPECTER2
              </a>
              生成，这是 AllenAI 专门为科研文献设计的 Transformer 模型。该模型会处理每篇论文的标题、执行摘要和研究背景，生成 768 维嵌入向量，用于科研文献语义搜索。
            </p>
            <b>聚类算法</b>
            <p className="text-base text-muted-foreground">
              可视化使用 UMAP 将 768 维嵌入降到 3D 坐标，并尽量保留局部与全局结构。K-Means 聚类会根据嵌入空间中的语义相似度，将论文分成约 100 个聚类。聚类标签通过对论文领域和关键结论做 TF-IDF 分析自动生成，用来提取每个聚类最具区分度的术语。
            </p>
          </Col>
          <Separator className="my-8" />
          <div className="mt-8 flex justify-start gap-3">
            <Button
              variant="default"
              onClick={() => {
                onEmailCTAClick();
                onClose();
              }}
              className={`
                w-full

                sm:w-auto
              `}
            >
              想了解完整数据集？
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  "https://github.com/context-labs/laion-data-explorer",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className={`
                w-full

                sm:w-auto
              `}
            >
              <GithubIcon className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
