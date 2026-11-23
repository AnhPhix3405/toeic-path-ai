"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ImportJobStatus } from "@/types/question-import";

export interface ImportJobsUrlFilterState {
  page: number;
  limit: 10 | 20;
  status: ImportJobStatus | "all";
  from: string;
  to: string;
  setPage: (page: number) => void;
  setLimit: (limit: 10 | 20) => void;
  setStatus: (status: ImportJobStatus | "all") => void;
  setFrom: (from: string) => void;
  setTo: (to: string) => void;
  resetFilters: () => void;
}

const VALID_JOB_STATUSES = new Set<ImportJobStatus>([
  "pending",
  "processing",
  "completed",
  "failed",
  "partially_completed",
]);

export function useSyncImportJobsUrl(): ImportJobsUrlFilterState {
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

  const [status, setStatusState] = useState<ImportJobStatus | "all">(() => {
    const s = searchParams?.get("status") as ImportJobStatus | null;
    return s && VALID_JOB_STATUSES.has(s) ? s : "all";
  });

  const [from, setFromState] = useState<string>(
    () => searchParams?.get("from") || ""
  );

  const [to, setToState] = useState<string>(
    () => searchParams?.get("to") || ""
  );

  // Push changes back to URL (#1008)
  const syncUrl = useCallback(
    (next: {
      page: number;
      limit: 10 | 20;
      status: ImportJobStatus | "all";
      from: string;
      to: string;
    }) => {
      const params = new URLSearchParams();
      if (next.status !== "all") params.set("status", next.status);
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
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
      syncUrl({ page: nextPage, limit, status, from, to });
    },
    [limit, status, from, to, syncUrl]
  );

  const setLimit = useCallback(
    (nextLimit: 10 | 20) => {
      setLimitState(nextLimit);
      setPageState(1);
      syncUrl({ page: 1, limit: nextLimit, status, from, to });
    },
    [status, from, to, syncUrl]
  );

  const setStatus = useCallback(
    (nextStatus: ImportJobStatus | "all") => {
      setStatusState(nextStatus);
      setPageState(1);
      syncUrl({ page: 1, limit, status: nextStatus, from, to });
    },
    [limit, from, to, syncUrl]
  );

  const setFrom = useCallback(
    (nextFrom: string) => {
      setFromState(nextFrom);
      setPageState(1);
      syncUrl({ page: 1, limit, status, from: nextFrom, to });
    },
    [limit, status, to, syncUrl]
  );

  const setTo = useCallback(
    (nextTo: string) => {
      setToState(nextTo);
      setPageState(1);
      syncUrl({ page: 1, limit, status, from, to: nextTo });
    },
    [limit, status, from, syncUrl]
  );

  const resetFilters = useCallback(() => {
    setPageState(1);
    setLimitState(20);
    setStatusState("all");
    setFromState("");
    setToState("");
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    page,
    limit,
    status,
    from,
    to,
    setPage,
    setLimit,
    setStatus,
    setFrom,
    setTo,
    resetFilters,
  };
}
