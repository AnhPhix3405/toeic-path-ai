"use client";

import React, { useState } from "react";
import { BookOpen, ImageIcon, Maximize2, Type } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  QuestionDeliveryItem,
  QuestionGroupDelivery,
  ReadingFontScale,
} from "@/types/exam-attempt";
import { ExamAudioPlayer } from "../shared/exam-audio-player";

export interface ExamContextPaneProps {
  question: QuestionDeliveryItem;
  group: QuestionGroupDelivery | null;
  readingFontScale: ReadingFontScale;
  onReadingFontScaleChange: (scale: ReadingFontScale) => void;
}

const FONT_SCALE_CLASSES: Record<ReadingFontScale, string> = {
  sm: "text-xs leading-relaxed",
  base: "text-sm leading-7",
  lg: "text-base leading-8",
};

export function ExamContextPane({
  question,
  group,
  readingFontScale,
  onReadingFontScaleChange,
}: ExamContextPaneProps) {
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const audioUrl = group?.audioUrl || question.audioUrl || null;
  const imageUrl = group?.imageUrl || question.imageUrl || null;
  const passageText = group?.passageText || null;

  const hasContext = Boolean(audioUrl || imageUrl || passageText);

  if (!hasContext) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          {passageText ? (
            <BookOpen className="w-4 h-4 text-indigo-600" />
          ) : (
            <ImageIcon className="w-4 h-4 text-indigo-600" />
          )}
          <span>Ngữ cảnh Part {question.partNumber}</span>
        </div>

        {passageText && (
          <div
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5"
            role="group"
            aria-label="Điều chỉnh cỡ chữ bài đọc"
          >
            <Type className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
            {(["sm", "base", "lg"] as ReadingFontScale[]).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => onReadingFontScaleChange(scale)}
                aria-pressed={readingFontScale === scale}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer",
                  readingFontScale === scale
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                {scale === "sm" ? "A-" : scale === "base" ? "A" : "A+"}
              </button>
            ))}
          </div>
        )}
      </div>

      {audioUrl && (
        <ExamAudioPlayer
          src={audioUrl}
          label={`Âm thanh Part ${question.partNumber} — Câu ${question.orderIndex}`}
        />
      )}

      {imageUrl && (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Hình ảnh minh họa câu hỏi ${question.orderIndex}`}
            className="w-full max-h-[360px] object-contain mx-auto"
          />
          <button
            type="button"
            onClick={() => setZoomImageUrl(imageUrl)}
            aria-label="Phóng to hình ảnh"
            className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 text-white text-xs font-medium hover:bg-slate-900 transition-opacity cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Phóng to
          </button>
        </div>
      )}

      {passageText && (
        <div
          className={cn(
            "whitespace-pre-wrap text-slate-800 dark:text-slate-200 font-normal",
            FONT_SCALE_CLASSES[readingFontScale]
          )}
        >
          {passageText}
        </div>
      )}

      <Dialog
        open={Boolean(zoomImageUrl)}
        onOpenChange={(open) => !open && setZoomImageUrl(null)}
      >
        <DialogContent className="sm:max-w-4xl rounded-2xl p-3">
          <DialogTitle className="sr-only">
            Xem phóng to hình ảnh câu hỏi {question.orderIndex}
          </DialogTitle>
          {zoomImageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={zoomImageUrl}
              alt={`Hình ảnh phóng to câu hỏi ${question.orderIndex}`}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
