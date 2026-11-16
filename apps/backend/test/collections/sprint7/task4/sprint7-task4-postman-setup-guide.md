# Hướng Dẫn & Đặc Tả Kiểm Thử Chuyên Sâu Sprint 7 — Task 4 (UC29, UC49)
*(Tuân thủ Hệ thống Quy chuẩn Kiểm thử Phần mềm Tổng thể — [`meta/Chuan_Testing.md`](file:///C:/PROJECTS/toeic-path-ai/meta/Chuan_Testing.md))*

---

## 1. Checklist Yêu Cầu Kiểm Thử (Phần 6 — Mục 1 `Chuan_Testing.md`)

### 1.1. Yêu cầu Chức năng (Functional Requirements)
- [x] **UC29 — Học viên gửi báo cáo lỗi câu hỏi (`POST /api/v1/questions/:questionId/reports`):**
  - Bắt buộc `description` (`10–1000` ký tự sau khi `.trim()`) khi `reason === 'other'`.
  - Xác thực ngữ cảnh `attemptId` (thuộc sở hữu học viên, đã nộp `submitted`/`timed_out`, và `questionId` nằm trong `snapshot.shuffledQuestions`).
- [x] **UC29 — Học viên xem phản hồi cá nhân (`GET /api/v1/question-reports/my`):** Trả về envelope phân trang phẳng kèm `status`, `resolutionNote`, `resolvedAt` và mở khóa cho phép tạo báo cáo mới sau khi báo cáo cũ đã đóng.
- [x] **UC49 — Giáo viên/Admin quản lý & xử lý báo cáo (`GET /question-reports`, `GET /question-reports/:id`, `PATCH /question-reports/:id/resolve`):**
  - Xem chi tiết báo cáo kèm đầy đủ ngữ cảnh câu hỏi, `options` (Rule #1002 `content: null`) và `questionGroup` (`title`, `passageText`, `audioUrl`, `imageUrl`, `transcript`).
  - Chuyển `pending` $\rightarrow$ `in_review` giữ nguyên `resolvedById = null`, `resolvedAt = null`.
  - Chuyển sang `resolved` / `rejected` bắt buộc `resolutionNote` (`10–1000` ký tự sau khi `.trim()`) và hỗ trợ `resolveAllForQuestion: true` đóng đồng loạt các báo cáo mở khác của cùng câu hỏi.

### 1.2. Yêu cầu Phi chức năng (Non-Functional Requirements: Bảo mật, Đồng thời, Toàn vẹn)
- [x] **Chống Spam Trùng Báo Cáo (Concurrency / Integrity):** Bắt mã lỗi PostgreSQL `23505` từ Partial Unique Index `uq_reporter_open_question_report` và trả về `409 ERR_DUPLICATE_OPEN_REPORT`.
- [x] **Phân quyền RBAC & Bảo vệ Quyền riêng tư Giảng viên (Security / Privacy):** Chặn học viên truy cập các API quản trị UC49 (`403 Forbidden`); ẩn hoàn toàn `resolvedBy` và `resolvedById` trong API `GET /question-reports/my`.

---

## 2. Bảng Ma Trận Ca Kiểm Thử (Phần 4 & Phần 6 — Mục 2, 3, 4 `Chuan_Testing.md`)
- **Tổng số Test Cases chính:** 12 TCs (trong đó **8 Negative TCs = 66.7% >= 40%** theo quy định tại Phần 6 Mục 4).
- **Kỹ thuật áp dụng:** Phân lớp tương đương (`EP`), Phân tích giá trị biên (`BVA`), Bảng quyết định (`DT`), Lược đồ chuyển trạng thái (`ST`).

| Test Case ID | Kỹ thuật | Loại | Mô tả | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| `TC-T4-01` | `BVA` | **Negative** | `description` dài 9 ký tự sau `.trim()` khi `reason = 'other'` (sát dưới biên 10) | Gọi `POST /questions/:id/reports` | `reason = 'other', description = '   123456789   '` | `400 Bad Request` |
| `TC-T4-02` | `EP` | **Negative** | `description` toàn khoảng trắng khi `reason = 'other'` | Gọi `POST /questions/:id/reports` | `reason = 'other', description = '               '` | `400 Bad Request` |
| `TC-T4-03` | `ST / DT` | **Negative** | Truyền `attemptId` chưa nộp (`400`), của người khác (`403`), hoặc `questionId` không thuộc `attemptId` (`400`) | Lần lượt gọi `POST /questions/:id/reports` với 3 ca lỗi ngữ cảnh `attemptId` | `inProgressAttemptId`, `student2Token`, `outsideQuestionId` | `400 ERR_ATTEMPT_NOT_SUBMITTED`, `403 ERR_FORBIDDEN_ATTEMPT_ACCESS`, `400 ERR_QUESTION_NOT_IN_ATTEMPT` |
| `TC-T4-04` | `BVA` | **Positive** | Tạo báo cáo tại đúng biên dưới `description` = 10 ký tự sau `.trim()` | Gọi `POST /questions/:id/reports` | `reason = 'other', description = '  1234567890  '` | `201 Created`, `description = '1234567890'`, `status = 'pending'` |
| `TC-T4-05` | `ST` | **Negative** | Gửi báo cáo trùng thứ 2 khi báo cáo đầu đang mở (`pending`) | Gọi lại `POST /questions/:id/reports` trên cùng `questionId` | `questionId = q2Id` | `409 Conflict` (`ERR_DUPLICATE_OPEN_REPORT`) |
| `TC-T4-06` | `DT` | **Negative** | Học viên cố tình gọi `PATCH /question-reports/:id/resolve` | Student 1 gọi `PATCH /question-reports/:id/resolve` | Token của `student1` | `403 Forbidden` |
| `TC-T4-07` | `BVA` | **Negative** | Giáo viên gửi `resolutionNote` dài 9 ký tự sau `.trim()` khi `status = 'resolved'` (sát dưới biên 10) | Teacher gọi `PATCH /question-reports/:id/resolve` | `status = 'resolved', resolutionNote = '  123456789  '` | `400 Bad Request` |
| `TC-T4-08` | `ST` | **Positive** | Giáo viên xem chi tiết báo cáo (kèm `questionGroup`) và chuyển `pending` $\rightarrow$ `in_review` | Gọi `GET /question-reports/:id` và `PATCH /question-reports/:id/resolve` | `status = 'in_review'` | `200 OK`, `resolvedById = null`, `resolvedAt = null` (bảo vệ SLA) |
| `TC-T4-09` | `ST` | **Negative** | Giáo viên gọi chuyển `in_review` lặp lần 2 khi báo cáo đã ở `in_review` | Gọi lại `PATCH /question-reports/:id/resolve` với `status = 'in_review'` | `status = 'in_review'` | `400 Bad Request` (`ERR_INVALID_REPORT_STATUS_TRANSITION`) |
| `TC-T4-10` | `DT` | **Positive** | Đóng hàng loạt báo cáo mở của cùng câu hỏi với `resolveAllForQuestion = true` | Student 2 báo lỗi cùng `q2Id` $\rightarrow$ Teacher gọi `PATCH /:id/resolve` với `resolveAllForQuestion: true` | `status = 'resolved', resolveAllForQuestion = true` | `200 OK`, `bulkResolvedCount = 1`, cả 2 báo cáo đều chuyển sang `resolved` |
| `TC-T4-11` | `ST` | **Negative** | Giáo viên cố cập nhật lại báo cáo đã đóng (`resolved`) | Gọi `PATCH /question-reports/:id/resolve` với `status = 'rejected'` | `report1Id` đã `resolved` | `400 Bad Request` (`ERR_REPORT_ALREADY_CLOSED`) |
| `TC-T4-12` | `EP` | **Positive** | Học viên 2 kiểm tra báo cáo được đóng kèm qua `GET /question-reports/my` (ẩn `resolvedBy`) | Student 2 gọi `GET /question-reports/my?status=resolved` | Token của `student2` | `200 OK`, thấy `resolutionNote`, không có thuộc tính `resolvedBy` / `resolvedById` |

---

## 3. Lệnh Chạy Kiểm Thử Tự Động (Newman CLI)

```bash
# 1. Xóa bộ đếm Rate Limit trong Redis
docker exec toeic-path-ai-redis redis-cli FLUSHDB

# 2. Seed dữ liệu mẫu chuẩn hóa
pnpm --filter backend exec ts-node test/collections/sprint7/task5/seed-sprint7-postman.ts

# 3. Chạy Newman CLI cho Task 4 Collection
npx newman run apps/backend/test/collections/sprint7/task4/sprint7-task4-question-reports.postman_collection.json \
  --delay-request 100 \
  --reporters cli \
  --bail
```
