"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { examAttemptsService } from "@/services/exam-attempts.service";
import {
  buildConditionalSavePayload,
  clampTimeSpentSeconds,
  extractApiErrorMeta,
} from "@/lib/validations/exam-attempt.schema";
import { useExamRoomStore } from "@/stores/exam-room.store";
import { ExamSyncStatus } from "@/types/exam-attempt";

export interface UseExamAutosaveParams {
  attemptId: string;
  activeQuestionId: string | null;
  isLocked: boolean;
  onRefreshOverview?: () => void;
}

const DEBOUNCE_MS = 400;
const MAX_BATCH_SIZE = 200;

function isRetryableSyncError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }
  const meta = extractApiErrorMeta(error);
  if (meta.isNetworkError) return true;
  if (meta.status === 429) return true;
  if (meta.status !== null && meta.status >= 500) return true;
  return false;
}

export function useExamAutosave({
  attemptId,
  activeQuestionId,
  isLocked,
  onRefreshOverview,
}: UseExamAutosaveParams) {
  const syncStatus = useExamRoomStore((s) => s.syncStatus);
  const pendingCount = useExamRoomStore((s) =>
    s.sessions[attemptId]?.pendingSyncQueue
      ? Object.keys(s.sessions[attemptId].pendingSyncQueue).length
      : 0
  );

  // PMR 025 #5: Zero re-render delta time tracking via refs + visibilitychange
  const questionEnteredAtRef = useRef<number>(0);
  const accumulatedHiddenSafeMsRef = useRef<number>(0);
  const prevQuestionIdRef = useRef<string | null>(activeQuestionId);
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const isFlushingRef = useRef(false);

  useEffect(() => {
    if (questionEnteredAtRef.current === 0) {
      questionEnteredAtRef.current = Date.now();
    }
  }, []);

  const captureCurrentQuestionDelta = useCallback((): number => {
    if (isLocked) return 0;
    const now = Date.now();
    const isHidden = typeof document !== "undefined" && document.hidden;
    const activeMs =
      isHidden || questionEnteredAtRef.current === 0
        ? 0
        : Math.max(0, now - questionEnteredAtRef.current);
    const totalSeconds = clampTimeSpentSeconds(
      (accumulatedHiddenSafeMsRef.current + activeMs) / 1000
    );
    accumulatedHiddenSafeMsRef.current = 0;
    questionEnteredAtRef.current = now;
    return totalSeconds;
  }, [isLocked]);

  // Pause timer when tab becomes hidden; resume when visible (PMR 025 #5)
  useEffect(() => {
    const handleVisibility = () => {
      if (isLocked) return;
      if (document.hidden) {
        accumulatedHiddenSafeMsRef.current += Math.max(
          0,
          Date.now() - questionEnteredAtRef.current
        );
      } else {
        questionEnteredAtRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [isLocked]);

  // Commit elapsed delta into store when switching active question (PMR 025 #5)
  useEffect(() => {
    const prevId = prevQuestionIdRef.current;
    if (prevId && prevId !== activeQuestionId && !isLocked) {
      const delta = captureCurrentQuestionDelta();
      if (delta > 0) {
        useExamRoomStore
          .getState()
          .addQuestionDeltaSeconds(attemptId, prevId, delta);
      }
    }
    prevQuestionIdRef.current = activeQuestionId;
    questionEnteredAtRef.current = Date.now();
    accumulatedHiddenSafeMsRef.current = 0;
  }, [attemptId, activeQuestionId, isLocked, captureCurrentQuestionDelta]);

  const clearAllDebounceTimers = useCallback(() => {
    for (const timer of debounceTimersRef.current.values()) {
      clearTimeout(timer);
    }
    debounceTimersRef.current.clear();
  }, []);

  const handleTerminalOrRetryableError = useCallback(
    (error: unknown, _questionIds: string[]) => {
      const store = useExamRoomStore.getState();
      const meta = extractApiErrorMeta(error);

      // PMR 025 #3: Terminal errors must NOT stay in pendingSyncQueue (anti-poison-pill)
      if (meta.errorCode === "ERR_ATTEMPT_EXPIRED") {
        clearAllDebounceTimers();
        store.clearPendingQueue(attemptId);
        store.lockExpired(attemptId);
        store.setSyncStatus("synced");
        toast.warning("Đã hết thời gian làm bài (bao gồm 30 giây ân hạn).");
        return;
      }

      if (
        meta.errorCode === "ERR_ATTEMPT_NOT_IN_PROGRESS" ||
        meta.status === 403
      ) {
        clearAllDebounceTimers();
        store.clearPendingQueue(attemptId);
        store.lockExpired(attemptId);
        store.setSyncStatus("error");
        toast.error(meta.message);
        return;
      }

      if (isRetryableSyncError(error)) {
        const isOffline =
          typeof navigator !== "undefined" && !navigator.onLine;
        store.setSyncStatus(isOffline ? "offline" : "error");
        return;
      }

      // Non-retryable 400 validation error
      store.setSyncStatus("error");
      toast.error(meta.message);
    },
    [attemptId, clearAllDebounceTimers]
  );

  const flushPendingBatch = useCallback(
    async (options?: { manual?: boolean; allowWhenLocked?: boolean }) => {
      const store = useExamRoomStore.getState();
      if (isFlushingRef.current) return;
      if (isLocked && !options?.allowWhenLocked) return;

      const allItems = store.getPendingBatchPayload(attemptId);
      if (allItems.length === 0) {
        if (options?.manual) {
          onRefreshOverview?.();
          toast.success("Tất cả đáp án đã được đồng bộ mới nhất.");
        }
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        store.setSyncStatus("offline");
        if (options?.manual) {
          toast.warning("Hiện đang ngoại tuyến. Đáp án sẽ tự đồng bộ khi có mạng.");
        }
        return;
      }

      isFlushingRef.current = true;
      store.setSyncStatus("syncing");

      try {
        for (let i = 0; i < allItems.length; i += MAX_BATCH_SIZE) {
          const chunk = allItems.slice(i, i + MAX_BATCH_SIZE);
          const res = await examAttemptsService.batchSaveAnswers(attemptId, {
            answers: chunk,
          });

          // Remove all processed questionIds (both synced and terminal failedItems per PMR 025 #3)
          const processedIds = chunk.map((item) => item.questionId);
          useExamRoomStore
            .getState()
            .markBatchSynced(attemptId, processedIds, res.serverTimeNow);

          if (res.failedCount > 0 && res.failedItems?.length > 0) {
            toast.warning(
              `Đã đồng bộ ${res.syncedCount} câu; có ${res.failedCount} câu không hợp lệ được bỏ qua.`
            );
          }
        }

        useExamRoomStore.getState().setSyncStatus("synced");
        if (options?.manual) {
          onRefreshOverview?.();
          toast.success("Đồng bộ đáp án lên máy chủ thành công!");
        }
      } catch (error) {
        handleTerminalOrRetryableError(
          error,
          allItems.map((i) => i.questionId)
        );
      } finally {
        isFlushingRef.current = false;
      }
    },
    [attemptId, isLocked, onRefreshOverview, handleTerminalOrRetryableError]
  );

  // PMR 025 #2: Write-through coalescing into pendingSyncQueue BEFORE 400ms debounce
  const scheduleSingleSave = useCallback(
    (questionId: string) => {
      const existingTimer = debounceTimersRef.current.get(questionId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        debounceTimersRef.current.delete(questionId);
        const store = useExamRoomStore.getState();
        const coalescedPayload = store.getPendingItemPayload(
          attemptId,
          questionId
        );
        if (!coalescedPayload) return;

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          store.setSyncStatus("offline");
          return;
        }

        store.setSyncStatus("syncing");
        try {
          const res = await examAttemptsService.saveAnswer(
            attemptId,
            coalescedPayload
          );
          useExamRoomStore
            .getState()
            .markBatchSynced(attemptId, [questionId], res.savedAt);
          const remaining = useExamRoomStore
            .getState()
            .getPendingCount(attemptId);
          useExamRoomStore
            .getState()
            .setSyncStatus(remaining === 0 ? "synced" : "syncing");
        } catch (error) {
          handleTerminalOrRetryableError(error, [questionId]);
        }
      }, DEBOUNCE_MS);

      debounceTimersRef.current.set(questionId, timer);
    },
    [attemptId, handleTerminalOrRetryableError]
  );

  const handleSelectOption = useCallback(
    (questionId: string, optionId: string) => {
      if (isLocked) return;
      const store = useExamRoomStore.getState();
      const liveDelta = captureCurrentQuestionDelta();
      store.selectOption(attemptId, questionId, optionId, liveDelta);
      const consumedDelta = store.consumeQuestionDeltaSeconds(
        attemptId,
        questionId
      );

      const payload = buildConditionalSavePayload({
        questionId,
        action: { type: "SELECT_OPTION", optionId },
        deltaTimeSpentSeconds: consumedDelta,
      });

      store.enqueueOfflineMutation(
        { ...payload, clientAnsweredAt: new Date().toISOString() },
        attemptId
      );
      scheduleSingleSave(questionId);
    },
    [attemptId, isLocked, captureCurrentQuestionDelta, scheduleSingleSave]
  );

  const handleClearOption = useCallback(
    (questionId: string) => {
      if (isLocked) return;
      const store = useExamRoomStore.getState();
      const liveDelta = captureCurrentQuestionDelta();
      store.selectOption(attemptId, questionId, null, liveDelta);
      const consumedDelta = store.consumeQuestionDeltaSeconds(
        attemptId,
        questionId
      );

      const payload = buildConditionalSavePayload({
        questionId,
        action: { type: "CLEAR_OPTION" },
        deltaTimeSpentSeconds: consumedDelta,
      });

      store.enqueueOfflineMutation(
        { ...payload, clientAnsweredAt: new Date().toISOString() },
        attemptId
      );
      scheduleSingleSave(questionId);
    },
    [attemptId, isLocked, captureCurrentQuestionDelta, scheduleSingleSave]
  );

  const handleToggleReview = useCallback(
    (questionId: string) => {
      if (isLocked) return;
      const store = useExamRoomStore.getState();
      const liveDelta = captureCurrentQuestionDelta();
      const nextReview = store.toggleReview(attemptId, questionId, liveDelta);
      const consumedDelta = store.consumeQuestionDeltaSeconds(
        attemptId,
        questionId
      );

      const payload = buildConditionalSavePayload({
        questionId,
        action: { type: "TOGGLE_REVIEW", isMarkedForReview: nextReview },
        deltaTimeSpentSeconds: consumedDelta,
      });

      store.enqueueOfflineMutation(
        { ...payload, clientAnsweredAt: new Date().toISOString() },
        attemptId
      );
      scheduleSingleSave(questionId);
    },
    [attemptId, isLocked, captureCurrentQuestionDelta, scheduleSingleSave]
  );

  // PMR 025 #2: Cancel debounce timers & immediately flush within 30s GRACE_PERIOD on expiry
  const flushOnExpire = useCallback(async () => {
    clearAllDebounceTimers();
    await flushPendingBatch({ allowWhenLocked: true });
  }, [clearAllDebounceTimers, flushPendingBatch]);

  // PMR 025 #1: Auto-flush any un-synced offline queue on mount & on window "online" event
  useEffect(() => {
    if (
      useExamRoomStore.getState().getPendingCount(attemptId) > 0 &&
      (typeof navigator === "undefined" || navigator.onLine)
    ) {
      void flushPendingBatch();
    }

    const handleOnline = () => {
      useExamRoomStore.getState().setSyncStatus("syncing");
      void flushPendingBatch();
    };
    const handleOffline = () => {
      useExamRoomStore.getState().setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [attemptId, flushPendingBatch]);

  // Warn before accidental tab closure if unsynced answers exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useExamRoomStore.getState().getPendingCount(attemptId) > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearAllDebounceTimers();
    };
  }, [attemptId, clearAllDebounceTimers]);

  return {
    handleSelectOption,
    handleClearOption,
    handleToggleReview,
    flushPendingBatch,
    flushOnExpire,
    syncStatus: syncStatus as ExamSyncStatus,
    pendingCount,
  };
}
