# Hướng Dẫn & Đặc Tả Kiểm Thử Chuyên Sâu Sprint 7 — Task 2 (UC23, UC24, UC25)
*(Tuân thủ Hệ thống Quy chuẩn Kiểm thử Phần mềm Tổng thể — [`meta/Chuan_Testing.md`](file:///C:/PROJECTS/toeic-path-ai/meta/Chuan_Testing.md))*

---

## 1. Checklist Yêu Cầu Kiểm Thử (Phần 6 — Mục 1 `Chuan_Testing.md`)

### 1.1. Yêu cầu Chức năng (Functional Requirements)
- [x] **UC23 — Nộp bài thủ công (`POST /api/v1/exam-attempts/:id/submit`):** Chốt trạng thái `submitted` nếu trong hạn + 30s Grace Period, hoặc `timed_out` nếu quá hạn; tính `durationSpentSeconds` chặn trần theo `allocatedSeconds`.
- [x] **UC24 — Tự động thu bài hết giờ (`@Cron('0 * * * * *')`):** Quét các bài thi `in_progress` quá `expires_at + 30s`, chuyển sang `timed_out` và chấm điểm tự động.
- [x] **UC25 — Engine chấm điểm TOEIC (`ExamAttemptsGradingService`):**
  - Câu chỉ gắn cờ xem lại (`isMarkedForReview = true`) nhưng bỏ trống (`selectedOptionId = null`) phải được đếm vào `skippedCount` (`isCorrect = false`), không bị tính nhầm vào `wrongCount`.
  - Quy đổi điểm chuẩn ETS (`5–495`) cho `DEFAULT_ETS`; trả `null` cho kỹ năng không có câu hỏi (Single-Skill Exam Edge Case); trả `null` cho `part_practice` và `RAW_PERCENTAGE`.

### 1.2. Yêu cầu Phi chức năng (Non-Functional Requirements: Bảo mật, Đồng thời, Toàn vẹn)
- [x] **Bảo mật Quyền sở hữu (Integrity / Security):** Chỉ chính học viên sở hữu lượt thi mới được nộp bài; chặn cả học viên khác lẫn Giáo viên nộp hộ (`403 ERR_FORBIDDEN_ATTEMPT_ACCESS`).
- [x] **Độ tin cậy & Chống nộp đúp (Reliability / State Machine):** Nộp lần 2 trên bài đã nộp trả `409 ERR_ATTEMPT_ALREADY_SUBMITTED` kèm `{ status, submittedAt }`; nộp bài đã hủy (`abandoned`) trả `400 ERR_ATTEMPT_NOT_IN_PROGRESS`.

---

## 2. Bảng Ma Trận Ca Kiểm Thử (Phần 4 & Phần 6 — Mục 2, 3, 4 `Chuan_Testing.md`)
- **Tổng số Test Cases chính:** 10 TCs (trong đó **5 Negative TCs = 50% >= 40%** theo quy định tại Phần 6 Mục 4).
- **Kỹ thuật áp dụng:** Phân lớp tương đương (`EP`), Phân tích giá trị biên (`BVA`), Bảng quyết định (`DT`), Lược đồ chuyển trạng thái (`ST`).

| Test Case ID | Kỹ thuật | Loại | Mô tả | Các bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|---|---|---|
| `TC-T2-01` | `BVA / EP` | **Negative** | Nộp bài với `:id` sai định dạng UUID | Gọi `POST /exam-attempts/not-a-valid-uuid/submit` | `id = "not-a-valid-uuid"` | `400 Bad Request` (`ParseUUIDPipe`) |
| `TC-T2-02` | `EP` | **Negative** | Nộp bài với UUID không tồn tại | Gọi `POST /exam-attempts/:id/submit` | `id = "d0000000-0000-4000-8000-999999999999"` | `404 Not Found` (`ERR_ATTEMPT_NOT_FOUND`) |
| `TC-T2-03` | `DT` | **Negative** | Học viên khác hoặc Giáo viên cố tình nộp bài hộ học viên | Student 2 và Teacher gọi `POST /exam-attempts/:id/submit` trên bài của Student 1 | Token của `student2` và `teacher` | `403 Forbidden` (`ERR_FORBIDDEN_ATTEMPT_ACCESS`) |
| `TC-T2-04` | `DT` | **Positive** | Chấm điểm Full Exam `DEFAULT_ETS` có câu đúng, câu sai, câu bỏ trống và câu chỉ gắn cờ review (`selectedOptionId = null`) | Lưu 1 câu đúng, 1 câu sai, 1 câu `selectedOptionId: null, isMarkedForReview: true`, 1 câu không lưu $\rightarrow$ gọi `POST /:id/submit` | `attemptId` của Student 1 | `200 OK`, `correctCount = 1`, `wrongCount = 1`, `skippedCount = 2`, `accuracyPercentage = 25`, `totalScore = listeningScore + readingScore` |
| `TC-T2-05` | `ST` | **Negative** | Nộp bài đúp lần 2 (Double-click / Race condition) | Gọi lại `POST /exam-attempts/:id/submit` trên lượt thi vừa nộp | `attemptId` đã `submitted` | `409 Conflict` (`ERR_ATTEMPT_ALREADY_SUBMITTED` kèm `{ status: 'submitted', submittedAt }`) |
| `TC-T2-06` | `ST` | **Negative** | Cố nộp lượt thi đã hủy (`abandoned`) | Tạo lượt thi $\rightarrow$ gọi `POST /:id/abandon` $\rightarrow$ gọi `POST /:id/submit` | `attemptId` ở trạng thái `abandoned` | `400 Bad Request` (`ERR_ATTEMPT_NOT_IN_PROGRESS`) |
| `TC-T2-07` | `DT` | **Positive** | Chấm điểm chế độ luyện tập theo Part (`part_practice`) | Tạo lượt thi `part_practice` (Part 5) $\rightarrow$ gọi `POST /:id/submit` | `mode = 'part_practice', selectedParts = [5]` | `200 OK`, `listeningScore = null`, `readingScore = null`, `totalScore = null`, `isPassed = null` |
| `TC-T2-08` | `DT` | **Positive** | Chấm điểm đề thi `RAW_PERCENTAGE` (`passingScore = 50`) | Tạo lượt thi trên đề `RAW_PERCENTAGE`, trả lời đúng 1/1 câu $\rightarrow$ gọi `POST /:id/submit` | `examId = rawExamId` | `200 OK`, `totalScore = null`, `accuracyPercentage = 100`, `isPassed = true` |
| `TC-T2-09` | `DT` | **Positive** | Chấm điểm đề thi 1 kỹ năng Listening (`readingTotal = 0`) | Tạo lượt thi trên đề chỉ có Part 1 (`readingTotal = 0`) $\rightarrow$ gọi `POST /:id/submit` | `examId = singleSkillExamId` | `200 OK`, `listeningScore = 5`, `readingScore = null`, `totalScore = null`, `isPassed = null` |
| `TC-T2-10` | `BVA / ST` | **Positive** | Nộp bài quá hạn `expires_at + 30s` (`timed_out`) & chặn trần `durationSpentSeconds` | Gọi `POST /:id/submit` trên lượt thi có `expires_at = NOW() - 120s` | `attemptId = expiredAttemptId` | Chuyển trạng thái `timed_out`, `durationSpentSeconds = 7200` (chặn trần theo `allocatedSeconds`) |

---

## 3. Lệnh Chạy Kiểm Thử Tự Động (Newman CLI)

```bash
# 1. Xóa bộ đếm Rate Limit trong Redis
docker exec toeic-path-ai-redis redis-cli FLUSHDB

# 2. Seed dữ liệu mẫu chuẩn hóa
pnpm --filter backend exec ts-node test/collections/sprint7/task5/seed-sprint7-postman.ts

# 3. Chạy Newman CLI cho Task 2 Collection
npx newman run apps/backend/test/collections/sprint7/task2/sprint7-task2-submission-grading.postman_collection.json \
  --delay-request 100 \
  --reporters cli \
  --bail
```
