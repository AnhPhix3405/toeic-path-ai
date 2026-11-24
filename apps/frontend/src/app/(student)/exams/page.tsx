"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { BookOpen, Sliders } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PublicExamsFilters } from "@/features/exams/components/catalog/public-exams-filters";
import { PublicExamCardGrid } from "@/features/exams/components/catalog/public-exam-card-grid";
import { ExamOverviewModal } from "@/features/exams/components/catalog/exam-overview-modal";
import { useExamOverview, usePublicExams } from "@/hooks/use-exams";
import { useSyncPublicExamsUrl } from "@/hooks/use-sync-public-exams-url";
import { useAuthStore } from "@/stores/auth.store";

function PublicExamsContent() {
  const user = useAuthStore((s) => s.user);
  const isTeacherOrAdmin =
    user?.role === "teacher" || user?.role === "admin";
  const filter = useSyncPublicExamsUrl();
  const { data, isLoading, isFetching, refetch } = usePublicExams({
    page: filter.page,
    limit: filter.limit,
    search: filter.search || undefined,
    type: filter.type === "all" ? undefined : filter.type,
  });

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const { data: overviewData, isLoading: isOverviewLoading } =
    useExamOverview(selectedExamId);

  const hasActiveFilters = Boolean(filter.search || filter.type !== "all");

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Thư viện Đề thi TOEIC Công khai
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Luyện tập đề thi chuẩn ETS Full Test 200 câu, Mini Test theo kỹ năng
            và Placement Test đánh giá trình độ
          </p>
        </div>

        {isTeacherOrAdmin && (
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs self-start md:self-center"
          >
            <Link href="/exams/manage">
              <Sliders className="w-4 h-4 mr-1.5" />
              Bảng Quản trị & Tạo Đề thi
            </Link>
          </Button>
        )}
      </div>

      <PublicExamsFilters
        filter={filter}
        isFetching={isFetching}
        onRefresh={() => refetch()}
      />

      <PublicExamCardGrid
        items={data?.items || []}
        total={data?.total || 0}
        page={filter.page}
        limit={filter.limit}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        onPageChange={filter.setPage}
        onLimitChange={filter.setLimit}
        onSelectExam={(exam) => setSelectedExamId(exam.id)}
        onResetFilters={filter.resetFilters}
      />

      <ExamOverviewModal
        isOpen={Boolean(selectedExamId)}
        isLoading={isOverviewLoading}
        overview={overviewData || null}
        onClose={() => setSelectedExamId(null)}
      />
    </div>
  );
}

export default function PublicExamsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          Đang tải thư viện đề thi TOEIC...
        </div>
      }
    >
      <PublicExamsContent />
    </Suspense>
  );
}
