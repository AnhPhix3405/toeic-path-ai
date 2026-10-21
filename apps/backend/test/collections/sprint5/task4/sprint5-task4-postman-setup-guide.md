# Hướng dẫn Kiểm thử Postman — Sprint 5 Task 4

Collection kiểm thử:
```text
test/collections/sprint5/task4/sprint5-task4-exams-publishing.postman_collection.json
```

> [!WARNING]
> Chỉ chạy collection và các kịch bản kiểm thử trong tài liệu này trên môi trường `development` hoặc `test` cô lập. Tuyệt đối không chạy trên môi trường `production`.

---

## 1. Phạm Vi Nghiệp Vụ Kiểm Thử (Scope — UC18)

Collection kiểm thử tự động toàn diện các quy trình cốt lõi của **Sprint 5 — Task 4: Quy Trình Thẩm Định, Xuất Bản & Vòng Đời Đề Thi (UC18)**:

1. **Publish Checklist Validator (`POST /api/v1/exams/:id/publish`):**
   - **Thẩm định cấu trúc:** Kiểm tra đủ 200 câu cho Full Test, từ 20–100 câu đủ 2 kỹ năng cho Placement Test, và đúng số câu khai báo cho Mini Test. Từ chối đề Full Test rỗng với mã lỗi `400 Bad Request` (`ERR_EXAM_INCOMPLETE_QUESTIONS`).
   - **Thẩm định Media & Context không nghẽn I/O qua DB metadata:**
     - Part 1 bắt buộc có cả ảnh và file audio (`resourceType === IMAGE` và `AUDIO`).
     - Part 2, 3, 4 bắt buộc có file audio.
     - Part 6, 7 câu hỏi nhóm bắt buộc `questionGroup.context` không được rỗng.
     - Kiểm tra chuỗi `orderIndex` liên tục từ 1 đến N (`ERR_EXAM_ORDER_DISCONTINUOUS`).
     - **Single Choice Invariant:** Kiểm tra mỗi câu hỏi có đúng 1 đáp án `isCorrect === true`.
   - **Lập lịch thi tương lai & Trạng thái suy diễn (Computed Status - PMR 008):**
     - Đề có `openAt` ở tương lai (`openAt > now()`): Lưu CSDL `status = 'published'`, API trả về `isScheduled: true` để Frontend gắn badge "Đã lên lịch" và disable nút vào thi.
   - **Optimistic Locking:** Gửi sai `version` bị từ chối với `409 Conflict` (`ERR_CONCURRENCY_CONFLICT`).
   - **Chặn Re-publish:** Đề đã ở trạng thái `published` không thể publish lại (`400 Bad Request` - `ERR_INVALID_EXAM_STATUS_TRANSITION`).
   - **RBAC Guard:** Chặn học viên (Student) gọi API publish (`403 Forbidden`).

2. **Unpublish Guard (`POST /api/v1/exams/:id/unpublish`):**
   - Cho phép giáo viên rút đề thi `published` về lại `draft` để chỉnh sửa **CHỈ KHI** chưa có học viên nào làm bài (`attemptsCount === 0`).
   - Khi unpublish thành công: Cập nhật `status = 'draft'`, gỡ bỏ `publishedAt = null`, tăng `version = version + 1`, trả về `isScheduled: false`.
   - Chặn đưa về draft khi đề đã phát sinh lượt làm bài với mã lỗi `ERR_EXAM_HAS_ATTEMPTS`.
   - Chặn unpublish khi đề đang ở trạng thái `draft` (`ERR_INVALID_EXAM_STATUS_TRANSITION`).
   - Kiểm soát `version` và chặn quyền Student (`403 Forbidden`).

3. **Máy Trạng Thái Đề Thi — Close & Archive:**
   - **Đóng đề thủ công (`POST /api/v1/exams/:id/close`):** Chuyển đề `published` sang `closed`, tăng `version = version + 1`.
   - **Lưu trữ đề thi (`POST /api/v1/exams/:id/archive`):**
     - Chặn lưu trữ trực tiếp từ `published` (`ERR_INVALID_EXAM_STATUS_TRANSITION`).
     - Cho phép lưu trữ từ `closed` $\rightarrow$ `archived`, tăng `version = version + 1`.
   - Kiểm soát `version` (Optimistic Locking) và phân quyền Creator / Admin.

4. **Dọn dẹp tài nguyên (Cleanup):**
   - Soft-delete an toàn các đề thi mẫu được sinh ra trong phiên test (`emptyExam`, `scheduledExam`, `lifecycleExam`).

---

## 2. Chuẩn Bị Backend & Môi Trường

1. Khởi động PostgreSQL và Redis container hiện hữu (Rule #1001: cổng `5400` và `6379`):
   ```bash
   docker ps
   ```
2. Đảm bảo migration mới nhất đã được áp dụng:
   ```bash
   pnpm --filter backend migration:run
   ```
3. Khởi động Backend server dev:
   ```bash
   pnpm --filter backend start:dev
   ```
4. Collection mặc định sử dụng `http://localhost:3001/api/v1` làm `baseUrl`.

---

## 3. Cấu Hình Postman Collection Variables

Thiết lập các biến môi trường trong tab **Variables** của Collection hoặc file Environment:

| Tên biến | Giá trị mẫu | Mô tả |
|---|---|---|
| `baseUrl` | `http://localhost:3001/api/v1` | URL gốc của Backend API |
| `adminEmail` | `admin@example.com` | Email tài khoản Admin có sẵn |
| `adminPassword` | `StrongPassword123!` | Mật khẩu tài khoản Admin |
| `teacherEmail` | `sprint5.task4.teacher@example.com` | Email ứng viên Teacher |
| `studentEmail` | `sprint5.task4.student@example.com` | Email tài khoản Student |
| `testPassword` | `StrongPassword123!` | Mật khẩu tài khoản test |

---

## 4. Lệnh Chạy Tự Động Bằng Newman (Tham Khảo)

> [!NOTE]
> Lệnh dưới đây phục vụ tham chiếu khi tiến hành chạy kiểm thử chính thức (out of scope hiện tại - không chạy trong lượt này):
> ```powershell
> npx newman run apps/backend/test/collections/sprint5/task4/sprint5-task4-exams-publishing.postman_collection.json `
>   --env-var "baseUrl=http://localhost:3001/api/v1" `
>   --env-var "adminEmail=admin@example.com" `
>   --env-var "adminPassword=StrongPassword123!" `
>   --env-var "teacherEmail=sprint5.task4.teacher@example.com" `
>   --env-var "studentEmail=sprint5.task4.student@example.com" `
>   --env-var "testPassword=StrongPassword123!"
> ```
