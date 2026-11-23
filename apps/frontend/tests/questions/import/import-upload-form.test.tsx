import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ImportUploadForm } from "@/features/questions/components/import/import-upload-form";
import { ImportPreviewModal } from "@/features/questions/components/import/import-preview-modal";

describe("ImportUploadForm & ImportPreviewModal (UC14, #1009)", () => {
  it("renders template download button, targetStatus options, and 15-column guide", () => {
    const onDownloadTemplate = vi.fn();
    render(
      <ImportUploadForm
        onDownloadTemplate={onDownloadTemplate}
        onSubmitImport={vi.fn()}
      />
    );

    expect(screen.getByText(/Tải Template Excel chuẩn/i)).toBeInTheDocument();
    expect(screen.getByText(/Lưu bản nháp/i)).toBeInTheDocument();
    expect(screen.getByText(/Gửi duyệt ngay/i)).toBeInTheDocument();
    expect(screen.getByText(/Group_ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Media_Ref/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tải Template Excel chuẩn/i }));
    expect(onDownloadTemplate).toHaveBeenCalledTimes(1);
  });

  it("displays strict validation error message below file field when invalid file is selected (#1009)", async () => {
    const onSubmitImport = vi.fn();
    render(
      <ImportUploadForm
        onDownloadTemplate={vi.fn()}
        onSubmitImport={onSubmitImport}
      />
    );

    const fileInput = screen.getByTestId("import-file-input");
    const invalidFile = new File(["bad"], "wrong.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(
          /Định dạng tệp không được hỗ trợ\. Chỉ chấp nhận tệp \.xlsx, \.xls hoặc \.zip/i
        )
      ).toBeInTheDocument();
    });
    expect(onSubmitImport).not.toHaveBeenCalled();
  });

  it("displays strict validation error when Excel file exceeds 10MB (#1009)", async () => {
    render(
      <ImportUploadForm
        onDownloadTemplate={vi.fn()}
        onSubmitImport={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId("import-file-input");
    const oversizedFile = new File(["a"], "oversized.xlsx");
    Object.defineProperty(oversizedFile, "size", { value: 12 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Kích thước tệp Excel vượt quá giới hạn tối đa 10MB/i)
      ).toBeInTheDocument();
    });
  });

  it("renders ImportPreviewModal with valid/invalid row counts and triggers onConfirmImport", () => {
    const onConfirmImport = vi.fn();
    render(
      <ImportPreviewModal
        open={true}
        onOpenChange={vi.fn()}
        targetStatus="draft"
        onConfirmImport={onConfirmImport}
        previewData={{
          fileName: "sample.xlsx",
          fileType: "excel",
          totalRows: 2,
          isUnderPreviewThreshold: true,
          validCount: 1,
          invalidCount: 1,
          groupedCount: 0,
          rows: [
            {
              rowNumber: 2,
              partNumber: 5,
              questionText: "Valid question?",
              optionA: "A",
              optionB: "B",
              optionC: "C",
              optionD: "D",
              correctAnswer: "A",
              difficulty: "easy",
              groupId: "",
              mediaRef: "",
              isValid: true,
              errors: [],
            },
            {
              rowNumber: 3,
              partNumber: 2,
              questionText: "",
              optionA: "A",
              optionB: "B",
              optionC: "C",
              optionD: "Invalid D",
              correctAnswer: "A",
              difficulty: "medium",
              groupId: "",
              mediaRef: "",
              isValid: false,
              errors: ["Part 2 không được có phương án D"],
            },
          ],
        }}
      />
    );

    expect(screen.getByText(/Xem trước dữ liệu Import/i)).toBeInTheDocument();
    expect(screen.getByText(/1 hợp lệ/i)).toBeInTheDocument();
    expect(screen.getByText(/1 dòng lỗi/i)).toBeInTheDocument();
    expect(screen.getByText(/Part 2 không được có phương án D/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Xác nhận Import/i }));
    expect(onConfirmImport).toHaveBeenCalledTimes(1);
  });
});
