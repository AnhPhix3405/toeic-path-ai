import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clampTimeSpentSeconds } from "@/lib/validations/exam-attempt.schema";
import {
  BatchAnswerItemDto,
  ExamSyncStatus,
  QuestionDeliveryItem,
  ReadingFontScale,
  SaveAnswerDto,
} from "@/types/exam-attempt";

export interface LocalAnswerState {
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  unsyncedDeltaSeconds: number;
}

export interface PendingSyncItem {
  questionId: string;
  hasOptionChange: boolean;
  selectedOptionId?: string | null;
  hasReviewChange: boolean;
  isMarkedForReview?: boolean;
  timeSpentSeconds: number;
  clientAnsweredAt: string;
}

export interface AttemptRoomSession {
  attemptId: string;
  expiresAt: string;
  serverTimeOffsetMs: number;
  answers: Record<string, LocalAnswerState>;
  pendingSyncQueue: Record<string, PendingSyncItem>;
  activePart: number | null;
  activeOrderIndex: number;
  isLockedExpired: boolean;
}

interface ExamRoomStoreState {
  currentAttemptId: string | null;
  sessions: Record<string, AttemptRoomSession>;
  readingFontScale: ReadingFontScale;
  syncStatus: ExamSyncStatus;

  hydrateAttempt: (params: {
    attemptId: string;
    expiresAt: string;
    serverTimeNow: string;
    questions: QuestionDeliveryItem[];
    isExpired?: boolean;
  }) => void;
  updateServerClock: (attemptId: string, serverTimeNow: string) => void;
  selectOption: (
    attemptId: string,
    questionId: string,
    optionId: string | null,
    deltaSeconds?: number
  ) => void;
  toggleReview: (
    attemptId: string,
    questionId: string,
    deltaSeconds?: number
  ) => boolean;
  addQuestionDeltaSeconds: (
    attemptId: string,
    questionId: string,
    deltaSeconds: number
  ) => void;
  consumeQuestionDeltaSeconds: (
    attemptId: string,
    questionId: string
  ) => number;
  enqueueOfflineMutation: (
    item: SaveAnswerDto & { clientAnsweredAt?: string },
    attemptIdOverride?: string
  ) => void;
  getPendingItemPayload: (
    attemptId: string,
    questionId: string
  ) => SaveAnswerDto | null;
  getPendingBatchPayload: (attemptId: string) => BatchAnswerItemDto[];
  getPendingCount: (attemptId: string) => number;
  markBatchSynced: (
    attemptId: string,
    questionIds: string[],
    syncedServerTimeNow?: string
  ) => void;
  clearPendingQueue: (attemptId: string) => void;
  setActivePart: (attemptId: string, partNumber: number) => void;
  setActiveOrderIndex: (attemptId: string, orderIndex: number) => void;
  setReadingFontScale: (scale: ReadingFontScale) => void;
  setSyncStatus: (status: ExamSyncStatus) => void;
  lockExpired: (attemptId?: string) => void;
  clearAttemptSession: (attemptId: string) => void;
  resetAll: () => void;
}

function createEmptySession(
  attemptId: string,
  expiresAt = "",
  serverTimeOffsetMs = 0
): AttemptRoomSession {
  return {
    attemptId,
    expiresAt,
    serverTimeOffsetMs,
    answers: {},
    pendingSyncQueue: {},
    activePart: null,
    activeOrderIndex: 1,
    isLockedExpired: false,
  };
}

function toSavePayload(item: PendingSyncItem): SaveAnswerDto {
  const payload: SaveAnswerDto = {
    questionId: item.questionId,
    timeSpentSeconds: clampTimeSpentSeconds(item.timeSpentSeconds),
  };
  if (item.hasOptionChange) {
    payload.selectedOptionId = item.selectedOptionId ?? null;
  }
  if (item.hasReviewChange) {
    payload.isMarkedForReview = Boolean(item.isMarkedForReview);
  }
  return payload;
}

function toBatchItemPayload(item: PendingSyncItem): BatchAnswerItemDto {
  const base = toSavePayload(item);
  return {
    ...base,
    clientAnsweredAt: item.clientAnsweredAt,
  };
}

