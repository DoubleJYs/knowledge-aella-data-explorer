export const LearnMoreLinks = () => {
  return (
    <p className="text-base text-muted-foreground">
      该数据集由一个专用小模型构建；该模型由{" "}
      <a
        href="https://inference.net"
        target="_blank"
        rel="noopener noreferrer"
        className={`
          underline

          hover:text-foreground
        `}
      >
        Inference.net
      </a>
      {" "}微调，项目与{" "}
      <a
        href="https://laion.ai"
        target="_blank"
        rel="noopener noreferrer"
        className={`
          underline

          hover:text-foreground
        `}
      >
        LAION
      </a>
      {" "}协作完成。
    </p>
  );
};

export function LearnMoreContent() {
  return (
    <div className="space-y-4">
      <LearnMoreLinks />
      <p className="text-base text-muted-foreground">
        这是完整约 5,000 万条样本数据集中的 100,000 条预览样本。我们的微调模型会从原始非结构化文本中抽取结构化摘要。
      </p>
    </div>
  );
}
