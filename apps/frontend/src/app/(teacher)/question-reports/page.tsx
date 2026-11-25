"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { useQuestionReports } from "@/hooks/use-question-reports";
import {
  QuestionReportReason,
  QuestionReportStatus,
} from "@/types/question-report";
import { QuestionReportsQueueTable } from "@/features/question-reports/components/question-reports-queue-table";
import { ResolveReportDrawer } from "@/features/question-reports/components/resolve-report-drawer";

function QuestionReportsManagementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const limit: 10 | 20 = searchParams.get("limit") === "20" ? 20 : 10;
  const status = (searchParams.get("status") || undefined) as
    | QuestionReportStatus
    | undefined;
  const reason = (searchParams.get("reason") || undefined) as
    | QuestionReportReason
    | undefined;

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const reportsQuery = useQuestionReports({ page, limit, status, reason });

  const pushParams = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v !== undefined && v !== "") sp.set(k, String(v));
    });
    const qs = sp.toString();
    router.replace(`/question-reports${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <Flag className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Hàng đợi xử lý Báo cáo câu hỏi lỗi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tiếp nhận, thẩm định và phản hồi các báo cáo sai sót từ học viên
            trên ngân hàng câu hỏi TOEIC.
          </p>
        </div>
      </div>

      <QuestionReportsQueueTable
        items={reportsQuery.data?.items || []}
        total={reportsQuery.data?.total || 0}
        page={page}
        limit={limit}
        status={status}
        reason={reason}
        isLoading={reportsQuery.isLoading}
        isFetching={reportsQuery.isFetching}
        onRefresh={() => void reportsQuery.refetch()}
        onStatusChange={(nextStatus) =>
          pushParams({ page: 1, limit, status: nextStatus, reason })
        }
        onReasonChange={(nextReason) =>
          pushParams({ page: 1, limit, status, reason: nextReason })
        }
        onPageChange={(nextPage) =>
          pushParams({ page: nextPage, limit, status, reason })
        }
        onLimitChange={(nextLimit) =>
          pushParams({ page: 1, limit: nextLimit, status, reason })
        }
        onResetFilters={() => pushParams({ page: 1, limit })}
        onInspectReport={(id) => setSelectedReportId(id)}
      />

      <ResolveReportDrawer
        reportId={selectedReportId}
        onClose={() => setSelectedReportId(null)}
      />
    </div>
  );
}

export default function QuestionReportsManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <QuestionReportsManagementContent />
    </Suspense>
  );
}
