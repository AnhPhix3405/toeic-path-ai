"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AttemptReviewFilter,
  ExamAttemptReviewResponse,
  QuestionGroupReview,
  QuestionReviewItem,
} from "@/types/exam-attempt";
import { ExamAudioPlayer } from "@/features/exam-attempts/components/shared/exam-audio-player";
import { ReportQuestionModal } from "@/features/question-reports/components/report-question-modal";
import { ReviewFilterBar } from "./review-filter-bar";
import { ReviewQuestionCard } from "./review-question-card";
import { cn } from "@/lib/utils";

export interface AnswerReviewWorkspaceProps {
  review: ExamAttemptReviewResponse;
  attemptSlugOrId: string;
  availableParts: number[];
  activeFilter: AttemptReviewFilter;
  activePartNumber?: number;
  onFilterChange: (filter: AttemptReviewFilter) => void;
  onPartChange: (partNumber?: number) => void;
  onResetFilters?: () => void;
}

export function AnswerReviewWorkspace({
  review,
  attemptSlugOrId,
  availableParts,
  activeFilter,
  activePartNumber,
  onFilterChange,
  onPartChange,
  onResetFilters,
}: AnswerReviewWorkspaceProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showGroupTranscript, setShowGroupTranscript] = useState(false);
  const [reportTarget, setReportTarget] = useState<QuestionReviewItem | null>(
    null
  );

  const safeIndex =
    review.questions.length > 0
      ? Math.min(selectedIndex, review.questions.length - 1)
      : 0;
  const activeQuestion = review.questions[safeIndex] ?? null;

  const groupMap = useMemo(() => {
    const map = new Map<string, QuestionGroupReview>();
    for (const g of review.questionGroups) {
      map.set(g.id, g);
    }
    return map;
  }, [review.questionGroups]);

  const activeGroup = activeQuestion?.questionGroupId
    ? groupMap.get(activeQuestion.questionGroupId) ?? null
    : null;

  const hasContextPane = Boolean(
    activeGroup?.passageText ||
      activeGroup?.audioUrl ||
      activeGroup?.imageUrl ||
      activeGroup?.transcript ||
      activeQuestion?.audioUrl ||
      activeQuestion?.imageUrl
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
            >
              <Link href={`/exam-attempts/${attemptSlugOrId}/result`}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Báo cáo điểm số
              </Link>
            </Button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              Xem lại đáp án &amp; Lời giải chi tiết
            </h1>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
          >
            <Link href="/results">
              <Trophy className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              Lịch sử thi
            </Link>
          </Button>
        </div>
      </header>

      {/* Filter Bar */}
      <ReviewFilterBar
        filterCounts={review.filterCounts}
        activeFilter={activeFilter}
        availableParts={availableParts}
        activePartNumber={activePartNumber}
        onFilterChange={(next) => {
          setSelectedIndex(0);
          onFilterChange(next);
        }}
        onPartChange={(nextPart) => {
          setSelectedIndex(0);
          onPartChange(nextPart);
        }}
      />

      {/* Main Split-Screen Review Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5">
        {review.questions.length === 0 || !activeQuestion ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Không có câu hỏi nào khớp với bộ lọc hiện tại
            </p>
            <p className="text-xs text-slate-500">
              Thử chuyển sang tab &quot;Tất cả&quot; hoặc chọn Part khác để xem
              lại bài làm.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedIndex(0);
                if (onResetFilters) {
                  onResetFilters();
                } else {
                  onFilterChange("all");
                  onPartChange(undefined);
                }
              }}
              className="rounded-xl text-xs cursor-pointer"
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-9 space-y-4">
              <div
                className={cn(
                  "grid gap-5 items-start",
                  hasContextPane ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
                )}
              >
                {/* Left Context Pane */}
                {hasContextPane && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4 xl:sticky xl:top-20 max-h-[78vh] overflow-y-auto">
                    {activeGroup?.title && (
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {activeGroup.title}
                      </h2>
                    )}

                    {(activeGroup?.audioUrl || activeQuestion.audioUrl) && (
                      <ExamAudioPlayer
                        src={
                          (activeGroup?.audioUrl || activeQuestion.audioUrl)!
                        }
                        label={`Audio Part ${activeQuestion.partNumber}`}
                      />
                    )}

                    {(activeGroup?.imageUrl || activeQuestion.imageUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          (activeGroup?.imageUrl || activeQuestion.imageUrl)!
                        }
                        alt={`Minh họa câu ${activeQuestion.orderIndex}`}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 object-contain max-h-[380px] bg-slate-50 dark:bg-slate-950"
                      />
                    )}

                    {activeGroup?.passageText && (
                      <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {activeGroup.passageText}
                      </div>
                    )}

                    {activeGroup?.transcript && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowGroupTranscript((v) => !v)}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            Lời thoại hội thoại / bài nói (Transcript)
                          </span>
                          {showGroupTranscript ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        {showGroupTranscript && (
                          <div className="px-4 pb-3 pt-1 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border-t border-slate-200/70 dark:border-slate-700/70">
                            {activeGroup.transcript}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Right Question & Explanation Pane */}
                <div className="space-y-4">
                  <ReviewQuestionCard
                    question={activeQuestion}
                    onOpenReportModal={(q) => setReportTarget(q)}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeIndex <= 0}
                      onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                      className="rounded-xl text-xs cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Câu trước
                    </Button>
                    <span className="text-xs text-slate-500 font-mono">
                      {safeIndex + 1} / {review.questions.length}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={safeIndex >= review.questions.length - 1}
                      onClick={() =>
                        setSelectedIndex((i) =>
                          Math.min(review.questions.length - 1, i + 1)
                        )
                      }
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
                    >
                      Câu tiếp theo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Review Palette Sidebar */}
            <aside className="lg:col-span-3 lg:sticky lg:top-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Danh sách câu hỏi ({review.questions.length})
              </h2>
              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {review.questions.map((q, idx) => {
                  const isActive = idx === safeIndex;
                  const isSkipped = !q.selectedOptionId;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={cn(
                        "h-9 rounded-lg text-xs font-bold font-mono border transition-all cursor-pointer relative",
                        isActive && "ring-2 ring-indigo-500 ring-offset-1",
                        q.isCorrect
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                          : isSkipped
                          ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                          : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                      )}
                    >
                      {q.orderIndex}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Report Question Modal — PMR 033 #2: strictly pass canonical UUID review.attemptId */}
      {reportTarget && (
        <ReportQuestionModal
          isOpen={Boolean(reportTarget)}
          questionId={reportTarget.id}
          attemptId={review.attemptId}
          questionLabel={`Câu ${reportTarget.orderIndex} - Part ${reportTarget.partNumber}`}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
