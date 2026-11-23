"use client";

import React, { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileArchive,
  FileSpreadsheet,
  Info,
  Loader2,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ClientImportPreviewResult,
  parseExcelFileForPreview,
  validateImportFileStrict,
} from "@/lib/validations/question-import.schema";
import {
  IMPORT_TEMPLATE_COLUMNS,
  ImportTargetStatus,
} from "@/types/question-import";
import { ImportPreviewModal } from "./import-preview-modal";

export interface ImportUploadFormProps {
  isUploading?: boolean;
  isDownloadingTemplate?: boolean;
  onDownloadTemplate: () => void;
  onSubmitImport: (
    file: File,
    targetStatus: ImportTargetStatus
  ) => Promise<void> | void;
}

export function ImportUploadForm({
  isUploading = false,
  isDownloadingTemplate = false,
  onDownloadTemplate,
  onSubmitImport,
}: ImportUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<ImportTargetStatus>("draft");
  const [isDragging, setIsDragging] = useState(false);

  const [previewData, setPreviewData] =
    useState<ClientImportPreviewResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isParsingPreview, setIsParsingPreview] = useState(false);

  const handleFileSelection = async (file: File | null | undefined) => {
    setPreviewData(null);

    if (!file) {
      setSelectedFile(null);
      setFileError(
        "Vui lòng chọn tệp Excel (.xlsx, .xls) hoặc gói nén (.zip) để tải lên."
      );
      return;
    }

    const strictCheck = validateImportFileStrict(file);
    if (!strictCheck.isValid) {
      setSelectedFile(null);
      setFileError(strictCheck.error || "Tệp không hợp lệ.");
      return;
    }

    setSelectedFile(file);
    setFileError(null);

    // Attempt client-side preview analysis for .xlsx files (< 100 rows)
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      setIsParsingPreview(true);
      try {
        const parsed = await parseExcelFileForPreview(file);
        if (parsed.headerError) {
          setFileError(parsed.headerError);
        }
        setPreviewData(parsed);
      } finally {
        setIsParsingPreview(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    void handleFileSelection(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    void handleFileSelection(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setPreviewData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTriggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const strictCheck = validateImportFileStrict(selectedFile);
    if (!strictCheck.isValid || !selectedFile) {
      setFileError(
        strictCheck.error ||
          "Vui lòng chọn tệp Excel (.xlsx, .xls) hoặc gói nén (.zip) để tải lên."
      );
      return;
    }

    if (previewData?.headerError) {
      setFileError(previewData.headerError);
      return;
    }

    // If < 100 rows preview is available and user hasn't confirmed yet, open preview modal
    if (previewData?.isUnderPreviewThreshold && previewData.rows.length > 0) {
      setIsPreviewOpen(true);
      return;
    }

    await onSubmitImport(selectedFile, targetStatus);
  };

  const handleConfirmFromPreview = async () => {
    if (!selectedFile) return;
    setIsPreviewOpen(false);
    await onSubmitImport(selectedFile, targetStatus);
  };

  const isZipFile = selectedFile?.name.toLowerCase().endsWith(".zip");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Upload Form (7 cols) */}
      <form
        onSubmit={handleTriggerSubmit}
        noValidate
        className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Tải lên tệp câu hỏi TOEIC
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hỗ trợ tệp Excel (.xlsx, .xls tối đa 10MB) hoặc gói nén .zip chứa
            Excel + thư mục media (tối đa 50MB).
          </p>
        </div>

        {/* Drag & Drop Zone */}
        <div>
          <label
            htmlFor="import-file-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
          >
            Tệp dữ liệu Import <span className="text-rose-500">*</span>
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors duration-200 ${
              fileError
                ? "border-rose-400 bg-rose-50/40 dark:border-rose-700 dark:bg-rose-950/20"
                : isDragging
                ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30"
                : selectedFile
                ? "border-emerald-400 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/20"
                : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
            }`}
          >
            <input
              ref={fileInputRef}
              id="import-file-input"
              data-testid="import-file-input"
              type="file"
              accept=".xlsx,.xls,.zip"
              onChange={handleInputChange}
              className="sr-only"
            />

            {!selectedFile ? (
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Kéo thả tệp vào đây hoặc{" "}
                    <span className="text-indigo-600 dark:text-indigo-400 underline">
                      nhấn để chọn tệp
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Định dạng hỗ trợ: <strong>.xlsx, .xls</strong> (≤ 10MB) hoặc{" "}
                    <strong>.zip</strong> (≤ 50MB, tối đa 1.000 dòng)
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-between gap-4 text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    {isZipFile ? (
                      <FileArchive className="w-5 h-5" />
                    ) : (
                      <FileSpreadsheet className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB •{" "}
                      {isZipFile ? "Gói nén ZIP + Media" : "Bảng tính Excel"}
                      {previewData && previewData.totalRows > 0 && (
                        <span>
                          {" "}
                          • {previewData.totalRows} dòng dữ liệu (
                          {previewData.totalRows < 100
                            ? "Xử lý đồng bộ Sync"
                            : "Hàng đợi bất đồng bộ Async"}
                          )
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFile}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Gỡ tệp
                </Button>
              </div>
            )}
          </div>

          {/* Inline Strict Validation Error Message (#1009) */}
          {fileError && (
            <p
              role="alert"
              data-testid="import-file-error"
              className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </p>
          )}
        </div>

        {/* Target Status Selection (UC14 Step 6) */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Trạng thái câu hỏi sau khi Import
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTargetStatus("draft")}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors duration-200 ${
                targetStatus === "draft"
                  ? "border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Lưu bản nháp (draft)
                </span>
                {targetStatus === "draft" && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Khuyến nghị: Tạo câu hỏi ở trạng thái nháp để kiểm tra lại trước
                khi gửi duyệt.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTargetStatus("pending_review")}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors duration-200 ${
                targetStatus === "pending_review"
                  ? "border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Gửi duyệt ngay (pending_review)
                </span>
                {targetStatus === "pending_review" && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Đẩy thẳng toàn bộ câu hỏi hợp lệ vào hàng đợi thẩm định của
                Reviewer.
              </p>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {previewData?.isUnderPreviewThreshold &&
            previewData.rows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                className="rounded-xl cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Xem trước ({previewData.totalRows} dòng)
              </Button>
            )}

          <Button
            type="submit"
            disabled={isUploading || isParsingPreview}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tải lên & xử lý...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Bắt đầu Import
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Right Column: Template Guide & 15-Column Specification (5 cols) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-5">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Mẫu tệp Excel chuẩn (15 cột)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tải tệp mẫu chính thức có sẵn Data Validation và ví dụ minh họa
                câu hỏi đơn & nhóm câu hỏi TOEIC.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="w-full justify-center rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
          >
            {isDownloadingTemplate ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Tải Template Excel chuẩn (.xlsx)
          </Button>

          {/* 15 Columns Reference */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Danh sách 15 cột bắt buộc trong sheet{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                Questions_Template
              </code>
              :
            </p>
            <div className="flex flex-wrap gap-1.5">
              {IMPORT_TEMPLATE_COLUMNS.map((col) => {
                const isGroupCol = [
                  "Group_ID",
                  "Passage_Code",
                  "Passage_Text",
                  "Media_Ref",
                ].includes(col);
                return (
                  <span
                    key={col}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                      isGroupCol
                        ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {col}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Business Rules Highlight */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Quy tắc xử lý & Gói nén ZIP
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li>
              <strong>Tệp &lt; 100 dòng:</strong> Hỗ trợ xem trước dữ liệu và xử
              lý đồng bộ tức thì.
            </li>
            <li>
              <strong>Tệp ≥ 100 dòng:</strong> Xử lý bất đồng bộ qua hàng đợi
              BullMQ và theo dõi tiến trình thời gian thực.
            </li>
            <li>
              <strong>Gom nhóm tự động:</strong> Các dòng có cùng mã nhóm/đoạn
              văn sẽ được gom nguyên tử vào cùng một <code>QuestionGroup</code>.
            </li>
            <li>
              <strong>Gói .zip:</strong> Gồm 1 file <code>.xlsx</code> và các
              file audio/ảnh khớp tên với cột tham chiếu tài nguyên.
            </li>
          </ul>
        </div>
      </div>

      {/* Preview Modal for < 100 rows */}
      <ImportPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        previewData={previewData}
        targetStatus={targetStatus}
        isSubmitting={isUploading}
        onConfirmImport={handleConfirmFromPreview}
      />
    </div>
  );
}
