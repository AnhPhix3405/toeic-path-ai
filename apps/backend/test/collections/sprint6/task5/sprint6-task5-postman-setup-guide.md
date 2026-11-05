# Hướng Dẫn Thiết Lập & Chạy Kiểm Thử Tự Động Sprint 6 (Newman CLI)

Tài liệu này cung cấp quy trình chuẩn hóa để chạy bộ kiểm thử tự động toàn diện **Sprint 6 Master Postman Collection** (`sprint6-comprehensive-e2e.postman_collection.json`) kiểm chứng toàn bộ 3 Use Cases:
- **UC20:** Bắt đầu làm bài thi & Snapshot đề thi (Full Test, Part Practice, Snapshot freeze, Single active attempt invariant, Auto-resume cùng đề thi, Chặn thi đồng thời nhiều đề).
- **UC21:** Tải nội dung bài thi & Phân phối câu hỏi Split-view UI (Ma trận tiến độ tổng quan, Deduplicate Question Groups, Zero Answer Leakage, Part Boundary Guard).
- **UC22:** Tự động lưu đáp án Realtime & Batch Recovery (Conditional Upsert bảo toàn đáp án khi toggle review flag, In-memory Pre-validation chống partial failure rollback, An ninh bài thi).

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

1. **Hạ tầng Docker Compose (Rule #1001):**
   Đảm bảo 2 containers CSDL và Cache hiện hữu đang hoạt động:
   - PostgreSQL 16: `toeic-path-ai-postgres` (Port `5400`)
   - Redis 8: `toeic-path-ai-redis` (Port `6379`)

2. **Dịch Vụ Backend NestJS:**
   Backend đang khởi chạy tại `http://localhost:3001` (với tiền tố `api/v1`):
   ```bash
   pnpm --filter backend start:dev
   ```

3. **Công cụ Newman CLI:**
   ```bash
   npm install -g newman
   ```

---

## 2. Bước Chuẩn Bị: Phòng Chống Rate Limit & Khởi Tạo Đề Thi Test

1. **Dọn dẹp Redis cache và Rate Limit counter:**
   Trước khi chạy Newman, xóa sạch bộ đếm rate limiting trong Redis:
   ```bash
   docker exec toeic-path-ai-redis redis-cli FLUSHDB
   ```

2. **Khởi tạo đề thi mẫu cho Newman E2E:**
   Chạy script tự động seed 2 đề thi chuẩn hóa (`c0000000-0000-4000-8000-000000000001` - Full Test 20 câu và `c0000000-0000-4000-8000-000000000002` - Exam B):
   ```bash
   pnpm --filter backend exec ts-node test/collections/sprint6/task5/seed-sprint6-postman.ts
   ```

---

## 3. Lệnh Thực Thi Kiểm Thử Tự Động (One-Touch Execution)

Do collection đã tích hợp sẵn **Folder 00 — Authentication & Environment Setup**, Newman sẽ tự động lấy Token cho các Student actors và Admin mà không cần cấu hình file environment bên ngoài.

Thực thi Newman CLI với cờ `--delay-request 100` để đảm bảo hệ thống xử lý ổn định trên mọi môi trường:

```bash
newman run apps/backend/test/collections/sprint6/task5/sprint6-comprehensive-e2e.postman_collection.json \
  --delay-request 100 \
  --reporters cli \
  --bail
```

> **Ghi chú tiêu chí nghiệm thu (Rule #777):** 100% assertions phải PASS (0 failures).

---

## 4. Script Dọn Dẹp CSDL Sau Khi Kiểm Thử (SQL Cleanup)

Để đảm bảo tính cô lập và không để lại dữ liệu rác làm sai lệch các đợt kiểm thử tiếp theo, thực thi script dọn dẹp theo đúng thứ tự 7 tầng khóa ngoại:

```sql
-- 1. Xóa answers của các lượt thi test Sprint 6
DELETE FROM exam_attempt_answers
WHERE attempt_id IN (
  SELECT id FROM exam_attempts
  WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'sprint6.%@example.com')
);

-- 2. Xóa snapshots của các lượt thi test Sprint 6
DELETE FROM exam_attempt_snapshots
WHERE attempt_id IN (
  SELECT id FROM exam_attempts
  WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'sprint6.%@example.com')
);

-- 3. Xóa exam_attempts của các user test Sprint 6
DELETE FROM exam_attempts
WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'sprint6.%@example.com');

-- 4. Xóa liên kết câu hỏi và sections nếu có exam test
DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR6_%');
DELETE FROM exam_sections WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR6_%');
DELETE FROM exams WHERE title LIKE 'TEST_SPR6_%';

-- 5. Xóa câu hỏi và nhóm câu hỏi test
DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE content LIKE 'TEST_SPR6_%');
DELETE FROM questions WHERE content LIKE 'TEST_SPR6_%';
DELETE FROM question_groups WHERE title LIKE 'TEST_SPR6_%';

-- 6. Xóa người dùng test
DELETE FROM users WHERE email LIKE 'sprint6.%@example.com';
```
