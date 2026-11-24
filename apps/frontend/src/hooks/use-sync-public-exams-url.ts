"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExamType } from "@/types/exam";

export interface PublicExamsUrlFilterState {
  page: number;
  limit: 10 | 20;
  search: string;
  type: ExamType | "all";
  setPage: (page: number) => void;
  setLimit: (limit: 10 | 20) => void;
  setSearch: (search: string) => void;
  setType: (type: ExamType | "all") => void;
  resetFilters: () => void;
}

const VALID_TYPES: ExamType[] = ["full_test", "mini_test", "placement_test"];

export function useSyncPublicExamsUrl(): PublicExamsUrlFilterState {
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

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return {
    page,
    limit,
    search,
    type,
    setPage,
    setLimit,
    setSearch,
    setType,
    resetFilters,
  };
}
