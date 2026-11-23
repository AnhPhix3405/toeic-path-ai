"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface ReviewQueueUrlFilterState {
  page: number;
  limit: 10 | 20;
  search: string;
  partId: string;
  topicId: string;
  creatorId: string;
  setPage: (page: number) => void;
  setLimit: (limit: 10 | 20) => void;
  setSearch: (search: string) => void;
  setPartId: (partId: string) => void;
  setTopicId: (topicId: string) => void;
  setCreatorId: (creatorId: string) => void;
  resetFilters: () => void;
}

export function useSyncReviewQueueUrl(): ReviewQueueUrlFilterState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPageState] = useState<number>(() => {
    const p = Number(searchParams?.get("page"));
    return Number.isInteger(p) && p >= 1 ? p : 1;
  });

  const [limit, setLimitState] = useState<10 | 20>(() => {
    const l = Number(searchParams?.get("limit"));
    return l === 10 || l === 20 ? l : 20;
  });

  const [search, setSearchState] = useState<string>(
    () => searchParams?.get("search") || ""
  );

  const [partId, setPartIdState] = useState<string>(
    () => searchParams?.get("partId") || "all"
  );

  const [topicId, setTopicIdState] = useState<string>(
    () => searchParams?.get("topicId") || "all"
  );

  const [creatorId, setCreatorIdState] = useState<string>(
    () => searchParams?.get("creatorId") || ""
  );

  const syncUrl = useCallback(
    (next: {
      page: number;
      limit: 10 | 20;
      search: string;
      partId: string;
      topicId: string;
      creatorId: string;
    }) => {
      const params = new URLSearchParams();
      if (next.search) params.set("search", next.search);
      if (next.partId && next.partId !== "all") {
        params.set("partId", next.partId);
      }
      if (next.topicId && next.topicId !== "all") {
        params.set("topicId", next.topicId);
      }
      if (next.creatorId) params.set("creatorId", next.creatorId);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 20) params.set("limit", String(next.limit));

      const qs = params.toString();
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      setPageState(nextPage);
      syncUrl({ page: nextPage, limit, search, partId, topicId, creatorId });
    },
    [limit, search, partId, topicId, creatorId, syncUrl]
  );

  const setLimit = useCallback(
    (nextLimit: 10 | 20) => {
      setLimitState(nextLimit);
      setPageState(1);
      syncUrl({ page: 1, limit: nextLimit, search, partId, topicId, creatorId });
    },
    [search, partId, topicId, creatorId, syncUrl]
  );

  const setSearch = useCallback(
    (nextSearch: string) => {
      setSearchState(nextSearch);
      setPageState(1);
      syncUrl({ page: 1, limit, search: nextSearch, partId, topicId, creatorId });
    },
    [limit, partId, topicId, creatorId, syncUrl]
  );

  const setPartId = useCallback(
    (nextPartId: string) => {
      setPartIdState(nextPartId);
      setPageState(1);
      syncUrl({ page: 1, limit, search, partId: nextPartId, topicId, creatorId });
    },
    [limit, search, topicId, creatorId, syncUrl]
  );

  const setTopicId = useCallback(
    (nextTopicId: string) => {
      setTopicIdState(nextTopicId);
      setPageState(1);
      syncUrl({
        page: 1,
        limit,
        search,
        partId,
        topicId: nextTopicId,
        creatorId,
      });
    },
    [limit, search, partId, creatorId, syncUrl]
  );

  const setCreatorId = useCallback(
    (nextCreatorId: string) => {
      setCreatorIdState(nextCreatorId);
      setPageState(1);
      syncUrl({
        page: 1,
        limit,
        search,
        partId,
        topicId,
        creatorId: nextCreatorId,
      });
    },
    [limit, search, partId, topicId, syncUrl]
  );

  const resetFilters = useCallback(() => {
    setPageState(1);
    setLimitState(20);
    setSearchState("");
    setPartIdState("all");
    setTopicIdState("all");
    setCreatorIdState("");
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    page,
    limit,
    search,
    partId,
    topicId,
    creatorId,
    setPage,
    setLimit,
    setSearch,
    setPartId,
    setTopicId,
    setCreatorId,
    resetFilters,
  };
}
