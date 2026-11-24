"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Loader2,
  Lock,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ExamDetail,
  ExamType,
  ScoreConversionType,
} from "@/types/exam";
import {
  examFormSchema,
  ExamFormValues,
} from "@/lib/validations/exam.schema";

export interface ExamFormProps {
  mode: "create" | "edit";
  initialExam?: ExamDetail | null;
  isSubmitting?: boolean;
  onSubmit: (values: ExamFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export function ExamForm({
  mode,
  initialExam,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: ExamFormProps) {
  const isClosedLocked = mode === "edit" && initialExam?.status === "closed";

  const [values, setValues] = useState<ExamFormValues>({
    title: initialExam?.title || "",
    description: initialExam?.description || "",
    type: initialExam?.type || "full_test",
    durationMinutes: initialExam?.durationMinutes ?? 120,
    maxAttempts:
      initialExam?.maxAttempts !== undefined && initialExam?.maxAttempts !== null
        ? initialExam.maxAttempts
        : "",
    passingScore:
      initialExam?.passingScore !== undefined &&
      initialExam?.passingScore !== null
        ? initialExam.passingScore
        : "",
    openAt: toDatetimeLocalValue(initialExam?.openAt),
    closeAt: toDatetimeLocalValue(initialExam?.closeAt),
    allowPartPractice: initialExam?.allowPartPractice ?? true,
    isShuffledQuestions: initialExam?.isShuffledQuestions ?? false,
    isShuffledOptions: initialExam?.isShuffledOptions ?? false,
    scoreConversionType:
      initialExam?.scoreConversionType || "DEFAULT_ETS",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleTypeChange = (nextType: ExamType) => {
    if (isClosedLocked) return;
    setValues((prev) => ({
      ...prev,
      type: nextType,
      durationMinutes:
        nextType === "full_test"
          ? 120
          : nextType === "placement_test"
          ? 45
          : 30,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = examFormSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || "form");
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    await onSubmit(values);
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6"
    >
      {/* Review Focus 1: Locked fields warning when status === 'closed' */}
      {isClosedLocked && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs"
        >
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              Đề thi đang ở trạng thái Đã đóng (Closed)
            </p>
            <p>
              Theo quy tắc bảo toàn dữ liệu thi (BR16.7), hệ thống chỉ cho phép
              chỉnh sửa tiêu đề và mô tả hiển thị. Các thông số kỹ thuật cốt lõi
              (loại đề, thời lượng, quy tắc xáo trộn, thang điểm) đã được khóa.
            </p>
          </div>
        </div>
      )}

      {/* Title & Description */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="exam-title-input"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Tiêu đề đề thi *
          </label>
          <Input
            id="exam-title-input"
            value={values.title}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Ví dụ: ETS TOEIC 2026 Test 01 - Full Mock Exam"
            className="rounded-xl"
          />
          {fieldErrors.title && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fieldErrors.title}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="exam-description-input"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Mô tả đề thi (Tùy chọn)
          </label>
          <textarea
            id="exam-description-input"
            rows={3}
            value={values.description || ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Nhập mô tả cấu trúc, mục tiêu hoặc hướng dẫn cho học viên..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Exam Type Selector */}
      <div className="space-y-2">
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Loại hình đề thi *
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            [
              {
                value: "full_test",
                label: "Full Test (Chuẩn 200 câu)",
                desc: "Tự động tạo sẵn 7 Part chuẩn ETS (100 Listening + 100 Reading), mặc định 120 phút.",
              },
              {
                value: "mini_test",
                label: "Mini Test (Rút gọn)",
                desc: "Tùy chọn các Part và số lượng câu hỏi linh hoạt để luyện tập chuyên sâu.",
              },
              {
                value: "placement_test",
                label: "Placement Test (Đầu vào)",
                desc: "Đề kiểm tra phân loại trình độ từ 20–100 câu (bắt buộc có cả Listening & Reading).",
              },
            ] as const
          ).map((item) => {
            const isSelected = values.type === item.value;
            return (
              <button
                key={item.value}
                type="button"
                disabled={isClosedLocked || mode === "edit"}
                onClick={() => handleTypeChange(item.value)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {item.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration, Max Attempts, Passing Score, Score Conversion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="exam-duration-input"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Thời lượng làm bài (Phút) *
          </label>
          <Input
            id="exam-duration-input"
            type="number"
            disabled={isClosedLocked}
            value={values.durationMinutes}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                durationMinutes: Number(e.target.value),
              }))
            }
            className="rounded-xl"
          />
          {fieldErrors.durationMinutes && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              {fieldErrors.durationMinutes}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="exam-max-attempts-input"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Số lượt làm tối đa (Trống = Vô hạn)
          </label>
          <Input
            id="exam-max-attempts-input"
            type="number"
            min={1}
            disabled={isClosedLocked}
            value={values.maxAttempts ?? ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                maxAttempts:
                  e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
            placeholder="Không giới hạn"
            className="rounded-xl"
          />
          {fieldErrors.maxAttempts && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              {fieldErrors.maxAttempts}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="exam-passing-score-input"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Điểm chuẩn đạt (0 – 990)
          </label>
          <Input
            id="exam-passing-score-input"
            type="number"
            min={0}
            max={990}
            disabled={isClosedLocked}
            value={values.passingScore ?? ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                passingScore:
                  e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
            placeholder="Ví dụ: 600"
            className="rounded-xl"
          />
          {fieldErrors.passingScore && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              {fieldErrors.passingScore}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="exam-conversion-select"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Thang quy đổi điểm
          </label>
          <select
            id="exam-conversion-select"
            disabled={isClosedLocked}
            value={values.scoreConversionType}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                scoreConversionType: e.target.value as ScoreConversionType,
              }))
            }
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 text-xs font-medium disabled:opacity-50"
          >
            <option value="DEFAULT_ETS">Chuẩn ETS TOEIC (10 – 990)</option>
            <option value="RAW_PERCENTAGE">Phần trăm số câu đúng (%)</option>
            <option value="CUSTOM">Thang quy đổi tùy chỉnh</option>
          </select>
        </div>
      </div>

      {/* Schedule OpenAt & CloseAt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="exam-open-at-input"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Thời điểm mở đề (Tùy chọn)
          </label>
          <Input
            id="exam-open-at-input"
            type="datetime-local"
            value={values.openAt || ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, openAt: e.target.value }))
            }
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="exam-close-at-input"
            className="block text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Thời điểm đóng đề (Tùy chọn)
          </label>
          <Input
            id="exam-close-at-input"
            type="datetime-local"
            value={values.closeAt || ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, closeAt: e.target.value }))
            }
            className="rounded-xl"
          />
          {fieldErrors.closeAt && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fieldErrors.closeAt}
            </p>
          )}
        </div>
      </div>

      {/* Toggles: allowPartPractice, isShuffledQuestions, isShuffledOptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
          <input
            type="checkbox"
            disabled={isClosedLocked}
            checked={values.allowPartPractice}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                allowPartPractice: e.target.checked,
              }))
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <div className="text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Cho phép luyện tập từng Part
            </p>
            <p className="text-[11px] text-slate-500">
              Học viên có thể bóc tách từng Part để tự luyện tập (allowPartPractice).
            </p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
          <input
            type="checkbox"
            disabled={isClosedLocked}
            checked={values.isShuffledQuestions}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                isShuffledQuestions: e.target.checked,
              }))
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <div className="text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Xáo trộn thứ tự câu hỏi
            </p>
            <p className="text-[11px] text-slate-500">
              Đảo ngẫu nhiên vị trí câu hỏi nhưng giữ nguyên tính liên tục của nhóm đoạn văn.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
          <input
            type="checkbox"
            disabled={isClosedLocked}
            checked={values.isShuffledOptions}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                isShuffledOptions: e.target.checked,
              }))
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <div className="text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Xáo trộn đáp án A/B/C/D
            </p>
            <p className="text-[11px] text-slate-500">
              Đảo thứ tự các phương án lựa chọn khi phát đề cho học viên.
            </p>
          </div>
        </label>
      </div>

      {/* Form Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-xl text-xs cursor-pointer"
          >
            Hủy bỏ
          </Button>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1.5" />
          )}
          {mode === "create" ? "Khởi tạo đề thi" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
