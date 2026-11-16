# Hướng Dẫn Thiết Lập & Chạy Kiểm Thử Tự Động Sprint 7 (Newman CLI)

Tài liệu này cung cấp quy trình chuẩn hóa để chạy bộ kiểm thử tự động toàn diện **Sprint 7 Master Postman Collection** (`sprint7-comprehensive-e2e.postman_collection.json`) kiểm chứng toàn bộ vòng đời **MVP Cốt Lõi**:
- **UC23 & UC24:** Nộp bài thủ công (`POST /api/v1/exam-attempts/:id/submit`), chống nộp đúp (`409 ERR_ATTEMPT_ALREADY_SUBMITTED`), chặn nộp lượt thi đã hủy (`400 ERR_ATTEMPT_NOT_IN_PROGRESS`), và xử lý quá hạn `expires_at + 30s` (`timed_out` kèm chặn trần `durationSpentSeconds`).
- **UC25:** Engine chấm điểm tự động & quy đổi điểm chuẩn ETS TOEIC (`5–495`), chế độ `part_practice` và `RAW_PERCENTAGE`, thống kê `partBreakdown` & `skillBreakdown`.
- **UC26, UC27, UC28:** Xem kết quả tổng quan (`GET /api/v1/exam-attempts/:id/result`), lịch sử làm bài phân trang phẳng (`GET /api/v1/exam-attempts/history`), và xem đáp án & lời giải chi tiết (`GET /api/v1/exam-attempts/:id/review`) với deduplicate `questionGroups` sau khi lọc và hỗ trợ Rule #1002 (`content: null`).
- **UC29 & UC49:** Học viên gửi báo cáo lỗi câu hỏi (`POST /api/v1/questions/:questionId/reports`), chống spam trùng bằng Partial Unique Index (`409 ERR_DUPLICATE_OPEN_REPORT`), theo dõi phản hồi cá nhân (`GET /api/v1/question-reports/my` ẩn `resolvedBy`), và Giáo viên/Admin quản lý, xem chi tiết, xử lý đơn lẻ hoặc đóng hàng loạt báo cáo (`GET /api/v1/question-reports`, `GET /api/v1/question-reports/:id`, `PATCH /api/v1/question-reports/:id/resolve`).

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

1. **Hạ tầng Docker Compose (Rule #1001):**
   Đảm bảo 2 containers hiện hữu đang hoạt động:
   - PostgreSQL 16: `toeic-path-ai-postgres` (Port `5400`)
   - Redis 8: `toeic-path-ai-redis` (Port `6379`)

2. **Dịch Vụ Backend NestJS:**
   Backend đang khởi chạy tại `http://localhost:3001` (với tiền tố `api/v1`):
   ```bash
   pnpm --filter backend start:dev
   ```

---

## 2. Bước Chuẩn Bị: Xóa Bộ Đếm Rate Limit & Seed Dữ Liệu Mẫu (PMR 032)

1. **Dọn dẹp Redis Rate Limit counter:**
   Trước khi chạy Newman, xóa sạch bộ đếm rate limiting trong Redis để tránh lỗi `429 Too Many Requests`:
   ```bash
   docker exec toeic-path-ai-redis redis-cli FLUSHDB
   ```

2. **Khởi tạo dữ liệu mẫu cho Newman E2E:**
   Chạy script seed tự động tạo các tài khoản test (`spr7.student1@example.com`, `spr7.student2@example.com`, `spr7.student3@example.com`, `spr7.teacher@example.com`), 2 đề thi chuẩn hóa (`d0000000-0000-4000-8000-000000000001` — Full Exam `DEFAULT_ETS` và `d0000000-0000-4000-8000-000000000002` — Mini Exam `RAW_PERCENTAGE`), cùng 1 lượt thi quá hạn sẵn sàng kiểm thử nhánh `timed_out`:
   ```bash
   pnpm --filter backend exec ts-node test/collections/sprint7/task5/seed-sprint7-postman.ts
   ```

---

## 3. Lệnh Thực Thi Kiểm Thử Tự Động (One-Touch Execution)

Mỗi request trong collection đều được gắn tường minh header `Authorization: Bearer {{...Token}}` theo đúng vai trò (`student1Token`, `student2Token`, `student3Token`, `teacherToken`) để triệt tiêu hoàn toàn hiện tượng "Sticky Cookies" khi chuyển đổi giữa các actor (PMR 032).

Thực thi Newman CLI:
```bash
npx newman run apps/backend/test/collections/sprint7/task5/sprint7-comprehensive-e2e.postman_collection.json \
  --delay-request 100 \
  --reporters cli \
  --bail
```

> **Tiêu chí nghiệm thu (Rule #777):** 100% requests và assertions phải PASS (0 failures).

---

## 4. Script Dọn Dẹp CSDL Sau Khi Kiểm Thử (SQL Cleanup)

Thực thi theo đúng thứ tự khóa ngoại (bắt đầu từ `question_reports` có `ON DELETE RESTRICT` trên `question_id` và `reporter_id`):

```sql
-- 1. Xóa báo cáo câu hỏi test Sprint 7
DELETE FROM question_reports
WHERE question_id IN (SELECT id FROM questions WHERE explanation LIKE 'TEST_POSTMAN_SPR7_%')
   OR reporter_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com');

-- 2. Xóa answers, snapshots và attempts của lượt thi test Sprint 7
DELETE FROM exam_attempt_answers
WHERE attempt_id IN (
  SELECT id FROM exam_attempts
  WHERE exam_id IN ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002')
     OR user_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com')
);

DELETE FROM exam_attempt_snapshots
WHERE attempt_id IN (
  SELECT id FROM exam_attempts
  WHERE exam_id IN ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002')
     OR user_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com')
);

DELETE FROM exam_attempts
WHERE exam_id IN ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002')
   OR user_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com');

-- 3. Xóa cấu trúc đề thi test Sprint 7
DELETE FROM exam_questions WHERE exam_id IN ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002');
DELETE FROM exam_sections WHERE exam_id IN ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002');
DELETE FROM exams WHERE id IN ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002');

-- 4. Xóa media, phương án, kỹ năng, câu hỏi và nhóm câu hỏi test Sprint 7
DELETE FROM media_resources WHERE question_id IN (SELECT id FROM questions WHERE explanation LIKE 'TEST_POSTMAN_SPR7_%');
DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE explanation LIKE 'TEST_POSTMAN_SPR7_%');
DELETE FROM question_skills WHERE question_id IN (SELECT id FROM questions WHERE explanation LIKE 'TEST_POSTMAN_SPR7_%');
DELETE FROM questions WHERE explanation LIKE 'TEST_POSTMAN_SPR7_%';
DELETE FROM question_groups WHERE title LIKE 'TEST_POSTMAN_SPR7_%';
DELETE FROM skills WHERE code = 'TEST_POSTMAN_SPR7_GRAMMAR';

-- 5. Xóa người dùng test Sprint 7
DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com');
DELETE FROM users WHERE email LIKE 'spr7.%@example.com';
```
