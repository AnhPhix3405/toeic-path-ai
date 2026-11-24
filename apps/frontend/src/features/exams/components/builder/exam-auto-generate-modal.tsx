"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoGenerateExamDto, ExamSectionItem } from "@/types/exam";

export interface ExamAutoGenerateModalProps {
  isOpen: boolean;
  version: number;
  sections: ExamSectionItem[];
  isGenerating?: boolean;
  insufficientError?: string | null;
  onClose: () => void;
  onConfirmGenerate: (dto: AutoGenerateExamDto) => Promise<void> | void;
}

export function ExamAutoGenerateModal({
  isOpen,
  version,
  sections,
  isGenerating = false,
  insufficientError = null,
  onClose,
  onConfirmGenerate,
}: ExamAutoGenerateModalProps) {
  const [easyPct, setEasyPct] = useState(30);
  const [mediumPct, setMediumPct] = useState(50);
  const [hardPct, setHardPct] = useState(20);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLocalError(null);
    const sum = Number(easyPct) + Number(mediumPct) + Number(hardPct);
    if (
      easyPct < 0 ||
      easyPct > 100 ||
      mediumPct < 0 ||
      mediumPct > 100 ||
      hardPct < 0 ||
      hardPct > 100 ||
      sum !== 100
    ) {
      setLocalError(
        `Tổng tỷ lệ phân bổ 3 mức độ Dễ + Trung bình + Khó phải bằng 100% (hiện tại: ${sum}%).`
      );
      return;
    }

    await onConfirmGenerate({
      version,
      criteria: sections
        .filter((s) => s.partNumber !== undefined)
        .map((s) => ({
          partNumber: s.partNumber!,
          targetQuestionsCount: s.targetQuestionsCount,
          easyPercentage: Number(easyPct),
          mediumPercentage: Number(mediumPct),
          hardPercentage: Number(hardPct),
        })),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Sinh đề thi tự động từ Ngân hàng câu hỏi
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Hệ thống sẽ tự động bốc ngẫu nhiên các câu hỏi đơn và nhóm câu hỏi
            đã xuất bản (published) theo đúng chỉ tiêu từng Part của đề thi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="autogen-easy-pct"
                className="block text-xs font-bold text-emerald-700 dark:text-emerald-400"
              >
                Tỷ lệ Dễ (%)
              </label>
              <Input
                id="autogen-easy-pct"
                type="number"
                min={0}
                max={100}
                value={easyPct}
                onChange={(e) => setEasyPct(Number(e.target.value))}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="autogen-medium-pct"
                className="block text-xs font-bold text-amber-700 dark:text-amber-400"
              >
                Trung bình (%)
              </label>
              <Input
                id="autogen-medium-pct"
                type="number"
                min={0}
                max={100}
                value={mediumPct}
                onChange={(e) => setMediumPct(Number(e.target.value))}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="autogen-hard-pct"
                className="block text-xs font-bold text-rose-700 dark:text-rose-400"
              >
                Tỷ lệ Khó (%)
              </label>
              <Input
                id="autogen-hard-pct"
                type="number"
                min={0}
                max={100}
                value={hardPct}
                onChange={(e) => setHardPct(Number(e.target.value))}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          {(localError || insufficientError) && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || insufficientError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isGenerating}
            onClick={handleConfirm}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Xác nhận Sinh đề tự động
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
