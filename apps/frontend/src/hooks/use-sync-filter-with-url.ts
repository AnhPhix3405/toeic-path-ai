"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuestionFilterStore } from "@/stores/question-filter.store";

/**
 * Hook to synchronize Zustand question filter store with URL search params (PM Point 3).
 * Enables natural browser back/forward navigation and link sharing.
 */
export function useSyncFilterWithUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const store = useQuestionFilterStore();
  const isInitialSyncDone = useRef(false);

  // 1. On mount: hydrate store from URLSearchParams
  useEffect(() => {
    if (!isInitialSyncDone.current && searchParams) {
      store.syncWithUrlParams(searchParams);
      isInitialSyncDone.current = true;
    }
  }, [searchParams, store]);

  // 2. On store change: push updated search params to URL
  useEffect(() => {
    if (!isInitialSyncDone.current) return;

    const currentQuery = new URLSearchParams();

    if (store.search) currentQuery.set("search", store.search);
    if (store.partId) currentQuery.set("partId", store.partId);
    if (store.difficulty) currentQuery.set("difficulty", store.difficulty);
    if (store.status) currentQuery.set("status", store.status);
    if (store.topicIds.length > 0) currentQuery.set("topicIds", store.topicIds.join(","));
    if (store.skillIds.length > 0) currentQuery.set("skillIds", store.skillIds.join(","));
    if (store.page > 1) currentQuery.set("page", store.page.toString());
    if (store.limit !== 20) currentQuery.set("limit", store.limit.toString());

    const queryString = currentQuery.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Use router.replace to avoid clogging the history stack for every keystroke/filter
    router.replace(newUrl, { scroll: false });
  }, [
    store.search,
    store.partId,
    store.difficulty,
    store.status,
    store.topicIds,
    store.skillIds,
    store.page,
    store.limit,
    pathname,
    router,
  ]);
}
