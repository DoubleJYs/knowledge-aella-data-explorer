import type { KnowledgeItemPayload } from "~/types/knowledge";
import {
  createUploadItem,
  fetchKnowledgeBases,
  fetchKnowledgeItem,
  fetchKnowledgeMap,
  fetchSimilarItems,
} from "./knowledgeApi";

export type UserKnowledgeMapQuery = Parameters<typeof fetchKnowledgeMap>[0];

export function fetchUserKnowledgeBases() {
  return fetchKnowledgeBases();
}

export function fetchUserKnowledgeMap(params: UserKnowledgeMapQuery) {
  return fetchKnowledgeMap(params);
}

export function fetchPublishedKnowledgeItem(itemId: string) {
  return fetchKnowledgeItem(itemId);
}

export function fetchSimilarPublishedItems(itemId: string) {
  return fetchSimilarItems(itemId);
}

export function createUserUploadItem(payload: KnowledgeItemPayload) {
  return createUploadItem(payload);
}
