import { Button } from "~/components/ui/Button";
import { EmptyState } from "~/components/ui/EmptyState";
import { PageShell } from "~/components/ui/PageShell";
import { InboxIcon } from "lucide-react";

export function UserUploadsPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  return (
    <PageShell
      eyebrow="我的上传"
      title="我的上传"
      description="查看自己提交资料的审核状态。第三版当前先保留页面入口，后续接入用户上传记录接口。"
      actions={
        <Button type="button" onClick={() => navigate("/app/upload")}>
          上传资料
        </Button>
      }
    >
      <EmptyState
        icon={<InboxIcon className="h-8 w-8" />}
        title="还没有可查询的上传记录"
        description="当前上传页仍只展示本次会话提交记录。后续接入用户上传记录接口后，这里会展示待审核、审核中、已驳回和已发布状态。"
        action={
          <Button
            type="button"
            size="xs"
            onClick={() => navigate("/app/upload")}
          >
            去上传
          </Button>
        }
      />
    </PageShell>
  );
}
