import type {
  KnowledgeBase,
  KnowledgeItem,
  KnowledgeItemList,
  KnowledgeItemPayload,
  KnowledgeMapResponse,
  RelatedKnowledgeItemList,
} from "~/types/knowledge";
import { getApiUrl } from "./api";

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
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

export function fetchKnowledgeBases(): Promise<KnowledgeBase[]> {
  return requestJson<KnowledgeBase[]>("/api/knowledge-bases");
}

export function fetchKnowledgeMap(params: {
  knowledgeBaseId?: string;
  q?: string;
  clusterId?: string;
  itemType?: string;
  sourceType?: string;
  yearFrom?: string;
  yearTo?: string;
}): Promise<KnowledgeMapResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("knowledge_base_id", params.knowledgeBaseId ?? "default");
  if (params.q) searchParams.set("q", params.q);
  if (params.clusterId) searchParams.set("cluster_id", params.clusterId);
  if (params.itemType) searchParams.set("item_type", params.itemType);
  if (params.sourceType) searchParams.set("source_type", params.sourceType);
  if (params.yearFrom) searchParams.set("year_from", params.yearFrom);
  if (params.yearTo) searchParams.set("year_to", params.yearTo);
  return requestJson<KnowledgeMapResponse>(`/api/map?${searchParams}`);
}

export function fetchKnowledgeItem(itemId: string): Promise<KnowledgeItem> {
  return requestJson<KnowledgeItem>(`/api/items/${itemId}`);
}

export function fetchSimilarItems(itemId: string): Promise<KnowledgeItemList> {
  return requestJson<KnowledgeItemList>(`/api/items/${itemId}/similar`);
}

export function fetchRelatedItems(itemId: string): Promise<RelatedKnowledgeItemList> {
  return requestJson<RelatedKnowledgeItemList>(`/api/items/${itemId}/related`);
}

export function createUploadItem(
  payload: KnowledgeItemPayload,
): Promise<KnowledgeItem> {
  return requestJson<KnowledgeItem>("/api/uploads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchReviewItems(): Promise<KnowledgeItemList> {
  return requestJson<KnowledgeItemList>("/api/review-items");
}

export function saveReviewItem(
  itemId: string,
  payload: KnowledgeItemPayload,
): Promise<KnowledgeItem> {
  return requestJson<KnowledgeItem>(`/api/review-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function publishReviewItem(
  itemId: string,
  payload: KnowledgeItemPayload,
): Promise<KnowledgeItem> {
  return requestJson<KnowledgeItem>(`/api/review-items/${itemId}/publish`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function rejectReviewItem(
  itemId: string,
  payload: KnowledgeItemPayload,
): Promise<KnowledgeItem> {
  return requestJson<KnowledgeItem>(`/api/review-items/${itemId}/reject`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createManualItem(
  payload: KnowledgeItemPayload,
): Promise<KnowledgeItem> {
  return requestJson<KnowledgeItem>("/api/admin/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
