import apiClient from "./api-client";
import { TaxonomyItem, ToeicPart } from "@/types/question";

/**
 * Robust response unwrap helper for classification catalogs.
 * Handles direct array responses, wrapped ApiResponse<{ data }>, or empty responses.
 */
function unwrapCatalogResponse<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === "object") {
    if ("data" in res && Array.isArray((res as { data: unknown }).data)) {
      return (res as { data: T[] }).data;
    }
  }
  return [];
}

export const classificationService = {
  async getToeicParts(): Promise<ToeicPart[]> {
    const response = (await apiClient.get<unknown>("/toeic-parts")) as unknown;
    return unwrapCatalogResponse<ToeicPart>(response);
  },

  async getTopics(): Promise<TaxonomyItem[]> {
    const response = (await apiClient.get<unknown>("/topics")) as unknown;
    return unwrapCatalogResponse<TaxonomyItem>(response);
  },

  async getSkills(): Promise<TaxonomyItem[]> {
    const response = (await apiClient.get<unknown>("/skills")) as unknown;
    return unwrapCatalogResponse<TaxonomyItem>(response);
  },
};
