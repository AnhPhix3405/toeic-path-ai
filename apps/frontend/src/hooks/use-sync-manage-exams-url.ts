"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExamStatus, ExamType } from "@/types/exam";

export interface ManageExamsUrlFilterState {
  page: number;
  limit: 10 | 20;
  search: string;
  type: ExamType | "all";
  status: ExamStatus | "all";
  setPage: (page: number) => void;
  setLimit: (limit: 10 | 20) => void;
  setSearch: (search: string) => void;
  setType: (type: ExamType | "all") => void;
  setStatus: (status: ExamStatus | "all") => void;
  resetFilters: () => void;
}

const VALID_TYPES: ExamType[] = ["full_test", "mini_test", "placement_test"];
const VALID_STATUSES: ExamStatus[] = [
  "draft",
  "published",
  "closed",
  "archived",
];

export function useSyncManageExamsUrl(): ManageExamsUrlFilterState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const raw = Number(searchParams.get("page"));
    return Number.isInteger(raw) && raw > 0 ? raw : 1;
  }, [searchParams]);

  const limit = useMemo((): 10 | 20 => {
    const raw = Number(searchParams.get("limit"));
    return raw === 20 ? 20 : 10;
  }, [searchParams]);

  const search = useMemo(
    () => searchParams.get("search") || "",
    [searchParams]
  );

  const type = useMemo((): ExamType | "all" => {
    const raw = searchParams.get("type") as ExamType | null;
    return raw && VALID_TYPES.includes(raw) ? raw : "all";
  }, [searchParams]);

  const status = useMemo((): ExamStatus | "all" => {
    const raw = searchParams.get("status") as ExamStatus | null;
    return raw && VALID_STATUSES.includes(raw) ? raw : "all";
  }, [searchParams]);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (!val || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      updateUrl({ page: nextPage > 1 ? String(nextPage) : null });
    },
    [updateUrl]
  );

  const setLimit = useCallback(
    (nextLimit: 10 | 20) => {
      updateUrl({
        limit: String(nextLimit),
        page: null,
      });
    },
    [updateUrl]
  );

  const setSearch = useCallback(
    (nextSearch: string) => {
      updateUrl({
        search: nextSearch.trim() || null,
        page: null,
      });
    },
    [updateUrl]
  );

  const setType = useCallback(
    (nextType: ExamType | "all") => {
      updateUrl({
        type: nextType === "all" ? null : nextType,
        page: null,
      });
    },
    [updateUrl]
  );

  const setStatus = useCallback(
    (nextStatus: ExamStatus | "all") => {
      updateUrl({
        status: nextStatus === "all" ? null : nextStatus,
        page: null,
      });
    },
    [updateUrl]
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    page,
    limit,
    search,
    type,
    status,
    setPage,
    setLimit,
    setSearch,
    setType,
    setStatus,
    resetFilters,
  };
}
