import type { Tag, TagGroup, TagNode } from "~/types/tags";
import { getApiUrl } from "./api";

type ApiPublicTag = {
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
};

type ApiPublicTagNode = ApiPublicTag & {
  children: ApiPublicTagNode[];
};

export type UserTagQuery = {
  tagGroup?: TagGroup;
  q?: string;
};

export type UserTagTreeQuery = {
  tagGroup?: TagGroup;
};

async function requestUserJson<T>(path: string): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败：${response.status}`);
  }

  return (await response.json()) as T;
}

function publicTagFromApi(tag: ApiPublicTag): Tag {
  return {
    createdAt: "",
    description: tag.description,
    id: tag.id,
    isActive: true,
    isSelectable: tag.is_selectable,
    isSystem: tag.is_system,
    level: tag.level,
    name: tag.name,
    parentId: tag.parent_id,
    path: tag.path,
    slug: tag.slug,
    sortOrder: tag.sort_order,
    synonyms: tag.synonyms,
    tagGroup: tag.tag_group,
    updatedAt: "",
  };
}

function publicTagNodeFromApi(tag: ApiPublicTagNode): TagNode {
  return {
    ...publicTagFromApi(tag),
    children: tag.children.map(publicTagNodeFromApi),
  };
}

export async function fetchUserTags(
  query: UserTagQuery = {},
): Promise<Tag[]> {
  const params = new URLSearchParams();
  if (query.tagGroup) params.set("tag_group", query.tagGroup);
  if (query.q) params.set("q", query.q);
  const suffix = params.toString() ? `?${params}` : "";
  const tags = await requestUserJson<ApiPublicTag[]>(`/api/tags${suffix}`);
  return tags.map(publicTagFromApi);
}

export async function fetchUserTagTree(
  query: UserTagTreeQuery = {},
): Promise<TagNode[]> {
  const params = new URLSearchParams();
  if (query.tagGroup) params.set("tag_group", query.tagGroup);
  const suffix = params.toString() ? `?${params}` : "";
  const tree = await requestUserJson<ApiPublicTagNode[]>(
    `/api/tags/tree${suffix}`,
  );
  return tree.map(publicTagNodeFromApi);
}

export const getActiveTagTree = fetchUserTagTree;
