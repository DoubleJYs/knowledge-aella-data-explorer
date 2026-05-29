import { Button } from "~/components/ui/Button";
import { EmptyState } from "~/components/ui/EmptyState";
import type { Tag, TagGroup } from "~/types/tags";
import { Checkbox, Input, Textarea } from "~/ui";
import type {
  AdminTagPayload,
  AdminTagUpdatePayload,
} from "~/utils/adminTagApi";
import {
  BanIcon,
  CornerDownRightIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  TagIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TAG_GROUP_OPTIONS, getTagGroupLabel } from "./TagGroupSidebar";

type TagEditorMode =
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

function formatDateTime(value?: string | null) {
  if (!value) return "暂无";
  return new Date(value).toLocaleString();
}

function parentLabel(parent: Tag | null) {
  return parent ? parent.name : "根标签";
}

export function TagEditorPanel({
  allTags,
  busy,
  editor,
  onCreateChild,
  onDisable,
  onSaveCreate,
  onSaveUpdate,
}: {
  allTags: Tag[];
  busy: boolean;
  editor: TagEditorMode;
  onCreateChild: (tag: Tag) => void;
  onDisable: (tag: Tag) => void;
  onSaveCreate: (payload: AdminTagPayload) => void;
  onSaveUpdate: (tagId: string, payload: AdminTagUpdatePayload) => void;
}) {
  const activeTag = editor.mode === "edit" ? editor.tag : null;
  const createParent = editor.mode === "create" ? editor.parent : null;
  const [name, setName] = useState("");
  const [tagGroup, setTagGroup] = useState<TagGroup>("custom");
  const [description, setDescription] = useState("");
  const [synonymsText, setSynonymsText] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isSelectable, setIsSelectable] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editor.mode === "edit") {
      setName(editor.tag.name);
      setTagGroup(editor.tag.tagGroup);
      setDescription(editor.tag.description ?? "");
      setSynonymsText(editor.tag.synonyms.join("，"));
      setSortOrder(String(editor.tag.sortOrder));
      setIsSelectable(editor.tag.isSelectable);
      setIsActive(editor.tag.isActive);
      return;
    }
    if (editor.mode === "create") {
      setName("");
      setTagGroup(editor.group);
      setDescription("");
      setSynonymsText("");
      setSortOrder("0");
      setIsSelectable(true);
      setIsActive(true);
      return;
    }
  }, [editor]);

  const parent = useMemo(() => {
    if (editor.mode === "edit" && editor.tag.parentId) {
      return allTags.find((tag) => tag.id === editor.tag.parentId) ?? null;
    }
    if (editor.mode === "create") return createParent;
    return null;
  }, [allTags, createParent, editor]);

  if (editor.mode === "empty") {
    return (
      <EmptyState
        className="border-cyan-400/20 bg-cyan-950/10 text-cyan-50"
        icon={<TagIcon className="h-8 w-8" />}
        title="请选择标签"
        description="点击中间标签树中的节点后，可以在这里查看详情、保存修改、创建子标签或禁用标签。"
      />
    );
  }

  const synonyms = synonymsText
    .split(/[，,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
  const normalizedSortOrder = Number.parseInt(sortOrder, 10);
  const currentSortOrder = Number.isFinite(normalizedSortOrder)
    ? normalizedSortOrder
    : 0;
  const canSave = name.trim().length > 0 && !busy;

  const handleSave = () => {
    if (!canSave) return;
    if (editor.mode === "create") {
      onSaveCreate({
        description: description.trim() || null,
        isSelectable,
        name: name.trim(),
        parentId: editor.parent?.id ?? null,
        sortOrder: currentSortOrder,
        synonyms,
        tagGroup,
      });
      return;
    }
    onSaveUpdate(editor.tag.id, {
      description: description.trim() || null,
      isActive,
      isSelectable,
      name: name.trim(),
      sortOrder: currentSortOrder,
      synonyms,
    });
  };

  const disableLabel = activeTag?.isActive ? "禁用标签" : "已禁用";

  return (
    <div className="space-y-5">
      <div className={`
        rounded-[6px] border border-cyan-400/20 bg-cyan-950/15 p-4
      `}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`
              flex items-center gap-2 text-sm font-semibold text-cyan-50
            `}>
              {editor.mode === "create" ? (
                <PlusIcon className="h-4 w-4 text-cyan-300" />
              ) : (
                <PencilIcon className="h-4 w-4 text-cyan-300" />
              )}
              {editor.mode === "create" ? "新增标签" : "编辑标签"}
            </div>
            <div className="mt-1 text-xs text-cyan-100/55">
              {editor.mode === "create"
                ? `父级：${parentLabel(editor.parent)}`
                : `ID：${editor.tag.id}`}
            </div>
          </div>
          {activeTag?.isSystem && (
            <span className={`
              rounded-full border border-cyan-300/30 px-2 py-1 text-xs
              text-cyan-100/60
            `}>
              系统标签
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <Input
          label="标签名称"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="输入标签名称"
        />
        <div className={`
          grid gap-4

          md:grid-cols-2
        `}>
          <label className="block text-sm font-medium leading-none">
            标签组
            <select
              className={`
                mt-1 flex h-10 w-full rounded border border-input bg-background
                px-3 py-2 text-sm
              `}
              value={tagGroup}
              disabled={editor.mode === "edit" || Boolean(createParent)}
              onChange={(event) => setTagGroup(event.target.value as TagGroup)}
            >
              {TAG_GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="父标签"
            value={parentLabel(parent)}
            disabled
            icon={<CornerDownRightIcon className="h-4 w-4 text-cyan-100/45" />}
          />
        </div>
        <Textarea
          label="描述"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="说明标签含义、使用范围或审核标准"
        />
        <Input
          label="同义词"
          value={synonymsText}
          onChange={(event) => setSynonymsText(event.target.value)}
          placeholder="用逗号分隔，例如：AI安全，大模型安全"
        />
        <Input
          label="排序"
          value={sortOrder}
          type="number"
          onChange={(event) => setSortOrder(event.target.value)}
        />
        <div className={`
          grid gap-3 rounded-[6px] border border-cyan-400/20 bg-cyan-950/10 p-3
        `}>
          <Checkbox
            checked={isSelectable}
            label="是否可选择"
            onCheckedChange={(checked) => setIsSelectable(checked === true)}
          />
          <Checkbox
            checked={isActive}
            disabled={editor.mode === "create"}
            label="是否启用"
            onCheckedChange={(checked) => setIsActive(checked === true)}
          />
        </div>
      </div>

      {activeTag && (
        <div className={`
          grid gap-2 rounded-[6px] border border-cyan-400/20 bg-cyan-950/10 p-3
          text-xs text-cyan-100/55
        `}>
          <div>所属标签组：{getTagGroupLabel(activeTag.tagGroup)}</div>
          <div>是否系统标签：{activeTag.isSystem ? "是" : "否"}</div>
          <div>创建时间：{formatDateTime(activeTag.createdAt)}</div>
          <div>更新时间：{formatDateTime(activeTag.updatedAt)}</div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {activeTag && (
          <>
            <Button
              type="button"
              variant="outline"
              className="border-cyan-300/35 bg-cyan-500/5 text-cyan-100"
              onClick={() => onCreateChild(activeTag)}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              新增子标签
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-rose-300/45 bg-rose-500/10 text-rose-100"
              disabled={!activeTag.isActive || busy}
              onClick={() => onDisable(activeTag)}
            >
              <BanIcon className="mr-2 h-4 w-4" />
              {disableLabel}
            </Button>
          </>
        )}
        <Button type="button" disabled={!canSave} onClick={handleSave}>
          <SaveIcon className="mr-2 h-4 w-4" />
          保存修改
        </Button>
      </div>
    </div>
  );
}
