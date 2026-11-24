"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExamRoomStore } from "@/stores/exam-room.store";
import { useExamAutosave } from "@/hooks/use-exam-autosave";
import {
  ExamAttemptOverview,
  ExamAttemptQuestionsResponse,
  QuestionGroupDelivery,
} from "@/types/exam-attempt";
import { ExamRoomHeader } from "./exam-room-header";
import { ExamContextPane } from "./exam-context-pane";
import { ExamQuestionCard } from "./exam-question-card";
import { ExamQuestionPalette } from "./exam-question-palette";
import { ExamExpiredOverlay } from "./exam-expired-overlay";

export interface ExamRoomWorkspaceProps {
  overview: ExamAttemptOverview;
  delivery: ExamAttemptQuestionsResponse;
  onRefreshOverview?: () => void;
  onSubmitExamAttempt?: () => void;
}

export function ExamRoomWorkspace({
  overview,
  delivery,
  onRefreshOverview,
  onSubmitExamAttempt,
}: ExamRoomWorkspaceProps) {
  const attemptId = overview.id;
  const [isPaletteDrawerOpen, setIsPaletteDrawerOpen] = useState(false);

  const hydrateAttempt = useExamRoomStore((s) => s.hydrateAttempt);
  const setActiveOrderIndex = useExamRoomStore((s) => s.setActiveOrderIndex);
  const setActivePart = useExamRoomStore((s) => s.setActivePart);
  const lockExpired = useExamRoomStore((s) => s.lockExpired);
  const readingFontScale = useExamRoomStore((s) => s.readingFontScale);
  const setReadingFontScale = useExamRoomStore((s) => s.setReadingFontScale);

  const session = useExamRoomStore((s) => s.sessions[attemptId]);

  useEffect(() => {
    hydrateAttempt({
      attemptId,
      expiresAt: overview.expiresAt,
      serverTimeNow: overview.serverTimeNow,
      questions: delivery.questions,
      isExpired: overview.isExpired || overview.status !== "in_progress",
    });
  }, [
    attemptId,
    overview.expiresAt,
    overview.serverTimeNow,
    overview.isExpired,
    overview.status,
    delivery.questions,
    hydrateAttempt,
  ]);

  const isLockedExpired =
    Boolean(session?.isLockedExpired) ||
    overview.isExpired ||
    overview.status !== "in_progress";

  const activeOrderIndex = session?.activeOrderIndex ?? 1;

  // O(1) deduplicated questionGroups lookup map (PMR 018)
  const groupMap = useMemo(() => {
    const map = new Map<string, QuestionGroupDelivery>();
    for (const g of delivery.questionGroups) {
      map.set(g.id, g);
    }
    return map;
  }, [delivery.questionGroups]);

  // Strict available Parts derived from the attempt's questions (prevents 400 ERR_PART_NOT_IN_ATTEMPT)
  const availableParts = useMemo(() => {
    const partSet = new Set<number>();
    for (const q of delivery.questions) {
      partSet.add(q.partNumber);
    }
    return Array.from(partSet).sort((a, b) => a - b);
  }, [delivery.questions]);

  const activeQuestion = useMemo(() => {
    return (
      delivery.questions.find((q) => q.orderIndex === activeOrderIndex) ??
      delivery.questions[0] ??
      null
    );
  }, [delivery.questions, activeOrderIndex]);

  const activeGroup = useMemo(() => {
    if (!activeQuestion?.questionGroupId) return null;
    return groupMap.get(activeQuestion.questionGroupId) ?? null;
  }, [activeQuestion, groupMap]);

  const answersMap = session?.answers ?? {};

  const answeredCount = useMemo(() => {
    let count = 0;
    for (const q of delivery.questions) {
      if (answersMap[q.id]?.selectedOptionId) {
        count++;
      }
    }
    return count;
  }, [delivery.questions, answersMap]);

  const {
    handleSelectOption,
    handleClearOption,
    handleToggleReview,
    flushPendingBatch,
    flushOnExpire,
    syncStatus,
    pendingCount,
  } = useExamAutosave({
    attemptId,
    activeQuestionId: activeQuestion?.id ?? null,
    isLocked: isLockedExpired,
    onRefreshOverview,
  });

  const handleJumpToOrderIndex = useCallback(
    (orderIndex: number) => {
      const target = delivery.questions.find(
        (q) => q.orderIndex === orderIndex
      );
      if (!target) return;
      setActiveOrderIndex(attemptId, target.orderIndex);
      setActivePart(attemptId, target.partNumber);
      setIsPaletteDrawerOpen(false);
    },
    [attemptId, delivery.questions, setActiveOrderIndex, setActivePart]
  );

  const handleSelectPartTab = useCallback(
    (partNumber: number) => {
      const firstInPart = delivery.questions.find(
        (q) => q.partNumber === partNumber
      );
      if (firstInPart) {
        setActiveOrderIndex(attemptId, firstInPart.orderIndex);
        setActivePart(attemptId, partNumber);
      }
    },
    [attemptId, delivery.questions, setActiveOrderIndex, setActivePart]
  );

  const handleExpire = useCallback(() => {
    lockExpired(attemptId);
    void flushOnExpire();
  }, [attemptId, lockExpired, flushOnExpire]);

  // PMR 025 #4: Global keyboard shortcuts with strict INPUT/TEXTAREA/SELECT/locked guard
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        isLockedExpired ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (!activeQuestion) return;

      if (event.key === "ArrowLeft" && activeOrderIndex > 1) {
        event.preventDefault();
        handleJumpToOrderIndex(activeOrderIndex - 1);
        return;
      }

      if (
        event.key === "ArrowRight" &&
        activeOrderIndex < delivery.questions.length
      ) {
        event.preventDefault();
        handleJumpToOrderIndex(activeOrderIndex + 1);
        return;
      }

      const lower = event.key.toLowerCase();
      if (lower === "f") {
        event.preventDefault();
        handleToggleReview(activeQuestion.id);
        return;
      }

      const optionIndexMap: Record<string, number> = {
        "1": 0,
        a: 0,
        "2": 1,
        b: 1,
        "3": 2,
        c: 2,
        "4": 3,
        d: 3,
      };
      if (lower in optionIndexMap) {
        const opt = activeQuestion.options[optionIndexMap[lower]];
        if (opt) {
          event.preventDefault();
          handleSelectOption(activeQuestion.id, opt.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isLockedExpired,
    activeQuestion,
    activeOrderIndex,
    delivery.questions.length,
    handleJumpToOrderIndex,
    handleSelectOption,
    handleToggleReview,
  ]);

  const hasSplitContext = Boolean(
    activeGroup?.passageText ||
      activeGroup?.audioUrl ||
      activeGroup?.imageUrl ||
      activeQuestion?.audioUrl ||
      activeQuestion?.imageUrl
  );

  const activePartNumber =
    activeQuestion?.partNumber ?? availableParts[0] ?? 1;

  const modeLabel =
    overview.mode === "part_practice"
      ? `Luyện Part ${(overview.selectedParts ?? availableParts).join(", ")}`
      : "Full Exam";

  const activeAnswerState = activeQuestion
    ? answersMap[activeQuestion.id]
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <ExamRoomHeader
        examTitle={overview.examTitle}
        modeLabel={modeLabel}
        answeredCount={answeredCount}
        totalQuestions={delivery.questions.length}
        expiresAt={overview.expiresAt}
        serverTimeOffsetMs={session?.serverTimeOffsetMs ?? 0}
        isForceExpired={isLockedExpired}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        onManualSync={() => void flushPendingBatch({ manual: true })}
        onOpenPaletteDrawer={() => setIsPaletteDrawerOpen(true)}
        onExpire={handleExpire}
      />

      {/* Part Tabs Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div
          role="tablist"
          aria-label="Các phần thi trong bài làm"
          className="max-w-[1600px] mx-auto px-3 sm:px-5 py-2 flex items-center gap-1.5 overflow-x-auto"
        >
          {availableParts.map((partNum) => {
            const isSelected = partNum === activePartNumber;
            return (
              <button
                key={partNum}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectPartTab(partNum)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer",
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                Part {partNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Question & Context Area */}
          <div className="lg:col-span-9 space-y-4">
            {activeQuestion ? (
              <div
                className={cn(
                  "grid gap-5 items-start",
                  hasSplitContext ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
                )}
              >
                {hasSplitContext && (
                  <ExamContextPane
                    question={activeQuestion}
                    group={activeGroup}
                    readingFontScale={readingFontScale}
                    onReadingFontScaleChange={setReadingFontScale}
                  />
                )}

                <div className="space-y-4">
                  <ExamQuestionCard
                    question={activeQuestion}
                    selectedOptionId={
                      activeAnswerState?.selectedOptionId ?? null
                    }
                    isMarkedForReview={Boolean(
                      activeAnswerState?.isMarkedForReview
                    )}
                    isLocked={isLockedExpired}
                    onSelectOption={handleSelectOption}
                    onClearOption={handleClearOption}
                    onToggleReview={handleToggleReview}
                  />

                  {/* Prev / Next Navigation */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={activeOrderIndex <= 1}
                      onClick={() =>
                        handleJumpToOrderIndex(activeOrderIndex - 1)
                      }
                      className="rounded-xl text-xs cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Câu trước
                    </Button>

                    <span className="text-xs text-slate-500 hidden sm:inline">
                      Phím tắt: A–D / 1–4 chọn • F xem lại • ← → chuyển câu
                    </span>

                    <Button
                      type="button"
                      disabled={activeOrderIndex >= delivery.questions.length}
                      onClick={() =>
                        handleJumpToOrderIndex(activeOrderIndex + 1)
                      }
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
                    >
                      Câu tiếp theo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500">
                Không có câu hỏi nào trong lượt thi này.
              </div>
            )}
          </div>

          {/* Desktop Question Palette Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-20">
            <ExamQuestionPalette
              questions={delivery.questions}
              answers={answersMap}
              activeOrderIndex={activeOrderIndex}
              onJumpToOrderIndex={handleJumpToOrderIndex}
            />
          </aside>
        </div>
      </main>

      {/* Mobile / Tablet Question Palette Drawer */}
      <Dialog
        open={isPaletteDrawerOpen}
        onOpenChange={setIsPaletteDrawerOpen}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-4">
          <DialogTitle className="sr-only">Bảng điều hướng câu hỏi</DialogTitle>
          <ExamQuestionPalette
            questions={delivery.questions}
            answers={answersMap}
            activeOrderIndex={activeOrderIndex}
            onJumpToOrderIndex={handleJumpToOrderIndex}
          />
        </DialogContent>
      </Dialog>

      {/* Deterministic Expiration Lock Overlay */}
      <ExamExpiredOverlay
        isOpen={isLockedExpired}
        isSyncing={syncStatus === "syncing"}
        pendingCount={pendingCount}
        answeredCount={answeredCount}
        totalQuestions={delivery.questions.length}
        onRetrySync={() =>
          void flushPendingBatch({ manual: true, allowWhenLocked: true })
        }
        onSubmitExamAttempt={onSubmitExamAttempt}
      />
    </div>
  );
}