export const useExamRoomStore = create<ExamRoomStoreState>()(
  persist(
    (set, get) => ({
      currentAttemptId: null,
      sessions: {},
      readingFontScale: "base",
      syncStatus: "synced",

      hydrateAttempt: ({
        attemptId,
        expiresAt,
        serverTimeNow,
        questions,
        isExpired = false,
      }) => {
        const serverMs = new Date(serverTimeNow).getTime();
        const serverTimeOffsetMs = Number.isFinite(serverMs)
          ? serverMs - Date.now()
          : 0;

        set((state) => {
          const existing =
            state.sessions[attemptId] ??
            createEmptySession(attemptId, expiresAt, serverTimeOffsetMs);

          const mergedAnswers: Record<string, LocalAnswerState> = {};

          // 1. Server baseline from GET /questions
          for (const q of questions) {
            mergedAnswers[q.id] = {
              selectedOptionId: q.selectedOptionId ?? null,
              isMarkedForReview: Boolean(q.isMarkedForReview),
              unsyncedDeltaSeconds:
                existing.answers[q.id]?.unsyncedDeltaSeconds ?? 0,
            };
          }

          // 2. PMR 025 #1: Overlay un-synced local pendingSyncQueue so F5 never wipes offline answers
          for (const pending of Object.values(existing.pendingSyncQueue)) {
            const base = mergedAnswers[pending.questionId] ?? {
              selectedOptionId: null,
              isMarkedForReview: false,
              unsyncedDeltaSeconds: 0,
            };
            mergedAnswers[pending.questionId] = {
              selectedOptionId: pending.hasOptionChange
                ? pending.selectedOptionId ?? null
                : base.selectedOptionId,
              isMarkedForReview: pending.hasReviewChange
                ? Boolean(pending.isMarkedForReview)
                : base.isMarkedForReview,
              unsyncedDeltaSeconds: base.unsyncedDeltaSeconds,
            };
          }

          const firstQuestion = questions[0];
          const validOrder =
            existing.activeOrderIndex >= 1 &&
            existing.activeOrderIndex <= Math.max(1, questions.length)
              ? existing.activeOrderIndex
              : firstQuestion?.orderIndex ?? 1;
          const activeQuestion =
            questions.find((q) => q.orderIndex === validOrder) ?? firstQuestion;

          return {
            currentAttemptId: attemptId,
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...existing,
                attemptId,
                expiresAt,
                serverTimeOffsetMs,
                answers: mergedAnswers,
                activeOrderIndex: validOrder,
                activePart: activeQuestion?.partNumber ?? existing.activePart,
                isLockedExpired: existing.isLockedExpired || isExpired,
              },
            },
          };
        });
      },

      updateServerClock: (attemptId, serverTimeNow) => {
        const serverMs = new Date(serverTimeNow).getTime();
        if (!Number.isFinite(serverMs)) return;
        const offset = serverMs - Date.now();
        set((state) => {
          const session = state.sessions[attemptId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...session,
                serverTimeOffsetMs: offset,
              },
            },
          };
        });
      },

      selectOption: (attemptId, questionId, optionId, deltaSeconds = 0) => {
        set((state) => {
          const session =
            state.sessions[attemptId] ?? createEmptySession(attemptId);
          if (session.isLockedExpired) return state;

          const prev = session.answers[questionId] ?? {
            selectedOptionId: null,
            isMarkedForReview: false,
            unsyncedDeltaSeconds: 0,
          };

          const addedDelta = clampTimeSpentSeconds(deltaSeconds);

          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...session,
                answers: {
                  ...session.answers,
                  [questionId]: {
                    ...prev,
                    selectedOptionId: optionId,
                    unsyncedDeltaSeconds: clampTimeSpentSeconds(
                      prev.unsyncedDeltaSeconds + addedDelta
                    ),
                  },
                },
              },
            },
          };
        });
      },

      toggleReview: (attemptId, questionId, deltaSeconds = 0) => {
        const currentSession = get().sessions[attemptId];
        if (currentSession?.isLockedExpired) {
          return Boolean(
            currentSession.answers[questionId]?.isMarkedForReview
          );
        }
        const nextReview = !Boolean(
          currentSession?.answers[questionId]?.isMarkedForReview
        );

        set((state) => {
          const session =
            state.sessions[attemptId] ?? createEmptySession(attemptId);
          if (session.isLockedExpired) return state;

          const prev = session.answers[questionId] ?? {
            selectedOptionId: null,
            isMarkedForReview: false,
            unsyncedDeltaSeconds: 0,
          };

          const addedDelta = clampTimeSpentSeconds(deltaSeconds);

          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...session,
                answers: {
                  ...session.answers,
                  [questionId]: {
                    ...prev,
                    isMarkedForReview: nextReview,
                    unsyncedDeltaSeconds: clampTimeSpentSeconds(
                      prev.unsyncedDeltaSeconds + addedDelta
                    ),
                  },
                },
              },
            },
          };
        });

        return nextReview;
      },

      addQuestionDeltaSeconds: (attemptId, questionId, deltaSeconds) => {
        const added = clampTimeSpentSeconds(deltaSeconds);
        if (added <= 0) return;

        set((state) => {
          const session = state.sessions[attemptId];
          if (!session || session.isLockedExpired) return state;

          const prev = session.answers[questionId] ?? {
            selectedOptionId: null,
            isMarkedForReview: false,
            unsyncedDeltaSeconds: 0,
          };

          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...session,
                answers: {
                  ...session.answers,
                  [questionId]: {
                    ...prev,
                    unsyncedDeltaSeconds: clampTimeSpentSeconds(
                      prev.unsyncedDeltaSeconds + added
                    ),
                  },
                },
              },
            },
          };
        });
      },

      consumeQuestionDeltaSeconds: (attemptId, questionId) => {
        const session = get().sessions[attemptId];
        const current = session?.answers[questionId]?.unsyncedDeltaSeconds ?? 0;
        if (current <= 0) return 0;

        set((state) => {
          const s = state.sessions[attemptId];
          if (!s || !s.answers[questionId]) return state;
          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...s,
                answers: {
                  ...s.answers,
                  [questionId]: {
                    ...s.answers[questionId],
                    unsyncedDeltaSeconds: 0,
                  },
                },
              },
            },
          };
        });

        return clampTimeSpentSeconds(current);
      },

      enqueueOfflineMutation: (item, attemptIdOverride) => {
        const targetAttemptId = attemptIdOverride ?? get().currentAttemptId;
        if (!targetAttemptId) return;

        set((state) => {
          const session =
            state.sessions[targetAttemptId] ??
            createEmptySession(targetAttemptId);
          const existing = session.pendingSyncQueue[item.questionId];

          const hasOptionChange =
            "selectedOptionId" in item && item.selectedOptionId !== undefined;
          const hasReviewChange =
            "isMarkedForReview" in item && item.isMarkedForReview !== undefined;

          const coalesced: PendingSyncItem = {
            questionId: item.questionId,
            hasOptionChange:
              Boolean(existing?.hasOptionChange) || hasOptionChange,
            selectedOptionId: hasOptionChange
              ? item.selectedOptionId
              : existing?.selectedOptionId,
            hasReviewChange:
              Boolean(existing?.hasReviewChange) || hasReviewChange,
            isMarkedForReview: hasReviewChange
              ? item.isMarkedForReview
              : existing?.isMarkedForReview,
            timeSpentSeconds: clampTimeSpentSeconds(
              (existing?.timeSpentSeconds ?? 0) + (item.timeSpentSeconds ?? 0)
            ),
            clientAnsweredAt:
              item.clientAnsweredAt ?? new Date().toISOString(),
          };

          return {
            sessions: {
              ...state.sessions,
              [targetAttemptId]: {
                ...session,
                pendingSyncQueue: {
                  ...session.pendingSyncQueue,
                  [item.questionId]: coalesced,
                },
              },
            },
          };
        });
      },

      getPendingItemPayload: (attemptId, questionId) => {
        const pending =
          get().sessions[attemptId]?.pendingSyncQueue[questionId];
        if (!pending) return null;
        return toSavePayload(pending);
      },

      getPendingBatchPayload: (attemptId) => {
        const queue = get().sessions[attemptId]?.pendingSyncQueue;
        if (!queue) return [];
        return Object.values(queue).map(toBatchItemPayload);
      },

      getPendingCount: (attemptId) => {
        const queue = get().sessions[attemptId]?.pendingSyncQueue;
        return queue ? Object.keys(queue).length : 0;
      },

      markBatchSynced: (attemptId, questionIds, syncedServerTimeNow) => {
        set((state) => {
          const session = state.sessions[attemptId];
          if (!session) return state;

          const nextQueue = { ...session.pendingSyncQueue };
          for (const qId of questionIds) {
            delete nextQueue[qId];
          }

          let nextOffset = session.serverTimeOffsetMs;
          if (syncedServerTimeNow) {
            const parsed = new Date(syncedServerTimeNow).getTime();
            if (Number.isFinite(parsed)) {
              nextOffset = parsed - Date.now();
            }
          }

          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...session,
                serverTimeOffsetMs: nextOffset,
                pendingSyncQueue: nextQueue,
              },
            },
          };
        });
      },

      clearPendingQueue: (attemptId) => {
        set((state) => {
          const session = state.sessions[attemptId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...session,
                pendingSyncQueue: {},
              },
            },
          };
        });
      },

      setActivePart: (attemptId, partNumber) => {
        set((state) => {
          const session = state.sessions[attemptId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...session,
                activePart: partNumber,
              },
            },
          };
        });
      },

      setActiveOrderIndex: (attemptId, orderIndex) => {
        set((state) => {
          const session = state.sessions[attemptId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [attemptId]: {
                ...session,
                activeOrderIndex: orderIndex,
              },
            },
          };
        });
      },

      setReadingFontScale: (scale) => set({ readingFontScale: scale }),

      setSyncStatus: (status) => set({ syncStatus: status }),

      lockExpired: (attemptId) => {
        const targetId = attemptId ?? get().currentAttemptId;
        if (!targetId) return;
        set((state) => {
          const session = state.sessions[targetId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [targetId]: {
                ...session,
                isLockedExpired: true,
              },
            },
          };
        });
      },

      clearAttemptSession: (attemptId) => {
        set((state) => {
          const nextSessions = { ...state.sessions };
          delete nextSessions[attemptId];
          return {
            currentAttemptId:
              state.currentAttemptId === attemptId
                ? null
                : state.currentAttemptId,
            sessions: nextSessions,
          };
        });
      },

      resetAll: () =>
        set({
          currentAttemptId: null,
          sessions: {},
          readingFontScale: "base",
          syncStatus: "synced",
        }),
    }),
    {
      name: "toeic-exam-room-v1",
      partialize: (state) => ({
        sessions: state.sessions,
        readingFontScale: state.readingFontScale,
      }),
    }
  )
);
