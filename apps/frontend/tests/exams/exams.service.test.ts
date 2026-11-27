import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "@/services/api-client";
import { examsService } from "@/services/exams.service";
import {
  examFormSchema,
  buildUpdateExamPayload,
  validateConfigureSectionsPayload,
  buildContiguousReorderPayload,
} from "@/lib/validations/exam.schema";

vi.mock("@/services/api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("examsService (15 endpoints contract #222) & Exam Validators (#1009)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls CRUD & Catalog endpoints (createExam, getManageExamDetail, updateExam, getManageExams, getPublicExams, getExamOverview, deleteExam)", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ id: "ex-1", version: 1 } as never);
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ id: "ex-1", version: 1, status: "draft" } as never)
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 } as never)
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 } as never)
      .mockResolvedValueOnce({ id: "ex-1", parts: [], remainingAttempts: 3 } as never);
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ id: "ex-1", version: 2 } as never);
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ success: true, message: "Deleted" } as never);

    await examsService.createExam({
      title: "ETS TOEIC 2026 Test 01",
      type: "full_test",
      durationMinutes: 120,
    });
    expect(apiClient.post).toHaveBeenCalledWith("/exams", {
      title: "ETS TOEIC 2026 Test 01",
      type: "full_test",
      durationMinutes: 120,
    });

    await examsService.getManageExamDetail("ex-1");
    expect(apiClient.get).toHaveBeenCalledWith("/exams/ex-1/manage");

    await examsService.updateExam("ex-1", {
      title: "ETS TOEIC 2026 Test 01 Updated",
      version: 1,
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/exams/ex-1", {
      title: "ETS TOEIC 2026 Test 01 Updated",
      version: 1,
    });

    await examsService.getManageExams({ page: 1, limit: 10, status: "draft" });
    expect(apiClient.get).toHaveBeenCalledWith("/exams/manage", {
      params: { page: 1, limit: 10, status: "draft" },
      paramsSerializer: { indexes: null },
    });

    await examsService.getPublicExams({ page: 1, limit: 10, type: "full_test" });
    expect(apiClient.get).toHaveBeenCalledWith("/exams", {
      params: { page: 1, limit: 10, type: "full_test" },
      paramsSerializer: { indexes: null },
    });

    await examsService.getExamOverview("ex-1");
    expect(apiClient.get).toHaveBeenCalledWith("/exams/ex-1/overview");

    await examsService.deleteExam("ex-1");
    expect(apiClient.delete).toHaveBeenCalledWith("/exams/ex-1");

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      stats: {
        publishedExamsCount: 4,
        publishedQuestionsCount: 200,
        completedAttemptsCount: 15,
        supportedToeicPartsCount: 7,
      },
      featuredExams: [],
    } as never);
    const summary = await examsService.getLandingSummary();
    expect(apiClient.get).toHaveBeenCalledWith("/exams/landing-summary");
    expect(summary.stats.supportedToeicPartsCount).toBe(7);
  });

  it("calls Structure Builder & Publishing endpoints with version (getExamStructure, configureSections, addQuestions, reorderQuestions, removeQuestion, autoGenerate, publish/unpublish/close/archive)", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      id: "ex-1",
      version: 1,
      sections: [],
      questions: [],
    } as never);
    vi.mocked(apiClient.post).mockResolvedValue({ id: "ex-1", version: 2 } as never);
    vi.mocked(apiClient.put).mockResolvedValue({ id: "ex-1", version: 3 } as never);
    vi.mocked(apiClient.delete).mockResolvedValue({ id: "ex-1", version: 4 } as never);

    await examsService.getExamStructure("ex-1");
    expect(apiClient.get).toHaveBeenCalledWith("/exams/ex-1/structure");

    await examsService.configureSections("ex-1", {
      version: 1,
      sections: [{ partNumber: 5, targetQuestionsCount: 30, targetDurationMinutes: 12 }],
    });
    expect(apiClient.post).toHaveBeenCalledWith("/exams/ex-1/sections", {
      version: 1,
      sections: [{ partNumber: 5, targetQuestionsCount: 30, targetDurationMinutes: 12 }],
    });

    await examsService.addQuestions("ex-1", {
      version: 2,
      sectionId: "sec-1",
      questionGroupIds: ["grp-1"],
    });
    expect(apiClient.post).toHaveBeenCalledWith("/exams/ex-1/questions", {
      version: 2,
      sectionId: "sec-1",
      questionGroupIds: ["grp-1"],
    });

    await examsService.reorderQuestions("ex-1", {
      version: 3,
      items: [{ questionId: "q-1", orderIndex: 1 }],
    });
    expect(apiClient.put).toHaveBeenCalledWith("/exams/ex-1/questions/reorder", {
      version: 3,
      items: [{ questionId: "q-1", orderIndex: 1 }],
    });

    await examsService.removeQuestion("ex-1", "q-1", 3);
    expect(apiClient.delete).toHaveBeenCalledWith("/exams/ex-1/questions/q-1", {
      params: { version: 3 },
    });

    await examsService.autoGenerate("ex-1", { version: 3 });
    expect(apiClient.post).toHaveBeenCalledWith("/exams/ex-1/auto-generate", {
      version: 3,
    });

    await examsService.publishExam("ex-1", { version: 4 });
    expect(apiClient.post).toHaveBeenCalledWith("/exams/ex-1/publish", { version: 4 });

    await examsService.unpublishExam("ex-1", { version: 5 });
    expect(apiClient.post).toHaveBeenCalledWith("/exams/ex-1/unpublish", { version: 5 });

    await examsService.closeExam("ex-1", { version: 5 });
    expect(apiClient.post).toHaveBeenCalledWith("/exams/ex-1/close", { version: 5 });

    await examsService.archiveExam("ex-1", { version: 6 });
    expect(apiClient.post).toHaveBeenCalledWith("/exams/ex-1/archive", { version: 6 });
  });

  it("Review Focus 1: strips locked technical fields when building UpdateExamDto for a closed exam", () => {
    const payload = buildUpdateExamPayload(
      { status: "closed", version: 3 },
      {
        title: "Updated Closed Exam Title",
        description: "Updated description",
        type: "full_test",
        durationMinutes: 120,
        maxAttempts: 3,
        passingScore: 650,
        allowPartPractice: true,
        isShuffledQuestions: true,
        isShuffledOptions: false,
        scoreConversionType: "DEFAULT_ETS",
        openAt: "",
        closeAt: "",
      }
    );

    expect(payload).toEqual({
      title: "Updated Closed Exam Title",
      description: "Updated description",
      version: 3,
    });
    expect(payload.durationMinutes).toBeUndefined();
    expect(payload.type).toBeUndefined();
  });

  it("validates examFormSchema constraints (title 5..255, duration 1..300, closeAt > openAt) (#1009)", () => {
    const shortTitle = examFormSchema.safeParse({
      title: "Abc",
      type: "full_test",
      durationMinutes: 120,
    });
    expect(shortTitle.success).toBe(false);

    const invalidDates = examFormSchema.safeParse({
      title: "Valid Exam Title",
      type: "full_test",
      durationMinutes: 120,
      openAt: "2026-12-10T10:00:00.000Z",
      closeAt: "2026-12-05T10:00:00.000Z",
    });
    expect(invalidDates.success).toBe(false);
  });

  it("Review Focus 3: validates placement_test 20..100 bounds and Listening+Reading requirement, and moves question groups contiguously on reorder", () => {
    const invalidPlacement = validateConfigureSectionsPayload("placement_test", [
      { partNumber: 5, targetQuestionsCount: 25 },
    ]);
    expect(invalidPlacement.isValid).toBe(false);
    expect(invalidPlacement.error).toContain("Listening (Part 1–4) và Reading (Part 5–7)");

    const tooFewPlacement = validateConfigureSectionsPayload("placement_test", [
      { partNumber: 1, targetQuestionsCount: 5 },
      { partNumber: 5, targetQuestionsCount: 10 },
    ]);
    expect(tooFewPlacement.isValid).toBe(false);
    expect(tooFewPlacement.error).toContain("từ 20 đến 100 câu");

    const validPlacement = validateConfigureSectionsPayload("placement_test", [
      { partNumber: 1, targetQuestionsCount: 10 },
      { partNumber: 5, targetQuestionsCount: 15 },
    ]);
    expect(validPlacement.isValid).toBe(true);

    // Group-safe contiguous reorder: moving group grp-1 up above q-single-1
    const reordered = buildContiguousReorderPayload(
      [
        {
          id: "eq-1",
          examId: "ex-1",
          examSectionId: "s-3",
          questionId: "q-single-1",
          orderIndex: 1,
          questionGroupId: null,
          groupOrder: null,
        },
        {
          id: "eq-2",
          examId: "ex-1",
          examSectionId: "s-3",
          questionId: "q-grp-1",
          orderIndex: 2,
          questionGroupId: "grp-1",
          groupOrder: 1,
        },
        {
          id: "eq-3",
          examId: "ex-1",
          examSectionId: "s-3",
          questionId: "q-grp-2",
          orderIndex: 3,
          questionGroupId: "grp-1",
          groupOrder: 2,
        },
      ],
      1,
      "up"
    );

    expect(reordered).toEqual([
      { questionId: "q-grp-1", orderIndex: 1 },
      { questionId: "q-grp-2", orderIndex: 2 },
      { questionId: "q-single-1", orderIndex: 3 },
    ]);
  });
});
