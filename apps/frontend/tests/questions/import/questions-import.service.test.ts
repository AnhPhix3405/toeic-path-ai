import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "@/services/api-client";
import { questionsImportService } from "@/services/questions-import.service";
import {
  validateImportFileStrict,
  validatePreviewRows,
  parseExcelFileForPreview,
} from "@/lib/validations/question-import.schema";

vi.mock("@/services/api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    raw: {
      get: vi.fn(),
      post: vi.fn(),
    },
  },
}));

describe("questionsImportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("downloadTemplate calls GET /questions/import/template with responseType blob", async () => {
    const mockBlob = new Blob(["excel-binary"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    vi.mocked(apiClient.raw.get).mockResolvedValueOnce({
      data: mockBlob,
      headers: {
        "content-disposition": 'attachment; filename="toeic_questions_template.xlsx"',
      },
    } as never);

    const res = await questionsImportService.downloadTemplate();
    expect(apiClient.raw.get).toHaveBeenCalledWith("/questions/import/template", {
      responseType: "blob",
    });
    expect(res.fileName).toBe("toeic_questions_template.xlsx");
    expect(res.blob).toBe(mockBlob);
  });

  it("importQuestions sends multipart/form-data to POST /questions/import with targetStatus query", async () => {
    const mockFile = new File(["dummy"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const mockSyncResponse = {
      jobId: "job-1",
      isAsync: false as const,
      status: "completed" as const,
      totalRows: 5,
      successCount: 5,
      errorCount: 0,
      createdGroupsCount: 1,
      errorDetails: null,
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockSyncResponse as never);

    const res = await questionsImportService.importQuestions(mockFile, "pending_review");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/questions/import",
      expect.any(FormData),
      expect.objectContaining({
        params: { targetStatus: "pending_review" },
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
    expect(res).toEqual(mockSyncResponse);
  });

  it("getImportJobs calls GET /questions/import/jobs with pagination and filter params", async () => {
    const mockJobs = {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockJobs as never);

    const res = await questionsImportService.getImportJobs({
      page: 1,
      limit: 10,
      status: "completed",
    });

    expect(apiClient.get).toHaveBeenCalledWith("/questions/import/jobs", {
      params: { page: 1, limit: 10, status: "completed" },
    });
    expect(res).toEqual(mockJobs);
  });

  it("getImportJobById calls GET /questions/import/jobs/:id", async () => {
    const mockDetail = {
      id: "job-123",
      fileName: "batch.xlsx",
      status: "processing",
      totalRows: 120,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockDetail as never);

    const res = await questionsImportService.getImportJobById("job-123");
    expect(apiClient.get).toHaveBeenCalledWith("/questions/import/jobs/job-123");
    expect(res.id).toBe("job-123");
  });

  it("submitForReview calls POST /questions/import/submit-for-review with questionIds", async () => {
    const mockReviewRes = {
      submittedCount: 3,
      submittedIds: ["q-1", "q-2", "q-3"],
      skipped: [],
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockReviewRes as never);

    const res = await questionsImportService.submitForReview({
      questionIds: ["q-1"],
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/questions/import/submit-for-review",
      { questionIds: ["q-1"] }
    );
    expect(res.submittedCount).toBe(3);
  });

  it("exportErrorLogCsv quotes and escapes commas and double quotes properly (PMR 004 #4)", () => {
    const csv = questionsImportService.exportErrorLogCsv("test.xlsx", [
      {
        row: 5,
        code: "INVALID_CORRECT_ANSWER",
        error: 'Đáp án đúng phải là "A", "B", "C" hoặc "D", không hợp lệ.',
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(
      '"5","INVALID_CORRECT_ANSWER","Đáp án đúng phải là ""A"", ""B"", ""C"" hoặc ""D"", không hợp lệ."'
    );
  });
});

describe("validateImportFileStrict (#1009)", () => {
  it("rejects missing file or 0-byte file", () => {
    expect(validateImportFileStrict(null).isValid).toBe(false);
    const emptyFile = new File([], "empty.xlsx");
    expect(validateImportFileStrict(emptyFile)).toEqual({
      isValid: false,
      error: "Tệp tải lên đang trống (0 bytes). Vui lòng chọn tệp hợp lệ.",
    });
  });

  it("rejects unsupported extension (.pdf)", () => {
    const pdfFile = new File(["data"], "document.pdf", { type: "application/pdf" });
    const res = validateImportFileStrict(pdfFile);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Chỉ chấp nhận tệp .xlsx, .xls hoặc .zip");
  });

  it("rejects Excel file larger than 10MB", () => {
    const bigExcel = new File(["a"], "large.xlsx");
    Object.defineProperty(bigExcel, "size", { value: 11 * 1024 * 1024 });
    const res = validateImportFileStrict(bigExcel);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Kích thước tệp Excel vượt quá giới hạn tối đa 10MB.");
  });

  it("rejects ZIP file larger than 50MB", () => {
    const bigZip = new File(["a"], "bundle.zip");
    Object.defineProperty(bigZip, "size", { value: 51 * 1024 * 1024 });
    const res = validateImportFileStrict(bigZip);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Kích thước gói ZIP vượt quá giới hạn tối đa 50MB.");
  });

  it("accepts valid .xlsx <= 10MB and .zip <= 50MB", () => {
    const validExcel = new File(["ok"], "questions.xlsx");
    const validZip = new File(["ok"], "package.zip");
    expect(validateImportFileStrict(validExcel).isValid).toBe(true);
    expect(validateImportFileStrict(validZip).isValid).toBe(true);
  });
});

describe("validatePreviewRows (UC14-A3 < 100 rows preview, PMR 004 #1 & #2)", () => {
  it("validates TOEIC row rules including Part 1..7, Correct_Answer A..D, Part 2 max 3 options, and Part 3-7 mandatory Option_D", () => {
    const result = validatePreviewRows([
      {
        Part: "5",
        Question_Text: "The meeting _____ postponed until Friday.",
        Option_A: "is",
        Option_B: "are",
        Option_C: "were",
        Option_D: "be",
        Correct_Answer: "A",
        Difficulty: "medium",
        Group_ID: "",
      },
      {
        Part: "2",
        Question_Text: "",
        Option_A: "",
        Option_B: "",
        Option_C: "",
        Option_D: "Extra invalid option for Part 2",
        Correct_Answer: "E",
        Difficulty: "easy",
        Group_ID: "",
      },
      {
        Part: "5",
        Question_Text: "Missing Option D in Part 5?",
        Option_A: "opt1",
        Option_B: "opt2",
        Option_C: "opt3",
        Option_D: "",
        Correct_Answer: "A",
        Difficulty: "hard",
        Group_ID: "GRP_1",
      },
    ]);

    expect(result.totalRows).toBe(3);
    expect(result.isUnderPreviewThreshold).toBe(true);
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(2);
    expect(result.groupedCount).toBe(1);
    expect(result.rows[1].isValid).toBe(false);
    expect(result.rows[1].errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Part 2 không được có phương án D"),
        expect.stringContaining("Đáp án đúng phải là A, B, C hoặc D"),
      ])
    );
    expect(result.rows[2].isValid).toBe(false);
    expect(result.rows[2].errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Phương án D là bắt buộc đối với Part 3, 4, 5, 6, 7"),
      ])
    );
  });

  it("returns headerError when totalRows is 0 or exceeds 1000 rows (PMR 004 #2)", () => {
    const emptyRes = validatePreviewRows([]);
    expect(emptyRes.totalRows).toBe(0);
    expect(emptyRes.headerError).toContain("Tệp không có dữ liệu câu hỏi nào để nhập");

    const overLimitRows = Array.from({ length: 1001 }, () => ({
      Part: "5",
      Question_Text: "Q",
      Option_A: "A",
      Option_B: "B",
      Option_C: "C",
      Option_D: "D",
      Correct_Answer: "A",
    }));
    const overRes = validatePreviewRows(overLimitRows);
    expect(overRes.totalRows).toBe(1001);
    expect(overRes.headerError).toContain("vượt quá giới hạn tối đa 1.000 dòng");
  });

  it("gracefully falls back for .xls and .zip files in parseExcelFileForPreview (PMR 004 #1)", async () => {
    const xlsFile = new File(["biff8"], "legacy.xls");
    const xlsRes = await parseExcelFileForPreview(xlsFile);
    expect(xlsRes.isUnderPreviewThreshold).toBe(false);
    expect(xlsRes.fileType).toBe("excel");

    const zipFile = new File(["zip"], "bundle.zip");
    const zipRes = await parseExcelFileForPreview(zipFile);
    expect(zipRes.isUnderPreviewThreshold).toBe(false);
    expect(zipRes.fileType).toBe("zip");
  });
});
