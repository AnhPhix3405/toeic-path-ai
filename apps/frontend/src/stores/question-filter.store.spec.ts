import { describe, it, expect, beforeEach } from "vitest";
import { useQuestionFilterStore } from "./question-filter.store";

describe("useQuestionFilterStore", () => {
  beforeEach(() => {
    useQuestionFilterStore.getState().resetFilters();
  });

  it("initializes with default values", () => {
    const state = useQuestionFilterStore.getState();
    expect(state.search).toBe("");
    expect(state.partId).toBeNull();
    expect(state.difficulty).toBeNull();
    expect(state.status).toBeNull();
    expect(state.page).toBe(1);
    expect(state.limit).toBe(20);
  });

  it("updates search query and resets page to 1", () => {
    useQuestionFilterStore.getState().setPage(3);
    useQuestionFilterStore.getState().setSearch("meeting");

    const state = useQuestionFilterStore.getState();
    expect(state.search).toBe("meeting");
    expect(state.page).toBe(1);
  });

  it("updates difficulty and part filters", () => {
    useQuestionFilterStore.getState().setPartId("part-5-id");
    useQuestionFilterStore.getState().setDifficulty("medium");

    const state = useQuestionFilterStore.getState();
    expect(state.partId).toBe("part-5-id");
    expect(state.difficulty).toBe("medium");
  });

  it("resets all filters back to defaults", () => {
    useQuestionFilterStore.getState().setSearch("keyword");
    useQuestionFilterStore.getState().setDifficulty("hard");
    useQuestionFilterStore.getState().setPage(5);

    useQuestionFilterStore.getState().resetFilters();

    const state = useQuestionFilterStore.getState();
    expect(state.search).toBe("");
    expect(state.difficulty).toBeNull();
    expect(state.page).toBe(1);
  });

  it("syncs state from URLSearchParams", () => {
    const params = new URLSearchParams(
      "search=grammar&partId=p-1&difficulty=easy&status=published&page=2&limit=50"
    );
    useQuestionFilterStore.getState().syncWithUrlParams(params);

    const state = useQuestionFilterStore.getState();
    expect(state.search).toBe("grammar");
    expect(state.partId).toBe("p-1");
    expect(state.difficulty).toBe("easy");
    expect(state.status).toBe("published");
    expect(state.page).toBe(2);
    expect(state.limit).toBe(50);
  });
});
