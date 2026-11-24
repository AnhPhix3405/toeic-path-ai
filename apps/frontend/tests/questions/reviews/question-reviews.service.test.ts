import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "@/services/api-client";
import { questionReviewsService } from "@/services/question-reviews.service";
import { questionsService } from "@/services/questions.service";
import {
  IGNORED_DIFF_KEYS,
  reviewFeedbackSchema,
  validateQuickFixPayload,
  computeQuestionSnapshotDiff,
} from "@/lib/validations/question-review.schema";

vi.mock("@/services/api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("questionReviewsService (8 endpoints contract #222)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getReviewQueue calls GET /questions/reviews/queue with query params", async () => {
    const mockRes = { items: [], total: 0, page: 1, limit: 10 };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockRes as never);

    const res = await questionReviewsService.getReviewQueue({
      page: 1,
      limit: 10,
      partId: "part-5",
      topicIds: ["topic-1"],
      search: "grammar",
    });

    expect(apiClient.get).toHaveBeenCalledWith("/questions/reviews/queue", {
      params: {
        page: 1,
        limit: 10,
        partId: "part-5",
        topicIds: ["topic-1", "topic-1"],
        search: "grammar",
      },
      paramsSerializer: {
        indexes: null,
      },
    });
    expect(res).toEqual(mockRes);
  });

  it("approveQuestion calls POST /questions/reviews/:id/approve", async () => {
    const mockRes = {
      id: "q-1",
      status: "published",
      version: 2,
      feedback: "Good",
      updatedAt: "2026-11-23T10:00:00.000Z",
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockRes as never);

    const res = await questionReviewsService.approveQuestion("q-1", {
      version: 1,
      emergencyBypass: true,
      feedback: "Good",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/questions/reviews/q-1/approve",
      { version: 1, emergencyBypass: true, feedback: "Good" }
    );
    expect(res.version).toBe(2);
  });

  it("requestRevision calls POST /questions/reviews/:id/request-revision", async () => {
    const mockRes = {
      id: "q-1",
      status: "revision_requested",
      version: 2,
      feedback: "Fix option B",
      updatedAt: "2026-11-23T10:00:00.000Z",
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockRes as never);

    const res = await questionReviewsService.requestRevision("q-1", {
      version: 1,
      feedback: "Fix option B",
      applyToWholeGroup: true,
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/questions/reviews/q-1/request-revision",
      { version: 1, feedback: "Fix option B", applyToWholeGroup: true }
    );
    expect(res.status).toBe("revision_requested");
  });

  it("rejectQuestion calls POST /questions/reviews/:id/reject", async () => {
    const mockRes = {
      id: "q-1",
      status: "rejected",
      version: 2,
      feedback: "Duplicate question",
      updatedAt: "2026-11-23T10:00:00.000Z",
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockRes as never);

    const res = await questionReviewsService.rejectQuestion("q-1", {
      version: 1,
      feedback: "Duplicate question",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/questions/reviews/q-1/reject",
      { version: 1, feedback: "Duplicate question" }
    );
    expect(res.status).toBe("rejected");
  });

  it("quickFixApprove calls PUT /questions/reviews/:id/quick-fix", async () => {
    const mockRes = {
      id: "q-1",
      status: "published",
      version: 2,
      feedback: "Fixed typo",
      updatedAt: "2026-11-23T10:00:00.000Z",
    };
    vi.mocked(apiClient.put).mockResolvedValueOnce(mockRes as never);

    const res = await questionReviewsService.quickFixApprove("q-1", {
      version: 1,
      content: "Updated content",
      options: [{ id: "opt-1", content: "A", isCorrect: true }],
      feedback: "Fixed typo",
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      "/questions/reviews/q-1/quick-fix",
      {
        version: 1,
        content: "Updated content",
        options: [{ id: "opt-1", content: "A", isCorrect: true }],
        feedback: "Fixed typo",
      }
    );
    expect(res.status).toBe("published");
  });

  it("batchApprove calls POST /questions/reviews/batch-approve", async () => {
    const mockRes = {
      approvedCount: 2,
      skipped: [{ questionId: "q-3", reason: "Maker-Checker violation" }],
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockRes as never);

    const res = await questionReviewsService.batchApprove({
      items: [
        { questionId: "q-1", version: 1 },
        { questionId: "q-2", version: 1 },
        { questionId: "q-3", version: 1 },
      ],
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/questions/reviews/batch-approve",
      {
        items: [
          { questionId: "q-1", version: 1 },
          { questionId: "q-2", version: 1 },
          { questionId: "q-3", version: 1 },
        ],
      }
    );
    expect(res.approvedCount).toBe(2);
    expect(res.skipped).toHaveLength(1);
  });

  it("getQuestionHistories and getQuestionReviewLogs call GET /:id/histories and GET /:id/logs", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce([{ id: "h-1", changeType: "quick_fixed" }] as never)
      .mockResolvedValueOnce([{ id: "l-1", action: "approved" }] as never);

    const histories = await questionReviewsService.getQuestionHistories("q-1");
    const logs = await questionReviewsService.getQuestionReviewLogs("q-1");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/questions/reviews/q-1/histories"
    );
    expect(apiClient.get).toHaveBeenCalledWith("/questions/reviews/q-1/logs");
    expect(histories).toHaveLength(1);
    expect(logs).toHaveLength(1);
  });
});

describe("validateQuickFixPayload & reviewFeedbackSchema (#1002, #1009, PMR 005 #4 & #5)", () => {
  it("rejects empty feedback when requesting revision or rejecting (#1009)", () => {
    const res = reviewFeedbackSchema.safeParse({ feedback: "   " });
    expect(res.success).toBe(false);
  });

  it("allows empty question content and option content for Part 1 (4 options) and Part 2 (3 options) (#1002 & PMR 005 #4)", () => {
    const part1Res = validateQuickFixPayload({
      partNumber: 1,
      content: null,
      options: [
        { id: "o1", content: null, isCorrect: true },
        { id: "o2", content: "", isCorrect: false },
        { id: "o3", content: null, isCorrect: false },
        { id: "o4", content: null, isCorrect: false },
      ],
    });
    expect(part1Res.isValid).toBe(true);

    const part2Res = validateQuickFixPayload({
      partNumber: 2,
      content: null,
      options: [
        { id: "o1", content: null, isCorrect: true },
        { id: "o2", content: null, isCorrect: false },
        { id: "o3", content: null, isCorrect: false },
      ],
    });
    expect(part2Res.isValid).toBe(true);
  });

  it("rejects Part 2 when it does not have exactly 3 options or optional feedback > 2000 chars (PMR 005 #4)", () => {
    const badPart2 = validateQuickFixPayload({
      partNumber: 2,
      content: null,
      options: [
        { id: "o1", content: null, isCorrect: true },
        { id: "o2", content: null, isCorrect: false },
        { id: "o3", content: null, isCorrect: false },
        { id: "o4", content: null, isCorrect: false },
      ],
      feedback: "x".repeat(2001),
    });
    expect(badPart2.isValid).toBe(false);
    expect(badPart2.optionsError).toContain("Part 2 bắt buộc phải có đúng 3 lựa chọn");
    expect(badPart2.feedbackError).toContain("2.000 ký tự");
  });

  it("allows empty question content for Part 6 but requires option content (#1002)", () => {
    const invalidPart6 = validateQuickFixPayload({
      partNumber: 6,
      content: "",
      options: [
        { id: "o1", content: "Valid A", isCorrect: true },
        { id: "o2", content: "   ", isCorrect: false },
      ],
    });
    expect(invalidPart6.isValid).toBe(false);
    expect(invalidPart6.contentError).toBeUndefined();
    expect(invalidPart6.optionItemErrors["o2"]).toContain("Part 6 không được để trống");
  });

  it("requires both question content and option content for Part 5 and enforces single choice invariant", () => {
    const invalidPart5 = validateQuickFixPayload({
      partNumber: 5,
      content: "   ",
      options: [
        { id: "o1", content: "A", isCorrect: true },
        { id: "o2", content: "B", isCorrect: true },
      ],
    });
    expect(invalidPart5.isValid).toBe(false);
    expect(invalidPart5.contentError).toContain("Part 5 bắt buộc phải có văn bản");
    expect(invalidPart5.optionsError).toContain("duy nhất 1 đáp án đúng");
  });

  it("computes accurate diff between snapshotBefore and snapshotAfter with fallback matching by id -> label -> position (PMR 005 #5)", () => {
    const diff = computeQuestionSnapshotDiff(
      {
        content: "Old text",
        explanation: "Old exp",
        status: "pending_review",
        options: [
          { label: "B", content: "opt B old", isCorrect: false, position: 2 },
          { label: "A", content: "opt A", isCorrect: true, position: 1 },
        ],
      },
      {
        content: "New text",
        explanation: "Old exp",
        status: "published",
        options: [
          { id: "o1", label: "A", content: "opt A", isCorrect: false, position: 1 },
          { id: "o2", label: "B", content: "opt B new", isCorrect: true, position: 2 },
        ],
      }
    );

    expect(diff.isInitialCreation).toBe(false);
    expect(diff.contentChanged).toBe(true);
    expect(diff.explanationChanged).toBe(false);
    expect(diff.statusChanged).toBe(true);
    expect(diff.optionDiffs[0].label).toBe("A");
    expect(diff.optionDiffs[0].contentChanged).toBe(false);
    expect(diff.optionDiffs[0].correctChanged).toBe(true);
    expect(diff.optionDiffs[1].label).toBe("B");
    expect(diff.optionDiffs[1].contentChanged).toBe(true);
    expect(diff.optionDiffs[1].correctChanged).toBe(true);
  });

  it("BUG-S4-UI-002 & BUG-S4-UI-003: verifies Express 5 paramsSerializer on questionsService and IGNORED_DIFF_KEYS metadata guard", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as never);

    await questionsService.getQuestions({
      topicIds: ["t-1"],
      skillIds: ["s-1"],
    });

    expect(apiClient.get).toHaveBeenCalledWith("/questions", {
      params: { topicIds: ["t-1"], skillIds: ["s-1"] },
    });

    expect(IGNORED_DIFF_KEYS.has("id")).toBe(true);
    expect(IGNORED_DIFF_KEYS.has("updatedAt")).toBe(true);
    expect(IGNORED_DIFF_KEYS.has("version")).toBe(true);
  });
});
