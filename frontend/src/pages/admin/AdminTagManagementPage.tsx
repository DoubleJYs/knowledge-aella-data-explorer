import { TagEditorPanel } from "~/components/admin/tags/TagEditorPanel";
import {
  getTagGroupLabel,
  TagGroupSidebar,
  TagGroupTabs,
  TAG_GROUP_OPTIONS,
} from "~/components/admin/tags/TagGroupSidebar";
import { TagTreeCanvas } from "~/components/admin/tags/TagTreeCanvas";
import { TagUsageStats } from "~/components/admin/tags/TagUsageStats";
import { Button } from "~/components/ui/Button";
import { EmptyState } from "~/components/ui/EmptyState";
import { ErrorState } from "~/components/ui/ErrorState";
import { LoadingState } from "~/components/ui/LoadingState";
import { AdminCyberPage, AdminCyberPanel } from "~/app/admin/AdminCyberPage";
import type { Tag, TagGroup, TagNode, TagUsageStats as TagUsageStatsType } from "~/types/tags";
import {
  createAdminTag,
  disableAdminTag,
  fetchAdminTags,
  fetchAdminTagStats,
  fetchAdminTagTree,
  updateAdminTag,
} from "~/utils/adminTagApi";
import type {
  AdminTagPayload,
  AdminTagUpdatePayload,
} from "~/utils/adminTagApi";
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  TagIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type EditorState =
  | {
      group: TagGroup;
      mode: "create";
      parent: Tag | null;
    }
  | {
      mode: "edit";
      tag: Tag;
    }
  | {
      mode: "empty";
    };

