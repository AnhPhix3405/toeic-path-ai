import { describe, it, expect, vi, beforeEach } from "vitest";
import { questionsService } from "./questions.service";
import apiClient from "./api-client";

vi.mock("./api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("questionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getQuestions calls GET /questions with query params", async () => {
    const mockData = {
      data: [{ id: "q-1", content: "Test question" }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData } as any);

    const result = await questionsService.getQuestions({
      search: "meeting",
      page: 1,
      limit: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith("/questions", {
      params: { search: "meeting", page: 1, limit: 20 },
    });
    expect(result).toEqual(mockData);
  });

  it("createQuestion calls POST /questions with body", async () => {
    const mockQuestion = { id: "q-1", content: "New Q", questionType: "single_choice" };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockQuestion } as any);

    const result = await questionsService.createQuestion({
      content: "New Q",
      questionType: "single_choice",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/questions", {
      content: "New Q",
      questionType: "single_choice",
    });
    expect(result).toEqual(mockQuestion);
  });

  it("updateClassification calls PUT /questions/:id/classification", async () => {
    const mockQuestion = { id: "q-1", difficulty: "medium" };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: mockQuestion } as any);

    const result = await questionsService.updateClassification("q-1", {
      partId: "part-5",
      topicIds: ["top-1"],
      skillIds: ["sk-1"],
      difficulty: "medium",
    });

    expect(apiClient.put).toHaveBeenCalledWith("/questions/q-1/classification", {
      partId: "part-5",
      topicIds: ["top-1"],
      skillIds: ["sk-1"],
      difficulty: "medium",
    });
    expect(result).toEqual(mockQuestion);
  });

  it("createCompositeQuestion orchestrates question, classification, options, and correct answer", async () => {
    const createdQ = { id: "q-new", content: "Full question" };
    const optA = { id: "opt-1", content: "A content", position: 1, isCorrect: false };
    const optB = { id: "opt-2", content: "B content", position: 2, isCorrect: true };

    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: createdQ } as any) // question
      .mockResolvedValueOnce({ data: optA } as any) // option 1
      .mockResolvedValueOnce({ data: optB } as any); // option 2

    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: "q-new" } } as any); // classification
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ...optB, isCorrect: true } } as any); // correct answer
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { ...createdQ, options: [optA, optB] } } as any); // final question fetch

    const result = await questionsService.createCompositeQuestion({
      content: "Full question",
      partId: "part-5",
      difficulty: "easy",
      topicIds: [],
      skillIds: [],
      options: [
        { content: "A content", isCorrect: false, position: 1 },
        { content: "B content", isCorrect: true, position: 2 },
      ],
    });

    expect(apiClient.post).toHaveBeenCalledWith("/questions", expect.objectContaining({ content: "Full question" }));
    expect(apiClient.put).toHaveBeenCalledWith("/questions/q-new/classification", expect.anything());
    expect(apiClient.post).toHaveBeenCalledWith("/questions/q-new/options", expect.anything());
    expect(apiClient.patch).toHaveBeenCalledWith("/questions/q-new/correct-answer", { optionId: "opt-2" });
    expect(result).toBeDefined();
  });
});
