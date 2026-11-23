"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ImportUploadForm } from "@/features/questions/components/import/import-upload-form";
import { ImportProgressModal } from "@/features/questions/components/import/import-progress-modal";
import { ImportJobHistoryTable } from "@/features/questions/components/import/import-job-history-table";
import {
  useDownloadQuestionsTemplate,
  useImportQuestions,
} from "@/hooks/use-questions-import";
import {
  ImportJobDetail,
  ImportTargetStatus,
  ImportUploadResponse,
} from "@/types/question-import";

function QuestionsImportContent() {
  const downloadTemplateMutation = useDownloadQuestionsTemplate();
  const importQuestionsMutation = useImportQuestions();

  const [uploadResult, setUploadResult] =
    useState<ImportUploadResponse | null>(null);
  const [selectedHistoryJob, setSelectedHistoryJob] =
    useState<ImportJobDetail | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const handleSubmitImport = async (
    file: File,
    targetStatus: ImportTargetStatus
  ) => {
    setSelectedHistoryJob(null);
    const result = await importQuestionsMutation.mutateAsync({
      file,
      targetStatus,
    });
    setUploadResult(result);
    setIsProgressModalOpen(true);
  };

  const handleSelectHistoryJob = (job: ImportJobDetail) => {
    setUploadResult(null);
    setSelectedHistoryJob(job);
    setIsProgressModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Import câu hỏi hàng loạt (Excel / ZIP)
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tải lên hàng loạt câu hỏi đơn và nhóm câu hỏi TOEIC kèm tài nguyên
            media theo mẫu 15 cột chuẩn
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="rounded-xl self-start md:self-auto"
        >
          <Link href="/questions">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Quay lại Ngân hàng câu hỏi
          </Link>
        </Button>
      </div>

      {/* Upload & Template Section */}
      <ImportUploadForm
        isUploading={importQuestionsMutation.isPending}
        isDownloadingTemplate={downloadTemplateMutation.isPending}
        onDownloadTemplate={() => downloadTemplateMutation.mutate()}
        onSubmitImport={handleSubmitImport}
      />

      {/* Import Jobs History Table (#1006, #1007, #1008) */}
      <ImportJobHistoryTable onSelectJob={handleSelectHistoryJob} />

      {/* Real-time Progress & Error Report Modal */}
      <ImportProgressModal
        open={isProgressModalOpen}
        onOpenChange={setIsProgressModalOpen}
        initialResult={uploadResult}
        selectedJobDetail={selectedHistoryJob}
      />
    </div>
  );
}

export default function QuestionsImportPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          Đang tải giao diện Import câu hỏi...
        </div>
      }
    >
      <QuestionsImportContent />
    </Suspense>
  );
}
