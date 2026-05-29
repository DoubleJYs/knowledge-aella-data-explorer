import { Button } from "~/components/ui/Button";
import { InfoTile } from "~/components/ui/InfoTile";
import { PageShell } from "~/components/ui/PageShell";
import { Section } from "~/components/ui/Section";

export function UserKnowledgeBasesPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  return (
    <PageShell
      eyebrow="知识库列表"
      title="知识库"
      description="用户端只浏览可访问知识库，不提供知识库管理、审核队列或手动新增能力。"
      actions={
        <Button type="button" onClick={() => navigate("/app/map")}>
          打开知识地图
        </Button>
      }
    >
      <Section title="默认知识库">
        <div className="space-y-4">
          <InfoTile
            title="高校科研知识库"
            description="用于浏览已发布论文、笔记、项目资料和课程材料。"
          />
          <Button type="button" onClick={() => navigate("/app/map")}>
            查看已发布知识地图
          </Button>
        </div>
      </Section>
    </PageShell>
  );
}
