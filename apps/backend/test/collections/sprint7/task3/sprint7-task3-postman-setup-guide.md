# Hướng Dẫn & Đặc Tả Kiểm Thử Chuyên Sâu Sprint 7 — Task 3 (UC26, UC27, UC28)
*(Tuân thủ Hệ thống Quy chuẩn Kiểm thử Phần mềm Tổng thể — [`meta/Chuan_Testing.md`](file:///C:/PROJECTS/toeic-path-ai/meta/Chuan_Testing.md))*

---

## 1. Checklist Yêu Cầu Kiểm Thử (Phần 6 — Mục 1 `Chuan_Testing.md`)

### 1.1. Yêu cầu Chức năng (Functional Requirements)
- [x] **UC26 — Xem kết quả tổng quan (`GET /api/v1/exam-attempts/:id/result`):** Hiển thị đầy đủ điểm số, ngữ cảnh chế độ thi (`mode`, `selectedParts`, `scoreConversionType`), `partBreakdown` (sắp xếp `partNumber ASC`) và `skillBreakdown` (sắp xếp `skillCode ASC`).
- [x] **UC27 — Xem lịch sử làm bài (`GET /api/v1/exam-attempts/history`):** Không bị xung đột định tuyến với `:id`, trả về envelope phẳng `{ items, total, page, limit, totalPages }`, hỗ trợ lọc `examId`, `mode`, `status`, `fromDate`/`toDate` (chuẩn hóa `YYYY-MM-DD` về `23:59:59.999Z`).
- [x] **UC28 — Xem đáp án & lời giải (`GET /api/v1/exam-attempts/:id/review`):** Giữ nguyên thứ tự và nhãn `A–D` của `options` từ Snapshot kèm `isCorrect`; tính `filterCounts` theo phạm vi `partNumber` trước khi lọc `filter`; phân tách rạch ròi `wrong` (`selectedOptionId !== null && !isCorrect`) khỏi `skipped` (`selectedOptionId === null`); deduplicate `questionGroups` **sau khi lọc câu hỏi**; tuân thủ Rule #1002 (`content: null`).

### 1.2. Yêu cầu Phi chức năng (Non-Functional Requirements: Bảo mật, Hiệu năng, Khả dụng)
- [x] **Bảo mật Zero Answer Leakage (Integrity / Security):** Chặn tuyệt đối `/result` và `/review` khi lượt thi đang `in_progress` hoặc `abandoned` (`400 ERR_ATTEMPT_NOT_SUBMITTED`). Chặn học viên khác xem kết quả/lời giải của nhau (`403 ERR_FORBIDDEN_ATTEMPT_ACCESS`), nhưng cho phép `Admin` tra cứu hỗ trợ khách hàng.
- [x] **Tối ưu hiệu năng (Efficiency):** API `/history` không tải 2 cột JSONB nặng `partBreakdown` và `skillBreakdown`, giới hạn trần `limit <= 50`.

---

## 2. Bảng Ma Trận Ca Kiểm Thử (Phần 4 & Phần 6 — Mục 2, 3, 4 `Chuan_Testing.md`)
- **Tổng số Test Cases chính:** 12 TCs (trong đó **7 Negative TCs = 58.3% >= 40%** theo quy định tại Phần 6 Mục 4).
- **Kỹ thuật áp dụng:** Phân lớp tương đương (`EP`), Phân tích giá trị biên (`BVA`), Bảng quyết định (`DT`), Lược đồ chuyển trạng thái (`ST`).

| Test Case ID | Kỹ thuật | Loại | Mô tả | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| `TC-T3-01` | `ST` | **Negative** | Chặn xem `/result` khi đang làm bài (`in_progress`) | Gọi `GET /exam-attempts/:id/result` khi chưa nộp bài | `attemptId` đang `in_progress` | `400 Bad Request` (`ERR_ATTEMPT_NOT_SUBMITTED`) |
| `TC-T3-02` | `ST` | **Negative** | Chặn xem `/review` khi đang làm bài (`in_progress` — Zero Answer Leakage) | Gọi `GET /exam-attempts/:id/review` khi chưa nộp bài | `attemptId` đang `in_progress` | `400 Bad Request` (`ERR_ATTEMPT_NOT_SUBMITTED`) |
| `TC-T3-03` | `DT` | **Negative** | Học viên khác cố truy cập `/result` của chủ sở hữu | Student 2 gọi `GET /exam-attempts/:id/result` của Student 1 | Token của `student2` | `403 Forbidden` (`ERR_FORBIDDEN_ATTEMPT_ACCESS`) |
| `TC-T3-04` | `EP` | **Positive** | Học viên xem `/result` sau khi nộp bài | Student 1 gọi `GET /exam-attempts/:id/result` | Token của `student1` | `200 OK`, trả về `partBreakdown` (`[1,3,5,7]`) và `skillBreakdown` |
| `TC-T3-05` | `DT` | **Positive** | Admin xem `/result` của học viên để hỗ trợ tra cứu | Admin gọi `GET /exam-attempts/:id/result` | Token của `admin` | `200 OK`, `attemptId` khớp |
| `TC-T3-06` | `BVA` | **Negative** | Phân trang `/history` vượt biên dưới (`page=0`) và biên trên (`limit=51`) | Gọi `GET /exam-attempts/history?page=0&limit=51` | `page = 0, limit = 51` | `400 Bad Request` |
| `TC-T3-07` | `BVA / EP` | **Negative** | Lọc ngày `/history` bị ngược `fromDate > toDate` | Gọi `GET /exam-attempts/history?fromDate=2026-11-20&toDate=2026-11-10` | `fromDate > toDate` | `400 Bad Request` (`ERR_INVALID_DATE_RANGE`) |
| `TC-T3-08` | `BVA` | **Positive** | Phân trang `/history` tại biên trên hợp lệ `limit=50` & chuẩn hóa `toDate` | Gọi `GET /exam-attempts/history?page=1&limit=50&fromDate=2020-01-01&toDate=2099-12-31` | `page = 1, limit = 50` | `200 OK`, không chứa `partBreakdown`/`skillBreakdown`, có `durationSpentSeconds` và `isPassed` |
| `TC-T3-09` | `DT` | **Positive** | Lọc `/review?filter=wrong` vs `filter=skipped` & deduplicate `questionGroups` sau khi lọc | Gọi `GET /:id/review?filter=wrong` và `GET /:id/review?filter=skipped` | `filter = 'wrong'` / `'skipped'` | Câu chỉ gắn cờ review `selectedOptionId = null` nằm ở `skipped`, không nằm ở `wrong`; `questionGroups` chỉ chứa nhóm của câu đã lọc |
| `TC-T3-10` | `BVA` | **Positive** | Xem `/review?partNumber=1` (biên dưới Part 1) & Rule #1002 `content: null` | Gọi `GET /:id/review?partNumber=1&filter=all` | `partNumber = 1` | `200 OK`, `filterCounts.all = 1`, `content = null`, `options` giữ nhãn `['A','B','C','D']` |
| `TC-T3-11` | `BVA` | **Negative** | Xem `/review` với `partNumber=8` (vượt biên 7) và `filter` không hợp lệ | Gọi `GET /:id/review?partNumber=8&filter=invalid_filter` | `partNumber = 8, filter = 'invalid_filter'` | `400 Bad Request` |
| `TC-T3-12` | `EP` | **Negative** | Xem `/review?partNumber=7` trên lượt thi `part_practice` chỉ chọn Part 5 | Tạo và nộp bài `part_practice` (Part 5) $\rightarrow$ gọi `GET /:id/review?partNumber=7` | `partNumber = 7` ngoài `selectedParts = [5]` | `400 Bad Request` (`ERR_PART_NOT_IN_ATTEMPT`) |

---

## 3. Lệnh Chạy Kiểm Thử Tự Động (Newman CLI)

```bash
# 1. Xóa bộ đếm Rate Limit trong Redis
docker exec toeic-path-ai-redis redis-cli FLUSHDB

# 2. Seed dữ liệu mẫu chuẩn hóa
pnpm --filter backend exec ts-node test/collections/sprint7/task5/seed-sprint7-postman.ts

# 3. Chạy Newman CLI cho Task 3 Collection
npx newman run apps/backend/test/collections/sprint7/task3/sprint7-task3-results-history-review.postman_collection.json \
  --delay-request 100 \
  --reporters cli \
  --bail
```
