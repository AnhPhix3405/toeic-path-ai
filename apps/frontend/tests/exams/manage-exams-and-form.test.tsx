import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManageExamsFilters } from "@/features/exams/components/manage/manage-exams-filters";
import { ManageExamsTable } from "@/features/exams/components/manage/manage-exams-table";
import { ExamForm } from "@/features/exams/components/manage/exam-form";
import { DeleteExamDialog } from "@/features/exams/components/manage/delete-exam-dialog";

describe("Teacher Exam Management UI (UC16, #1006, #1007, #1009, Review Focus 1 & 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Refresh button (#1007), 10/20 page size options, and page jump spinbutton (#1006) with boundary reset", () => {
    const onRefresh = vi.fn();
    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();

    render(
      <div>
        <ManageExamsFilters
          isFetching={false}
          onRefresh={onRefresh}
          filter={{
            page: 1,
            limit: 10,
            search: "",
            type: "all",
            status: "all",
            setPage: onPageChange,
            setLimit: onLimitChange,
            setSearch: vi.fn(),
            setType: vi.fn(),
            setStatus: vi.fn(),
            resetFilters: vi.fn(),
          }}
        />
        <ManageExamsTable
          exams={[
            {
              id: "ex-1",
              title: "ETS TOEIC 2026 Test 01",
              description: "Desc",
              type: "full_test",
              durationMinutes: 120,
              maxAttempts: 3,
              passingScore: 600,
              openAt: null,
              closeAt: null,
              allowPartPractice: true,
              isShuffledQuestions: false,
              isShuffledOptions: false,
              scoreConversionType: "DEFAULT_ETS",
              status: "draft",
              publishedAt: null,
              version: 1,
              createdBy: "t-1",
              isDeleted: false,
              sectionsCount: 7,
              createdAt: "2026-11-24T08:00:00.000Z",
              updatedAt: "2026-11-24T08:00:00.000Z",
            },
          ]}
          total={25}
          page={1}
          limit={10}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          onDeleteRequest={vi.fn()}
          onResetFilters={vi.fn()}
        />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: /Làm mới/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "20 dòng" }));
    expect(onLimitChange).toHaveBeenCalledWith(20);

    const spinbutton = screen.getByRole("spinbutton", {
      name: /Nhập số trang cần xem/i,
    }) as HTMLInputElement;
    fireEvent.change(spinbutton, { target: { value: "2" } });
    expect(onPageChange).toHaveBeenCalledWith(2);

    onPageChange.mockClear();
    fireEvent.change(spinbutton, { target: { value: "999" } });
    fireEvent.blur(spinbutton);
    expect(onPageChange).not.toHaveBeenCalled();
    expect(spinbutton.value).toBe("1");
  });

  it("Review Focus 1 (#1009): validates ExamForm inline errors and locks technical fields when status is closed", async () => {
    const onSubmit = vi.fn();
    render(
      <ExamForm
        mode="edit"
        initialExam={{
          id: "ex-closed",
          title: "Closed Official Exam",
          description: "Initial desc",
          type: "full_test",
          durationMinutes: 120,
          maxAttempts: 1,
          passingScore: 550,
          openAt: null,
          closeAt: null,
          allowPartPractice: false,
          isShuffledQuestions: true,
          isShuffledOptions: true,
          scoreConversionType: "DEFAULT_ETS",
          status: "closed",
          publishedAt: "2026-11-20T00:00:00.000Z",
          version: 4,
          createdBy: "t-1",
          isDeleted: false,
          sectionsCount: 7,
          createdAt: "2026-11-20T00:00:00.000Z",
          updatedAt: "2026-11-20T00:00:00.000Z",
        }}
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    expect(
      screen.getByText(/chỉ cho phép chỉnh sửa tiêu đề và mô tả/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Thời lượng làm bài/i)).toBeDisabled();

    // Inline error when title < 5 chars (#1009)
    const titleInput = screen.getByLabelText(/Tiêu đề đề thi/i);
    fireEvent.change(titleInput, { target: { value: "Abc" } });
    fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/i }));

    expect(
      await screen.findByText(/Tiêu đề đề thi phải có từ 5 đến 255 ký tự/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("BUG-S5-UI-002 regression: renders simultaneous inline role=alert errors on create form even when durationMinutes > 300 and passingScore > 990", async () => {
    const onSubmit = vi.fn();
    render(<ExamForm mode="create" isSubmitting={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Tiêu đề đề thi/i), {
      target: { value: "Abc" },
    });
    fireEvent.change(screen.getByLabelText(/Thời lượng làm bài/i), {
      target: { value: "350" },
    });
    fireEvent.change(screen.getByLabelText(/Điểm chuẩn đạt/i), {
      target: { value: "1050" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Khởi tạo đề thi/i }));

    expect(
      await screen.findByText(/Tiêu đề đề thi phải có từ 5 đến 255 ký tự/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Thời lượng làm bài phải nằm trong khoảng từ 1 đến 300 phút/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Điểm sàn chuẩn đạt phải từ 0 đến 990 điểm/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Review Focus 2: offers one-click Archive transition when DeleteExamDialog receives 409 ERR_EXAM_HAS_ATTEMPTS", () => {
    const onArchiveInstead = vi.fn();
    render(
      <DeleteExamDialog
        exam={{
          id: "ex-has-attempts",
          title: "Midterm TOEIC Exam",
          status: "closed",
          version: 2,
        } as never}
        isOpen={true}
        isDeleting={false}
        isArchiving={false}
        hasAttemptsConflictError="Đề thi đã có học viên tham gia, không thể xóa. Vui lòng chuyển trạng thái sang Lưu trữ (Archived)"
        onClose={vi.fn()}
        onConfirmDelete={vi.fn()}
        onArchiveInstead={onArchiveInstead}
      />
    );

    expect(
      screen.getByText(/Đề thi đã có học viên tham gia, không thể xóa/i)
    ).toBeInTheDocument();
    const archiveBtn = screen.getByRole("button", {
      name: /Chuyển sang Lưu trữ \(Archived\)/i,
    });
    fireEvent.click(archiveBtn);
    expect(onArchiveInstead).toHaveBeenCalledTimes(1);
  });
});
