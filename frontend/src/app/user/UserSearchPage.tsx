import { Button } from "~/components/ui/Button";
import { InfoTile } from "~/components/ui/InfoTile";
import { PageShell } from "~/components/ui/PageShell";
import { Section } from "~/components/ui/Section";

export function UserSearchPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  return (
    <PageShell
      eyebrow="已发布知识搜索"
      title="搜索知识"
      description="用户端搜索只面向已发布知识条目。第三版第一阶段先建立独立入口，后续复用地图查询结果展示列表。"
      actions={
        <Button type="button" onClick={() => navigate("/app/map")}>
          打开知识地图
        </Button>
      }
    >
      <Section title="搜索边界">
        <InfoTile>
          未审核、审核中、已驳回和草稿内容不能出现在用户端搜索结果中。
        </InfoTile>
      </Section>
    </PageShell>
  );
}
