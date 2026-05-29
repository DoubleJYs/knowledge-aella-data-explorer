import { Button } from "~/components/ui/Button";
import { InfoTile } from "~/components/ui/InfoTile";
import { PageShell } from "~/components/ui/PageShell";
import { Section } from "~/components/ui/Section";

export function UserDashboardPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  return (
    <PageShell
      eyebrow="知识门户"
      title="科研知识门户"
      description="面向教师、研究生和科研人员的知识浏览入口。用户端只提供浏览、搜索、上传和查看状态能力。"
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/app/upload")}
          >
            上传资料
          </Button>
          <Button type="button" onClick={() => navigate("/app/map")}>
            打开知识地图
          </Button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Section
          title="用户端主流程"
          description="第三版第一阶段先建立路由和职责边界。"
        >
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                body: "浏览已发布知识节点，未审核内容不会出现在地图中。",
                label: "知识地图",
                path: "/app/map",
              },
              {
                body: "按标题、摘要和标签搜索已发布知识条目。",
                label: "搜索知识",
                path: "/app/search",
              },
              {
                body: "上传科研资料后进入待审核状态，等待管理员审核。",
                label: "上传资料",
                path: "/app/upload",
              },
            ].map((item) => (
              <button
                key={item.path}
                type="button"
                className="rounded-[14px] border border-border bg-background p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => navigate(item.path)}
              >
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  {item.body}
                </span>
              </button>
            ))}
          </div>
        </Section>
        <aside className="space-y-4">
          <Section title="用户端边界">
            <div className="space-y-3">
              <InfoTile>用户端不提供审核、发布、驳回或手动新增入口。</InfoTile>
              <InfoTile>上传资料审核通过后，才会进入知识地图。</InfoTile>
              <InfoTile>智能分析默认关闭，不是核心依赖。</InfoTile>
            </div>
          </Section>
        </aside>
      </div>
    </PageShell>
  );
}