function flattenTree(nodes: TagNode[]): Tag[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

function tagNodeToTag(node: TagNode): Tag {
  return {
    createdAt: node.createdAt,
    description: node.description,
    id: node.id,
    isActive: node.isActive,
    isSelectable: node.isSelectable,
    isSystem: node.isSystem,
    level: node.level,
    name: node.name,
    parentId: node.parentId,
    path: node.path,
    slug: node.slug,
    sortOrder: node.sortOrder,
    synonyms: node.synonyms,
    tagGroup: node.tagGroup,
    updatedAt: node.updatedAt,
  };
}

export function AdminTagManagementPage({
  activeGroup,
  isGroupPage,
  navigate,
}: {
  activeGroup: TagGroup;
  isGroupPage: boolean;
  navigate: (path: string) => void;
}) {
  const [tree, setTree] = useState<TagNode[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<TagUsageStatsType[]>([]);
  const [editor, setEditor] = useState<EditorState>({ mode: "empty" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const statsByTagId = useMemo(() => {
    return stats.reduce<Record<string, TagUsageStatsType>>((map, item) => {
      map[item.tagId] = item;
      return map;
    }, {});
  }, [stats]);

  const countsByGroup = useMemo(() => {
    return TAG_GROUP_OPTIONS.reduce<Record<TagGroup, number>>((map, option) => {
      map[option.value] = allTags.filter(
        (tag) => tag.tagGroup === option.value,
      ).length;
      return map;
    }, {} as Record<TagGroup, number>);
  }, [allTags]);

  const selectedStats =
    editor.mode === "edit" ? statsByTagId[editor.tag.id] ?? null : null;
  const activeGroupLabel = getTagGroupLabel(activeGroup);

  const loadData = useCallback(
    async (nextSelectedId?: string | null) => {
      setLoading(true);
      setError(null);
      setStatsError(null);
      try {
        const [nextTree, nextTags] = await Promise.all([
          fetchAdminTagTree({
            includeInactive: true,
            tagGroup: activeGroup,
          }),
          fetchAdminTags(),
        ]);
        setTree(nextTree);
        setAllTags(nextTags);
        const flattened = flattenTree(nextTree);
        const selectedTag = nextSelectedId
          ? flattened.find((tag) => tag.id === nextSelectedId)
          : null;
        if (selectedTag) {
          setEditor({ mode: "edit", tag: selectedTag });
        } else if (nextSelectedId === undefined) {
          setEditor((current) => {
            if (current.mode !== "edit") return current;
            const refreshedTag = flattened.find(
              (tag) => tag.id === current.tag.id,
            );
            return refreshedTag
              ? { mode: "edit", tag: refreshedTag }
              : { mode: "empty" };
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "标签数据加载失败");
      } finally {
        setLoading(false);
      }

      try {
        setStats(await fetchAdminTagStats());
      } catch (err) {
        setStats([]);
        setStatsError(err instanceof Error ? err.message : "标签统计加载失败");
      }
    },
    [activeGroup],
  );

  useEffect(() => {
    setEditor({ mode: "empty" });
    void loadData(null);
  }, [activeGroup, loadData]);

  const handleSaveCreate = async (payload: AdminTagPayload) => {
    setSaving(true);
    setError(null);
    try {
      const tag = await createAdminTag(payload);
      await loadData(tag.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增标签失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUpdate = async (
    tagId: string,
    payload: AdminTagUpdatePayload,
  ) => {
    setSaving(true);
    setError(null);
    try {
      const tag = await updateAdminTag(tagId, payload);
      await loadData(tag.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存标签失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (tag: Tag) => {
    const confirmed = window.confirm(
      `确认禁用“${tag.name}”？禁用后用户端筛选不会再显示该标签，历史绑定不会删除。`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      const result = await disableAdminTag(tag.id);
      await loadData(result.tag.id);
      if (result.warning) {
        setError(result.warning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "禁用标签失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectNode = (node: TagNode) => {
    setEditor({ mode: "edit", tag: tagNodeToTag(node) });
  };

  const handleCreateChild = (tag: Tag) => {
    setEditor({
      group: tag.tagGroup,
      mode: "create",
      parent: tag,
    });
  };

  const handleCreateChildFromNode = (node: TagNode) => {
    handleCreateChild(tagNodeToTag(node));
  };

  return (
    <AdminCyberPage
      actions={
        <Button
          type="button"
          onClick={() => {
            if (!isGroupPage) navigate(`/admin/tags/${activeGroup}`);
            setEditor({
              group: activeGroup,
              mode: "create",
              parent: null,
            });
          }}
        >
          <TagIcon className="mr-2 h-4 w-4" />
          新增根标签
        </Button>
      }
      eyebrow="后台 / 标签体系"
      title={isGroupPage ? `标签管理 · ${activeGroupLabel}` : "标签管理"}
      description={
        isGroupPage
          ? "当前分组以可缩放树画布维护标签层级，点击节点后再显示详情和统计。"
          : "选择一个标签组进入对应维护页面；标签管理只属于后台端，不进入用户端导航。"
      }
    >
      <div className="space-y-4">
        {error && (
          <ErrorState
            title="标签操作提示"
            description={error}
            onRetry={() => loadData()}
            className="border-cyan-400/35 bg-cyan-950/40 text-cyan-50"
          />
        )}
        {isGroupPage ? (
          <div className="space-y-4">
            <AdminCyberPanel
              title="标签组"
              description="横向切换不同标签组，当前页面只展示对应标签树。"
              actions={
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="border-cyan-300/35 bg-cyan-500/5 text-cyan-100"
                  onClick={() => navigate("/admin/tags")}
                >
                  <ArrowLeftIcon className="mr-1.5 h-3.5 w-3.5" />
                  返回标签组
                </Button>
              }
            >
              <TagGroupTabs
                activeGroup={activeGroup}
                countsByGroup={countsByGroup}
                onChange={(nextGroup) => navigate(`/admin/tags/${nextGroup}`)}
              />
            </AdminCyberPanel>

            <AdminCyberPanel
              title={`${activeGroupLabel}标签树`}
              description="树结构画布支持拖拽平移和滚轮缩放；点击节点后再显示标签详情和使用统计。"
              actions={
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="border-cyan-300/35 bg-cyan-500/5 text-cyan-100"
                  onClick={() => loadData()}
                >
                  <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
                  刷新
                </Button>
              }
            >
              {loading ? (
                <LoadingState
                  label="正在加载标签树..."
                  rows={6}
                  className="border-cyan-400/20 bg-cyan-950/20"
                />
              ) : tree.length === 0 ? (
                <EmptyState
                  className="border-cyan-400/20 bg-cyan-950/10 text-cyan-50"
                  icon={<TagIcon className="h-8 w-8" />}
                  title="当前标签组还没有标签"
                  description="当前默认分类已固定到数据库。需要扩展时，可以从右上角新增根标签。"
                  action={
                    <Button
                      type="button"
                      size="xs"
                      onClick={() =>
                        setEditor({
                          group: activeGroup,
                          mode: "create",
                          parent: null,
                        })
                      }
                    >
                      新增根标签
                    </Button>
                  }
                />
              ) : (
                <TagTreeCanvas
                  nodes={tree}
                  onCreateChild={handleCreateChildFromNode}
                  onSelect={handleSelectNode}
                  selectedTagId={editor.mode === "edit" ? editor.tag.id : null}
                  statsByTagId={statsByTagId}
                />
              )}
            </AdminCyberPanel>

            {editor.mode !== "empty" && (
              <div className={`
                grid gap-4

                xl:grid-cols-[minmax(0,1fr)_360px]
              `}>
                <AdminCyberPanel
                  title="标签详情"
                  description="编辑标签元数据，或基于当前标签继续新增子标签。"
                >
                  <TagEditorPanel
                    allTags={allTags}
                    busy={saving}
                    editor={editor}
                    onCreateChild={handleCreateChild}
                    onDisable={handleDisable}
                    onSaveCreate={handleSaveCreate}
                    onSaveUpdate={handleSaveUpdate}
                  />
                </AdminCyberPanel>
                <AdminCyberPanel
                  title="使用统计"
                  description="统计来自结构化 item_tags 绑定。"
                >
                  {statsError && (
                    <ErrorState
                      className={`
                        mb-3 border-amber-400/30 bg-amber-950/30 text-amber-50
                      `}
                      title="统计加载失败"
                      description={statsError}
                      onRetry={() => loadData()}
                    />
                  )}
                  {editor.mode === "edit" ? (
                    <TagUsageStats stats={selectedStats} />
                  ) : (
                    <EmptyState
                      className={`
                        min-h-36 border-cyan-400/20 bg-cyan-950/10 text-cyan-50
                      `}
                      icon={<TagIcon className="h-7 w-7" />}
                      title="新增标签尚无统计"
                      description="保存后再查看绑定、已发布和待审核条目数量。"
                    />
                  )}
                </AdminCyberPanel>
              </div>
            )}
          </div>
        ) : (
          <AdminCyberPanel
            title="标签组"
            description="选择一个科研资料分类体系，进入对应标签树维护页面。"
          >
            <TagGroupSidebar
              activeGroup={activeGroup}
              countsByGroup={countsByGroup}
              onChange={(nextGroup) => navigate(`/admin/tags/${nextGroup}`)}
            />
          </AdminCyberPanel>
        )}
      </div>
    </AdminCyberPage>
  );
}
