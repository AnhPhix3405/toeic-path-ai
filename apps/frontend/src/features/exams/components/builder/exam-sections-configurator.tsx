"use client";

import React, { useState } from "react";
import { AlertCircle, Layers, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfigureExamSectionsDto,
  ExamSectionItem,
  ExamType,
  SectionItemInput,
} from "@/types/exam";
import {
  FULL_TEST_STANDARD_SECTIONS,
  validateConfigureSectionsPayload,
} from "@/lib/validations/exam.schema";

export interface ExamSectionsConfiguratorProps {
  examType: ExamType;
  version: number;
  initialSections: ExamSectionItem[];
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (dto: ConfigureExamSectionsDto) => Promise<void> | void;
}

export function ExamSectionsConfigurator({
  examType,
  version,
  initialSections,
  disabled = false,
  isSaving = false,
  onSave,
}: ExamSectionsConfiguratorProps) {
  const [selectedParts, setSelectedParts] = useState<
    Record<
      number,
      {
        enabled: boolean;
        targetQuestionsCount: number;
        targetDurationMinutes: number | "";
      }
    >
  >(() => {
    const map: Record<
      number,
      {
        enabled: boolean;
        targetQuestionsCount: number;
        targetDurationMinutes: number | "";
      }
    > = {};

    for (const std of FULL_TEST_STANDARD_SECTIONS) {
      const existing = initialSections.find(
        (s) => s.partNumber === std.partNumber
      );
      map[std.partNumber] = {
        enabled: Boolean(existing),
        targetQuestionsCount:
          existing?.targetQuestionsCount ?? std.targetQuestionsCount,
        targetDurationMinutes:
          existing?.targetDurationMinutes !== undefined &&
          existing?.targetDurationMinutes !== null
            ? existing.targetDurationMinutes
            : std.targetDurationMinutes ?? "",
      };
    }
    return map;
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [partErrors, setPartErrors] = useState<Record<number, string>>({});

  if (examType === "full_test") {
    return null;
  }

  const handleSave = async () => {
    setValidationError(null);
    setPartErrors({});

    const sections: SectionItemInput[] = FULL_TEST_STANDARD_SECTIONS.filter(
      (std) => selectedParts[std.partNumber]?.enabled
    ).map((std) => {
      const entry = selectedParts[std.partNumber];
      return {
        partNumber: std.partNumber,
        targetQuestionsCount: Number(entry.targetQuestionsCount),
        targetDurationMinutes:
          entry.targetDurationMinutes !== ""
            ? Number(entry.targetDurationMinutes)
            : undefined,
      };
    });

    const validation = validateConfigureSectionsPayload(examType, sections);
    if (!validation.isValid) {
      setValidationError(validation.error || null);
      setPartErrors(validation.sectionErrors);
      return;
    }

    await onSave({
      version,
      sections,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Cấu hình danh sách Phần thi (Sections) & Chỉ tiêu câu hỏi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {examType === "placement_test"
                ? "Placement Test yêu cầu tổng số câu từ 20–100 câu và bắt buộc có cả Listening (Part 1–4) lẫn Reading (Part 5–7)."
                : "Chọn các Part TOEIC muốn đưa vào Mini Test và thiết lập số lượng câu hỏi mục tiêu."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={disabled || isSaving}
          onClick={handleSave}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          Lưu cấu hình Part
        </Button>
      </div>

      {validationError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {FULL_TEST_STANDARD_SECTIONS.map((std) => {
          const current = selectedParts[std.partNumber];
          const pErr = partErrors[std.partNumber];

          return (
            <div
              key={std.partNumber}
              className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
                current?.enabled
                  ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20"
                  : "border-slate-200 dark:border-slate-800 opacity-75"
              }`}
            >
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={Boolean(current?.enabled)}
                  onChange={(e) =>
                    setSelectedParts((prev) => ({
                      ...prev,
                      [std.partNumber]: {
                        ...prev[std.partNumber],
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>
                  Part {std.partNumber}: {std.partName}
                </span>
              </label>

              {current?.enabled && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label
                      htmlFor={`section-target-count-${std.partNumber}`}
                      className="block text-[11px] font-medium text-slate-500 mb-1"
                    >
                      Số câu hỏi *
                    </label>
                    <Input
                      id={`section-target-count-${std.partNumber}`}
                      type="number"
                      min={1}
                      disabled={disabled}
                      value={current.targetQuestionsCount}
                      onChange={(e) =>
                        setSelectedParts((prev) => ({
                          ...prev,
                          [std.partNumber]: {
                            ...prev[std.partNumber],
                            targetQuestionsCount: Number(e.target.value),
                          },
                        }))
                      }
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`section-target-duration-${std.partNumber}`}
                      className="block text-[11px] font-medium text-slate-500 mb-1"
                    >
                      Phút gợi ý
                    </label>
                    <Input
                      id={`section-target-duration-${std.partNumber}`}
                      type="number"
                      min={1}
                      disabled={disabled}
                      value={current.targetDurationMinutes}
                      onChange={(e) =>
                        setSelectedParts((prev) => ({
                          ...prev,
                          [std.partNumber]: {
                            ...prev[std.partNumber],
                            targetDurationMinutes:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          },
                        }))
                      }
                      placeholder="Tùy chọn"
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
              )}

              {pErr && (
                <p
                  role="alert"
                  className="text-[11px] font-medium text-rose-600 dark:text-rose-400"
                >
                  {pErr}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
