import type { KnowledgeItemPayload } from "~/types/knowledge";
import type { Tag, TagGroup, TagNode, TagUsageStats } from "~/types/tags";
import { getApiUrl } from "./api";
import {
  createManualItem,
  fetchKnowledgeBases,
  fetchKnowledgeMap,
  fetchReviewItems,
  publishReviewItem,
  rejectReviewItem,
  saveReviewItem,
} from "./knowledgeApi";

type ApiTag = {
  id: string;
  name: string;
  slug: string;
  tag_group: TagGroup;
  parent_id: string | null;
  level: number;
  path: string;
  description: string | null;
  synonyms: string[];
  sort_order: number;
  is_system: boolean;
  is_selectable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ApiTagNode = ApiTag & {
  children: ApiTagNode[];
};

type ApiTagUsageStats = {
  tag_id: string;
  item_count: number;
  published_item_count: number;
  pending_review_item_count: number;
  last_used_at: string | null;
};

type ApiTagDisableResult = {
  tag: ApiTag;
  warning: string | null;
};

export type AdminTagQuery = {
  tagGroup?: TagGroup;
  parentId?: string | null;
  isActive?: boolean;
  q?: string;
};

export type AdminTagTreeQuery = {
  tagGroup?: TagGroup;
  includeInactive?: boolean;
};

export type AdminTagPayload = {
  name: string;
  tagGroup: TagGroup;
  parentId?: string | null;
  description?: string | null;
  synonyms?: string[];
  sortOrder?: number;
  isSelectable?: boolean;
};

export type AdminTagUpdatePayload = {
  name?: string;
  description?: string | null;
  synonyms?: string[];
  sortOrder?: number;
  isSelectable?: boolean;
  isActive?: boolean;
};

export type AdminTagDisableResult = {
  tag: Tag;
  warning: string | null;
};

async function requestAdminJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败：${response.status}`);
  }

  return (await response.json()) as T;
}

function tagFromApi(tag: ApiTag): Tag {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    tagGroup: tag.tag_group,
    parentId: tag.parent_id,
    level: tag.level,
    path: tag.path,
    description: tag.description,
    synonyms: tag.synonyms,
    sortOrder: tag.sort_order,
    isSystem: tag.is_system,
    isSelectable: tag.is_selectable,
    isActive: tag.is_active,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
  };
}

function tagNodeFromApi(tag: ApiTagNode): TagNode {
  return {
    ...tagFromApi(tag),
    children: tag.children.map(tagNodeFromApi),
  };
}

function tagPayloadToApi(payload: AdminTagPayload) {
  return {
    name: payload.name,
    tag_group: payload.tagGroup,
    parent_id: payload.parentId ?? null,
    description: payload.description ?? null,
    synonyms: payload.synonyms ?? [],
    sort_order: payload.sortOrder ?? 0,
    is_selectable: payload.isSelectable ?? true,
  };
}

function tagUpdatePayloadToApi(payload: AdminTagUpdatePayload) {
  return {
    name: payload.name,
    description: payload.description,
    synonyms: payload.synonyms,
    sort_order: payload.sortOrder,
    is_selectable: payload.isSelectable,
    is_active: payload.isActive,
  };
}

function tagStatsFromApi(stats: ApiTagUsageStats): TagUsageStats {
  return {
    tagId: stats.tag_id,
    itemCount: stats.item_count,
    publishedItemCount: stats.published_item_count,
    pendingReviewItemCount: stats.pending_review_item_count,
    lastUsedAt: stats.last_used_at,
  };
}

export function fetchAdminKnowledgeBases() {
  return fetchKnowledgeBases();
}

export function fetchAdminKnowledgeMap() {
  return fetchKnowledgeMap({ knowledgeBaseId: "default" });
}

export function fetchAdminReviewItems() {
  return fetchReviewItems();
}

export function saveAdminReviewDraft(
  itemId: string,
  payload: KnowledgeItemPayload,
) {
  return saveReviewItem(itemId, payload);
}

export function publishAdminReviewItem(
  itemId: string,
  payload: KnowledgeItemPayload,
) {
  return publishReviewItem(itemId, payload);
}

export function rejectAdminReviewItem(
  itemId: string,
  payload: KnowledgeItemPayload,
) {
  return rejectReviewItem(itemId, payload);
}

export function createAdminManualItem(payload: KnowledgeItemPayload) {
  return createManualItem(payload);
}

export async function fetchAdminTags(
  query: AdminTagQuery = {},
): Promise<Tag[]> {
  const params = new URLSearchParams();
  if (query.tagGroup) params.set("tag_group", query.tagGroup);
  if (query.parentId !== undefined) params.set("parent_id", query.parentId ?? "");
  if (query.isActive !== undefined) params.set("is_active", String(query.isActive));
  if (query.q) params.set("q", query.q);
  const suffix = params.toString() ? `?${params}` : "";
  const tags = await requestAdminJson<ApiTag[]>(`/api/admin/tags${suffix}`);
  return tags.map(tagFromApi);
}

export async function fetchAdminTagTree(
  query: AdminTagTreeQuery = {},
): Promise<TagNode[]> {
  const params = new URLSearchParams();
  if (query.tagGroup) params.set("tag_group", query.tagGroup);
  if (query.includeInactive !== undefined) {
    params.set("include_inactive", String(query.includeInactive));
  }
  const suffix = params.toString() ? `?${params}` : "";
  const tree = await requestAdminJson<ApiTagNode[]>(`/api/admin/tags/tree${suffix}`);
  return tree.map(tagNodeFromApi);
}

export async function createAdminTag(payload: AdminTagPayload): Promise<Tag> {
  const tag = await requestAdminJson<ApiTag>("/api/admin/tags", {
    method: "POST",
    body: JSON.stringify(tagPayloadToApi(payload)),
  });
  return tagFromApi(tag);
}

export async function updateAdminTag(
  tagId: string,
  payload: AdminTagUpdatePayload,
): Promise<Tag> {
  const tag = await requestAdminJson<ApiTag>(`/api/admin/tags/${tagId}`, {
    method: "PATCH",
    body: JSON.stringify(tagUpdatePayloadToApi(payload)),
  });
  return tagFromApi(tag);
}

export async function disableAdminTag(
  tagId: string,
): Promise<AdminTagDisableResult> {
  const result = await requestAdminJson<ApiTagDisableResult>(
    `/api/admin/tags/${tagId}/disable`,
    { method: "POST" },
  );
  return {
    tag: tagFromApi(result.tag),
    warning: result.warning,
  };
}

export async function fetchAdminTagStats(): Promise<TagUsageStats[]> {
  const stats = await requestAdminJson<ApiTagUsageStats[]>("/api/admin/tags/stats");
  return stats.map(tagStatsFromApi);
}
