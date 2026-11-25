"use client";

import React, { Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAttemptResult,
  useAttemptReview,
} from "@/hooks/use-exam-attempts";
import { extractApiErrorMeta } from "@/lib/validations/exam-attempt.schema";
import { AttemptReviewFilter } from "@/types/exam-attempt";
import { AnswerReviewWorkspace } from "@/features/exam-attempts/components/review/answer-review-workspace";

const VALID_FILTERS = new Set<AttemptReviewFilter>([
  "all",
  "correct",
  "wrong",
  "skipped",
  "marked",
]);

function ExamAttemptReviewContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const attemptIdentifier =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const rawFilter = searchParams.get("filter") as AttemptReviewFilter | null;
  const activeFilter: AttemptReviewFilter =
    rawFilter && VALID_FILTERS.has(rawFilter) ? rawFilter : "all";

  const rawPart = searchParams.get("partNumber");
  const parsedPart = rawPart ? Number(rawPart) : undefined;
  const activePartNumber =
    parsedPart && Number.isInteger(parsedPart) && parsedPart >= 1 && parsedPart <= 7
      ? parsedPart
      : undefined;

  // PMR 033 #2: Load result breakdown so availableParts is always accurate even when partNumber filter is active
  const { data: resultData } = useAttemptResult(attemptIdentifier);
  const {
    data: review,
    isLoading,
    error,
  } = useAttemptReview(attemptIdentifier, {
    filter: activeFilter,
    partNumber: activePartNumber,
  });

  const availableParts = useMemo(() => {
    if (resultData?.partBreakdown && resultData.partBreakdown.length > 0) {
      return resultData.partBreakdown
        .map((p) => p.partNumber)
        .sort((a, b) => a - b);
    }
    if (resultData?.selectedParts && resultData.selectedParts.length > 0) {
      return [...resultData.selectedParts].sort((a, b) => a - b);
    }
    const partSet = new Set<number>();
    for (const q of review?.questions || []) {
      partSet.add(q.partNumber);
    }
    return Array.from(partSet).sort((a, b) => a - b);
  }, [resultData, review?.questions]);

  const updateQuery = (next: {
    filter?: AttemptReviewFilter;
    partNumber?: number;
  }) => {
    const sp = new URLSearchParams();
    const f = next.filter ?? activeFilter;
    if (f !== "all") sp.set("filter", f);
    if (next.partNumber !== undefined) {
      sp.set("partNumber", String(next.partNumber));
    }
    const qs = sp.toString();
    router.replace(
      `/exam-attempts/${attemptIdentifier}/review${qs ? `?${qs}` : ""}`,
      { scroll: false }
    );
  };

  if (!attemptIdentifier || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">
          Đang tải chi tiết đáp án và lời giải bài làm...
        </p>
      </div>
    );
  }

  if (error || !review) {
    const errMeta = extractApiErrorMeta(error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Không thể tải trang xem lại bài làm
          </p>
          <p className="text-xs text-slate-500">{errMeta.message}</p>
          <Button asChild size="sm" className="rounded-xl bg-indigo-600 text-white text-xs">
            <Link href="/results">Quay về Lịch sử thi</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AnswerReviewWorkspace
      review={review}
      attemptSlugOrId={attemptIdentifier}
      availableParts={availableParts}
      activeFilter={activeFilter}
      activePartNumber={activePartNumber}
      onFilterChange={(f) =>
        updateQuery({ filter: f, partNumber: activePartNumber })
      }
      onPartChange={(p) =>
        updateQuery({ filter: activeFilter, partNumber: p })
      }
      onResetFilters={() =>
        updateQuery({ filter: "all", partNumber: undefined })
      }
    />
  );
}

export default function ExamAttemptReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ExamAttemptReviewContent />
    </Suspense>
  );
}
