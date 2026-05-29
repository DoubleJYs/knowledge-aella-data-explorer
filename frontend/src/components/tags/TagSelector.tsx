import { TagBadge } from "~/components/tags/TagBadge";
import {
  TAG_GROUP_LABELS,
  TagGroupSection,
  getTagGroupLabel,
} from "~/components/tags/TagGroupSection";
import { Button } from "~/components/ui/Button";
import { EmptyState } from "~/components/ui/EmptyState";
import { ErrorState } from "~/components/ui/ErrorState";
import { LoadingState } from "~/components/ui/LoadingState";
import type { Tag, TagGroup, TagNode } from "~/types/tags";
import { cn, Input } from "~/ui";
import { fetchAdminTagTree } from "~/utils/adminTagApi";
import { fetchUserTagTree } from "~/utils/userTagApi";
import { RefreshCwIcon, SearchIcon, TagsIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_TAG_GROUPS = Object.keys(TAG_GROUP_LABELS) as TagGroup[];
const DEFAULT_SINGLE_SELECT_GROUPS: TagGroup[] = [
  "content_type",
  "meeting_type",
];

function flattenTagTree(nodes: TagNode[]): Tag[] {
  return nodes.flatMap((node) => [node, ...flattenTagTree(node.children)]);
}

function tagMatchesSearch(tag: Tag, keyword: string) {
  if (!keyword) return true;
  const haystack = [
    tag.name,
    tag.slug,
    tag.path,
    tag.description ?? "",
    ...tag.synonyms,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function groupTags(tags: Tag[], groups: TagGroup[]) {
  const grouped = new Map<TagGroup, Tag[]>();
  for (const group of groups) grouped.set(group, []);
  for (const tag of tags) {
    if (!grouped.has(tag.tagGroup)) continue;
    grouped.get(tag.tagGroup)?.push(tag);
  }
  return grouped;
}

export function TagSelector({
  className,
  disabled = false,
  mode = "admin",
  multiple = true,
  onChange,
  onSelectedTagsChange,
  placeholder = "搜索标签名称、描述或同义词",
  requiredGroups = [],
  singleSelectGroups = DEFAULT_SINGLE_SELECT_GROUPS,
  tagGroups = DEFAULT_TAG_GROUPS,
  value,
}: {
  className?: string;
  disabled?: boolean;
  mode?: "admin" | "user";
  multiple?: boolean;
  onChange: (tagIds: string[]) => void;
  onSelectedTagsChange?: (tags: Tag[]) => void;
  placeholder?: string;
  requiredGroups?: TagGroup[];
  singleSelectGroups?: TagGroup[];
  tagGroups?: TagGroup[];
  value: string[];
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(value), [value]);
  const selectedTags = useMemo(() => {
    const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
    return value
      .map((tagId) => tagsById.get(tagId))
      .filter((tag): tag is Tag => Boolean(tag));
  }, [tags, value]);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tree =
        mode === "admin"
          ? await fetchAdminTagTree({ includeInactive: true })
          : await fetchUserTagTree();
      const flattened = flattenTagTree(tree).filter((tag) =>
        tagGroups.includes(tag.tagGroup),
      );
      setTags(flattened);
    } catch (err) {
      setError(err instanceof Error ? err.message : "标签加载失败");
    } finally {
      setLoading(false);
    }
  }, [mode, tagGroups]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    onSelectedTagsChange?.(selectedTags);
  }, [onSelectedTagsChange, selectedTags]);

  const filteredTags = useMemo(() => {
    return tags.filter((tag) => tagMatchesSearch(tag, query.trim()));
  }, [query, tags]);

  const groupedTags = useMemo(
    () => groupTags(filteredTags, tagGroups),
    [filteredTags, tagGroups],
  );

  const requiredGroupSet = useMemo(
    () => new Set(requiredGroups),
    [requiredGroups],
  );
  const singleSelectGroupSet = useMemo(
    () => new Set(singleSelectGroups),
    [singleSelectGroups],
  );

  const removeTag = (tagId: string) => {
    onChange(value.filter((currentId) => currentId !== tagId));
  };

  const toggleTag = (tag: Tag) => {
    if (disabled || !tag.isActive || !tag.isSelectable) return;
    if (selectedIds.has(tag.id)) {
      removeTag(tag.id);
      return;
    }
    if (!multiple) {
      onChange([tag.id]);
      return;
    }
    if (singleSelectGroupSet.has(tag.tagGroup)) {
      const nextIds = value.filter((tagId) => {
        const currentTag = tags.find((candidate) => candidate.id === tagId);
        return currentTag?.tagGroup !== tag.tagGroup;
      });
      onChange([...nextIds, tag.id]);
      return;
    }
    onChange([...value, tag.id]);
  };

  const missingRequiredGroups = requiredGroups.filter(
    (group) => !selectedTags.some((tag) => tag.tagGroup === group),
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TagsIcon className="h-4 w-4 text-primary" />
            结构化标签
          </div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled || loading}
            onClick={() => void loadTags()}
          >
            <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
            刷新
          </Button>
        </div>
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                disabled={disabled}
                tag={tag}
                onRemove={removeTag}
              />
            ))}
          </div>
        ) : (
          <div className={`
            rounded-[10px] border border-dashed border-border bg-muted/30 px-3
            py-2 text-sm text-muted-foreground
          `}>
            暂未选择标签
          </div>
        )}
        {missingRequiredGroups.length > 0 && (
          <div className="text-xs text-warning">
            待选择：{missingRequiredGroups.map(getTagGroupLabel).join("、")}
          </div>
        )}
      </div>

      <Input
        icon={<SearchIcon className="h-4 w-4 text-muted-foreground" />}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => setQuery(event.target.value)}
      />

      {loading ? (
        <LoadingState label="正在加载标签树..." rows={5} />
      ) : error ? (
        <ErrorState
          title="标签加载失败"
          description={error}
          onRetry={loadTags}
        />
      ) : tags.length === 0 ? (
        <EmptyState
          icon={<TagsIcon className="h-8 w-8" />}
          title="暂无可用标签"
          description={
            mode === "admin"
              ? "请先在后台标签管理中新增标签。"
              : "当前没有已启用的用户端标签。"
          }
        />
      ) : filteredTags.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8" />}
          title="没有匹配标签"
          description="请换一个关键词，或清空搜索后重新选择。"
        />
      ) : (
        <div className={`
          max-h-[420px] space-y-5 overflow-y-auto rounded-[14px] border
          border-border bg-background p-3
        `}>
          {tagGroups.map((group) => (
            <TagGroupSection
              key={group}
              disabled={disabled}
              group={group}
              isRequired={requiredGroupSet.has(group)}
              multiple={multiple && !singleSelectGroupSet.has(group)}
              selectedIds={selectedIds}
              tags={groupedTags.get(group) ?? []}
              onToggle={toggleTag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
