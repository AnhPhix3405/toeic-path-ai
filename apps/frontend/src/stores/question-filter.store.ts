import { create } from "zustand";
import {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from "@/types/question";

export interface QuestionFilterState {
  search: string;
  partId: string | null;
  difficulty: QuestionDifficulty | null;
  status: QuestionStatus | null;
  questionType: QuestionType | null;
  topicIds: string[];
  skillIds: string[];
  page: number;
  limit: number;

  // Actions
  setSearch: (search: string) => void;
  setPartId: (partId: string | null) => void;
  setDifficulty: (difficulty: QuestionDifficulty | null) => void;
  setStatus: (status: QuestionStatus | null) => void;
  setQuestionType: (questionType: QuestionType | null) => void;
  setTopicIds: (topicIds: string[]) => void;
  setSkillIds: (skillIds: string[]) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  resetFilters: () => void;
  syncWithUrlParams: (params: URLSearchParams) => void;
}

const initialState = {
  search: "",
  partId: null,
  difficulty: null,
  status: null,
  questionType: null,
  topicIds: [],
  skillIds: [],
  page: 1,
  limit: 20,
};

export const useQuestionFilterStore = create<QuestionFilterState>((set) => ({
  ...initialState,

  setSearch: (search) => set({ search, page: 1 }),
  setPartId: (partId) => set({ partId, page: 1 }),
  setDifficulty: (difficulty) => set({ difficulty, page: 1 }),
  setStatus: (status) => set({ status, page: 1 }),
  setQuestionType: (questionType) => set({ questionType, page: 1 }),
  setTopicIds: (topicIds) => set({ topicIds, page: 1 }),
  setSkillIds: (skillIds) => set({ skillIds, page: 1 }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),

  resetFilters: () => set({ ...initialState }),

  syncWithUrlParams: (params: URLSearchParams) => {
    const search = params.get("search") || "";
    const partId = params.get("partId") || null;
    const difficulty = (params.get("difficulty") as QuestionDifficulty) || null;
    const status = (params.get("status") as QuestionStatus) || null;
    const pageStr = params.get("page");
    const page = pageStr && !isNaN(Number(pageStr)) ? Number(pageStr) : 1;
    const limitStr = params.get("limit");
    const limit = limitStr && !isNaN(Number(limitStr)) ? Number(limitStr) : 20;

    const topicIds = params.get("topicIds") ? params.get("topicIds")!.split(",") : [];
    const skillIds = params.get("skillIds") ? params.get("skillIds")!.split(",") : [];

    set({
      search,
      partId,
      difficulty,
      status,
      page,
      limit,
      topicIds,
      skillIds,
    });
  },
}));
