"use client";

import React from "react";
import { CheckCircle2, Eye, Sparkles } from "lucide-react";
import { PassageViewer } from "./passage-viewer";
import { Question } from "@/types/question";
import { useQuestionGroupMedia } from "@/hooks/use-media";
import { AudioPlayer } from "@/features/media/components/audio-player";
import { ImageLightbox } from "@/features/media/components/image-lightbox";
import type { MediaResource } from "@/types/media";

interface GroupToeicPreviewProps {
  title?: string | null;
  context: string;
  questions: Question[];
  groupId?: string;
  mediaItems?: MediaResource[];
}

const optionLabels = ["A", "B", "C", "D", "E", "F"];

export function GroupToeicPreview({
  title,
  context,
  questions,
  groupId,
  mediaItems: propMediaItems,
}: GroupToeicPreviewProps) {
  const { data: fetchedMedia } = useQuestionGroupMedia(groupId);
  const mediaItems = propMediaItems || fetchedMedia || [];

  const audioItems = mediaItems.filter((m) => m.resourceType === "audio");
  const imageItems = mediaItems.filter((m) => m.resourceType === "image");

  const sortedQuestions = [...questions].sort(
    (a, b) => (a.groupOrder || 0) - (b.groupOrder || 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Eye className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Mô phỏng bài thi TOEIC nhóm (Split-view Preview)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Giao diện đối chiếu song song giữa đoạn văn ngữ cảnh và các câu hỏi trắc nghiệm
          </p>
        </div>
      </div>

      {/* Embedded Group Audio Player (Part 3, 4 Conversation / Talks) */}
      {audioItems.length > 0 && (
        <div className="space-y-2">
          {audioItems.map((audio) => (
            <AudioPlayer
              key={audio.id}
              src={audio.fileUrl}
              title={title || "Group Audio Track"}
              fileName={audio.fileName}
              variant="standard"
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Passage Viewer with Independent Scroll & Embedded Images */}
        <div className="lg:col-span-6 sticky top-6 space-y-4">
          <PassageViewer
            title={title || "Reading Passage"}
            context={context}
            maxHeight="max-h-[640px]"
          />

          {/* Embedded Group Images (Part 7 Articles / Tables / Graphs) */}
          {imageItems.length > 0 && (
            <div className="space-y-3">
              {imageItems.map((img) => (
                <ImageLightbox
                  key={img.id}
                  src={img.fileUrl}
                  fileName={img.fileName}
                  fileSize={img.fileSize}
                  showMetadataBadge
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Questions Stack */}
        <div className="lg:col-span-6 space-y-4 max-h-[640px] overflow-y-auto pr-1">
          {sortedQuestions.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
              Chưa có câu hỏi con nào được gán để hiển thị mô phỏng.
            </div>
          ) : (
            sortedQuestions.map((q, idx) => {
              const questionNumber = q.groupOrder || 151 + idx;

              return (
                <div
                  key={q.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Question {questionNumber}
                    </span>
                    {q.part && (
                      <span className="text-[11px] text-slate-400">
                        Part {q.part.partNumber}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                    {q.content}
                  </p>

                  {/* Options */}
                  <div className="space-y-2 pt-1">
                    {q.options?.map((opt, optIdx) => {
                      const label =
                        opt.label || optionLabels[optIdx] || String.fromCharCode(65 + optIdx);
                      const isCorrect = opt.isCorrect;

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs ${
                            isCorrect
                              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-medium"
                              : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {label}
                          </span>
                          <span className="flex-1 text-slate-800 dark:text-slate-200">
                            {opt.content}
                          </span>
                          {isCorrect && (
                            <span className="inline-flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Đáp án đúng
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
