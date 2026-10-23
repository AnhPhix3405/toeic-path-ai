# Hướng Dẫn Thiết Lập & Chạy Kiểm Thử Tự Động Sprint 5 (Newman CLI)

Tài liệu này cung cấp quy trình chuẩn hóa để chạy bộ kiểm thử tự động toàn diện **Sprint 5 Master Postman Collection** (`sprint5-comprehensive-e2e.postman_collection.json`) kiểm chứng toàn bộ 4 Use Cases:
- **UC16:** Quản lý & Khởi tạo cấu hình đề thi (Full Test, Placement Test, Mini Test, Auto-seeding 7 Sections).
- **UC17:** Thiết lập cấu trúc đề & Tuyển chọn câu hỏi (Sections, Single/Group questions, Reorder deferrable, Auto-generation A4).
- **UC18:** Thẩm định xuất bản & Vòng đời đề thi (Checklist Validator, Publish, Unpublish Guard, Scheduled, Close, Archive).
- **UC19:** Tra cứu danh mục đề thi công khai & Quản trị (Zero Answer Leakage, Hard-limit 50, Optional Auth).

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

1. **Hạ tầng Docker Compose (Rule #1001):**
   Đảm bảo 2 containers CSDL và Cache đang hoạt động:
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

## 2. Bước Chuẩn Bị: Phòng Chống Rate Limit & Dọn Dẹp Cache (Rule 015-PMR #2)

Trước khi chạy Newman, xóa sạch bộ đếm rate limiting trong Redis để không đụng trần giới hạn `examsMutate` (30 requests/60s):

```bash
docker exec toeic-path-ai-redis redis-cli --eval "return redis.call('del', unpack(redis.call('keys', 'throttler:*')))" , 0
```

---

## 3. Lệnh Thực Thi Kiểm Thử Tự Động (One-Touch Execution)

Do collection đã tích hợp sẵn **Folder 00 — Authentication & Environment Setup**, Newman sẽ tự động lấy Token cho cả 3 vai trò (Teacher, Admin, Student) mà không cần cấu hình file environment bên ngoài:

```bash
newman run apps/backend/test/collections/sprint5/task6/sprint5-comprehensive-e2e.postman_collection.json \
  --reporters cli \
  --bail
```

> **Ghi chú tiêu chí nghiệm thu (Rule #777):** 100% assertions phải PASS (0 failures).

---

## 4. Script Dọn Dẹp CSDL Sau Khi Kiểm Thử (SQL Cleanup)

Để đảm bảo tính cô lập và không để lại dữ liệu rác làm sai lệch các đợt kiểm thử tiếp theo, thực thi script dọn dẹp theo đúng thứ tự 7 tầng khóa ngoại:

```sql
-- Dọn dẹp liên kết đề thi Sprint 5
DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_E2E_%');
DELETE FROM exam_sections WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_E2E_%');
DELETE FROM exams WHERE title LIKE 'TEST_E2E_%';

-- Dọn dẹp câu hỏi/media test sinh ra trong quá trình chạy E2E (nếu có)
DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE content LIKE 'TEST_E2E_%');
DELETE FROM media_resources WHERE file_name LIKE 'TEST_E2E_%';
DELETE FROM questions WHERE content LIKE 'TEST_E2E_%';
DELETE FROM question_groups WHERE title LIKE 'TEST_E2E_%';
```

Thực thi nhanh bằng Docker CLI:
```bash
docker exec -i toeic-path-ai-postgres psql -U admin -d toeic_path_ai_db -c "
DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_E2E_%');
DELETE FROM exam_sections WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_E2E_%');
DELETE FROM exams WHERE title LIKE 'TEST_E2E_%';
DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE content LIKE 'TEST_E2E_%');
DELETE FROM media_resources WHERE file_name LIKE 'TEST_E2E_%';
DELETE FROM questions WHERE content LIKE 'TEST_E2E_%';
DELETE FROM question_groups WHERE title LIKE 'TEST_E2E_%';
"
```
