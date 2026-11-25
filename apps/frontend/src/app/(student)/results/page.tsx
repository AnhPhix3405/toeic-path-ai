"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flag, History, Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { useAttemptHistory } from "@/hooks/use-exam-attempts";
import { useMyQuestionReports } from "@/hooks/use-question-reports";
import {
  ExamAttemptStatus,
  PartPracticeMode,
} from "@/types/exam-attempt";
import { QuestionReportStatus } from "@/types/question-report";
import { ScoreTrendChart } from "@/features/exam-attempts/components/history/score-trend-chart";
import { AttemptHistoryTable } from "@/features/exam-attempts/components/history/attempt-history-table";
import { MyReportsTable } from "@/features/exam-attempts/components/history/my-reports-table";
import { cn } from "@/lib/utils";

function StudentResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = searchParams.get("tab") === "reports" ? "reports" : "history";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const limit: 10 | 20 = searchParams.get("limit") === "20" ? 20 : 10;

  const mode = (searchParams.get("mode") || undefined) as
    | PartPracticeMode
    | undefined;
  const attemptStatus = (searchParams.get("status") || undefined) as
    | ExamAttemptStatus
    | undefined;
  const reportStatus = (searchParams.get("status") || undefined) as
    | QuestionReportStatus
    | undefined;
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

  const historyQuery = useAttemptHistory(
    tab === "history"
      ? { page, limit, mode, status: attemptStatus, fromDate, toDate }
      : { page: 1, limit: 20 }
  );

  const myReportsQuery = useMyQuestionReports(
    tab === "reports"
      ? { page, limit, status: reportStatus }
      : { page: 1, limit: 10 }
  );

  // PMR 033 #6: Clean URL sync, reset page=1 and strip cross-tab params
  const pushParams = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v !== undefined && v !== "") {
        sp.set(k, String(v));
      }
    });
    const qs = sp.toString();
    router.replace(`/results${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Lịch sử làm bài &amp; Điểm số
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi tiến trình điểm TOEIC, xem lại lời giải chi tiết và trạng
            thái các báo cáo câu hỏi bạn đã gửi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start">
          <button
            type="button"
            onClick={() => pushParams({ tab: "history", page: 1, limit })}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer",
              tab === "history"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử thi
          </button>
          <button
            type="button"
            onClick={() => pushParams({ tab: "reports", page: 1, limit })}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer",
              tab === "reports"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            <Flag className="w-3.5 h-3.5" />
            Báo cáo câu hỏi của tôi
          </button>
        </div>
      </div>

      {tab === "history" ? (
        <div className="space-y-6">
          <ScoreTrendChart items={historyQuery.data?.items || []} />
          <AttemptHistoryTable
            items={historyQuery.data?.items || []}
            total={historyQuery.data?.total || 0}
            page={page}
            limit={limit}
            mode={mode}
            status={attemptStatus}
            fromDate={fromDate}
            toDate={toDate}
            isLoading={historyQuery.isLoading}
            isFetching={historyQuery.isFetching}
            onRefresh={() => void historyQuery.refetch()}
            onModeChange={(nextMode) =>
              pushParams({
                tab: "history",
                page: 1,
                limit,
                mode: nextMode,
                status: attemptStatus,
                fromDate,
                toDate,
              })
            }
            onStatusChange={(nextStatus) =>
              pushParams({
                tab: "history",
                page: 1,
                limit,
                mode,
                status: nextStatus,
                fromDate,
                toDate,
              })
            }
            onDateRangeChange={(nextFrom, nextTo) =>
              pushParams({
                tab: "history",
                page: 1,
                limit,
                mode,
                status: attemptStatus,
                fromDate: nextFrom,
                toDate: nextTo,
              })
            }
            onPageChange={(nextPage) =>
              pushParams({
                tab: "history",
                page: nextPage,
                limit,
                mode,
                status: attemptStatus,
                fromDate,
                toDate,
              })
            }
            onLimitChange={(nextLimit) =>
              pushParams({
                tab: "history",
                page: 1,
                limit: nextLimit,
                mode,
                status: attemptStatus,
                fromDate,
                toDate,
              })
            }
            onResetFilters={() => pushParams({ tab: "history", page: 1, limit })}
          />
        </div>
      ) : (
        <MyReportsTable
          items={myReportsQuery.data?.items || []}
          total={myReportsQuery.data?.total || 0}
          page={page}
          limit={limit}
          status={reportStatus}
          isLoading={myReportsQuery.isLoading}
          isFetching={myReportsQuery.isFetching}
          onRefresh={() => void myReportsQuery.refetch()}
          onStatusChange={(nextStatus) =>
            pushParams({
              tab: "reports",
              page: 1,
              limit,
              status: nextStatus,
            })
          }
          onPageChange={(nextPage) =>
            pushParams({
              tab: "reports",
              page: nextPage,
              limit,
              status: reportStatus,
            })
          }
          onLimitChange={(nextLimit) =>
            pushParams({
              tab: "reports",
              page: 1,
              limit: nextLimit,
              status: reportStatus,
            })
          }
        />
      )}
    </div>
  );
}

export default function StudentResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <StudentResultsContent />
    </Suspense>
  );
}
