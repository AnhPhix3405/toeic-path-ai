"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ManageExamsFilters } from "@/features/exams/components/manage/manage-exams-filters";
import { ManageExamsTable } from "@/features/exams/components/manage/manage-exams-table";
import { DeleteExamDialog } from "@/features/exams/components/manage/delete-exam-dialog";
import {
  useArchiveExam,
  useDeleteExam,
  useManageExams,
} from "@/hooks/use-exams";
import { useSyncManageExamsUrl } from "@/hooks/use-sync-manage-exams-url";
import { ExamDetail } from "@/types/exam";

function ManageExamsContent() {
  const filter = useSyncManageExamsUrl();
  const { data, isLoading, isFetching, refetch } = useManageExams({
    page: filter.page,
    limit: filter.limit,
    search: filter.search || undefined,
    type: filter.type === "all" ? undefined : filter.type,
    status: filter.status === "all" ? undefined : filter.status,
  });

  const deleteMutation = useDeleteExam();
  const archiveMutation = useArchiveExam();

  const [examToDelete, setExamToDelete] = useState<ExamDetail | null>(null);
  const [hasAttemptsError, setHasAttemptsError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!examToDelete) return;
    setHasAttemptsError(null);
    try {
      await deleteMutation.mutateAsync(examToDelete.id);
      setExamToDelete(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Đề thi đã có học viên tham gia, không thể xóa. Vui lòng chuyển trạng thái sang Lưu trữ (Archived)";
      setHasAttemptsError(msg);
    }
  };

  const handleArchiveInstead = async () => {
    if (!examToDelete) return;
    await archiveMutation.mutateAsync({
      id: examToDelete.id,
      dto: { version: examToDelete.version },
    });
    setExamToDelete(null);
    setHasAttemptsError(null);
  };

  const hasActiveFilters = Boolean(
    filter.search || filter.type !== "all" || filter.status !== "all"
  );

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
              Quản lý Đề thi TOEIC
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Khởi tạo, thiết lập cấu trúc Part 1–7, kiểm định chất lượng và xuất
            bản đề thi Full Test, Mini Test & Placement Test
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-xl text-xs self-start md:self-center"
        >
          <Link href="/exams?catalog=public">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Xem Thư viện công khai
          </Link>
        </Button>
      </div>

      <ManageExamsFilters
        filter={filter}
        isFetching={isFetching}
        onRefresh={() => refetch()}
      />

      <ManageExamsTable
        exams={data?.items || []}
        total={data?.total || 0}
        page={filter.page}
        limit={filter.limit}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        onPageChange={filter.setPage}
        onLimitChange={filter.setLimit}
        onDeleteRequest={(exam) => {
          setHasAttemptsError(null);
          setExamToDelete(exam);
        }}
        onResetFilters={filter.resetFilters}
      />

      <DeleteExamDialog
        exam={examToDelete}
        isOpen={Boolean(examToDelete)}
        isDeleting={deleteMutation.isPending}
        isArchiving={archiveMutation.isPending}
        hasAttemptsConflictError={hasAttemptsError}
        onClose={() => {
          setExamToDelete(null);
          setHasAttemptsError(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        onArchiveInstead={handleArchiveInstead}
      />
    </div>
  );
}

export default function ManageExamsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          Đang tải danh sách quản trị đề thi...
        </div>
      }
    >
      <ManageExamsContent />
    </Suspense>
  );
}
