# Hướng dẫn Kiểm Thử Tự Động Toàn Diện Sprint 4 (Postman & Newman CLI)

Collection: `sprint4-comprehensive-e2e.postman_collection.json`.

---

## 1. Mục Tiêu & Phạm Vi Nghiệm Thu

Tài liệu này hướng dẫn chi tiết quy trình khởi chạy Master Postman Automated Test Collection kiểm thử trọn vẹn vòng đời tích hợp của toàn bộ Sprint 4 theo đặc tả `BE-SPRINTS-WORKFLOW.md`:
1. **UC13 (Media Management):** Direct Upload qua Presigned URL (đơn lẻ & batch), xác thực kích thước và MIME type, ràng buộc trạng thái bảo vệ tài nguyên (BR13.4).
2. **UC14 (Question Bulk Import):** Tải template Excel 15 cột, phân nhánh đồng bộ (< 100 dòng) và bất đồng bộ ($\ge$ 100 dòng qua BullMQ queue), theo dõi tiến trình qua `import_jobs`.
3. **UC15 (Question Reviews & Maker-Checker):** Hàng đợi kiểm duyệt kèm eager context `questionGroup`, chặn tự duyệt bài của chính mình (Maker-Checker `ERR_CANNOT_SELF_REVIEW`), kiểm soát tranh chấp đồng thời bằng Optimistic Locking (`version` $\rightarrow$ 409 Conflict), cơ chế Admin Emergency Bypass có Audit Log `ADMIN_REVIEW_BYPASS`, và yêu cầu phản hồi bắt buộc khi yêu cầu chỉnh sửa.
4. **Tech Debt 006 & Rule #1002:** Ma trận kiểm tra tính hợp lệ của nội dung câu hỏi và options theo từng Part (Part 1/2 cho phép rỗng, Part 6 câu hỏi rỗng nhưng options bắt buộc có text, Part 3/4/5/7 bắt buộc text) và ràng buộc Single Choice Invariant (duy nhất 1 đáp án đúng).
5. **RBAC Perimeter Defenses:** Bảo vệ 4 vai trò (`Teacher Creator`, `Teacher Reviewer`, `Admin`, `Student`), xác thực `403 Forbidden` đối với mọi hành vi truy cập trái phép của học viên.

---

## 2. Chuẩn Bị Môi Trường Hạ Tầng (Rule #1001)

Theo chỉ thị **Rule #1001**, kiểm thử trực tiếp trên các container Docker hiện có trong file `docker-compose.yml`, tuyệt đối không tự ý tạo hoặc pull image mới.

### Bước 1: Khởi động container CSDL và Redis
```bash
docker compose up -d postgres redis
```
*Lưu ý:* Container PostgreSQL chạy cổng `5400:5432`, container Redis chạy cổng `6379:6379` với image `redis:8.6.2-alpine`.

### Bước 2: Dọn dẹp bộ đệm Rate Limit Redis (003-PMR #1)
Tránh đụng trần hạn mức Rate Limit khi Newman gửi chuỗi request liên tiếp:
```bash
docker exec -i toeic-path-ai-redis redis-cli FLUSHDB
```

### Bước 3: Khởi động Backend
```bash
pnpm --filter backend start:dev
```
Server chạy mặc định tại cổng `http://localhost:3000` với tiền tố API `/api/v1`.

---

## 3. Thực Thi Kiểm Thử Bằng Newman CLI (Rule #777)

Chạy bộ kiểm thử tự động với tiêu chí nghiệm thu **Rule #777: All Tests Pass (100% assertions passed)**:

```bash
npx newman run apps/backend/test/collections/sprint4/task5/sprint4-comprehensive-e2e.postman_collection.json \
  --env-var "baseUrl=http://localhost:3000/api/v1" \
  --env-var "teacher1Email=teacher1@example.com" \
  --env-var "teacher1Password=StrongPassword123!" \
  --env-var "teacher2Email=teacher2@example.com" \
  --env-var "teacher2Password=StrongPassword123!" \
  --env-var "adminEmail=admin@example.com" \
  --env-var "adminPassword=StrongPassword123!" \
  --env-var "studentEmail=student@example.com" \
  --env-var "studentPassword=StrongPassword123!"
```

---

## 4. Kịch Bản & Cấu Trúc Thư Mục Kiểm Thử

| Thư mục | Nội dung kiểm thử | Assertions & Mã HTTP kỳ vọng |
|---|---|---|
| `01 - Authentication & Tokens Setup` | Đăng nhập 4 vai trò, tự động gán Bearer Token vào collection variables | `200/201 OK`, lưu `teacher1Token`, `teacher2Token`, `adminToken`, `studentToken` |
| `02 - Media Direct Upload & Presigned URLs` | Xin presigned URL audio/image, batch 2 files, kiểm tra lỗi quá dung lượng | `201 Created` cho file hợp lệ; `400 Bad Request` cho file > 15MB audio |
| `03 - Question Import & Template Download` | Tải file Excel template 15 cột, tra cứu lịch sử import jobs | `200 OK`, header `spreadsheetml`, danh sách `data[]` |
| `04 - Review Queue & Eager Group Context` | Lấy hàng đợi kiểm duyệt, trích xuất `testQuestionId` và `testQuestionVersion` | `200 OK`, `total >= 0`, eager relations |
| `05 - Maker-Checker Defense` | Teacher 1 tự duyệt câu hỏi của chính mình biên soạn | `403 Forbidden` (`ERR_CANNOT_SELF_REVIEW`) |
| `06 - Optimistic Locking Concurrency Conflict` | Teacher 2 duyệt với version cũ (`version = 99999`) | `409 Conflict` (`ERR_CONCURRENCY_CONFLICT`) |
| `07 - Quick-Fix & Part Content Matrix` | Quick-fix Part 5 để trống text options, hoặc cung cấp 2 đáp án đúng | `400 Bad Request` (Vi phạm Rule 1002 hoặc Single Choice Invariant) |
| `08 - Revision Request & Rejection` | Gửi yêu cầu chỉnh sửa thiếu `feedback` | `400 Bad Request` (Bắt buộc feedback) |
| `09 - Admin Emergency Bypass` | Admin tự duyệt câu hỏi của chính mình với cờ `emergencyBypass: true` | `200 OK` (`published`), phát sinh sự kiện `ADMIN_REVIEW_BYPASS` |
| `10 - Student RBAC Defense` | Học viên gọi API media, import template, review queue, duyệt câu hỏi | Tất cả đều bị chặn `403 Forbidden` |

---

## 5. Dọn Dẹp Cơ Sở Dữ Liệu Sau Kiểm Thử (Isolated Cleanup) (003-PMR #2)

Chạy script SQL sau trên cơ sở dữ liệu `toeic_path_ai_db` để dọn dẹp các bản ghi thử nghiệm theo đúng thứ tự ràng buộc khóa ngoại:

```sql
-- 1. Xóa nhật ký thẩm định kiểm duyệt
DELETE FROM question_reviews WHERE reviewer_id IN (
  SELECT id FROM users WHERE email IN ('teacher1@example.com', 'teacher2@example.com', 'admin@example.com', 'student@example.com')
);

-- 2. Xóa lịch sử thay đổi snapshot câu hỏi
DELETE FROM question_histories WHERE changed_by IN (
  SELECT id FROM users WHERE email IN ('teacher1@example.com', 'teacher2@example.com', 'admin@example.com', 'student@example.com')
);

-- 3. Xóa các đáp án lựa chọn của câu hỏi test
DELETE FROM question_options WHERE question_id IN (
  SELECT id FROM questions WHERE content LIKE 'TEST_E2E_%' OR content LIKE '%test%'
);

-- 4. Xóa tài nguyên đa phương tiện test
DELETE FROM media_resources WHERE original_file_name LIKE '%test%' OR storage_key LIKE '%test%';

-- 5. Xóa câu hỏi test
DELETE FROM questions WHERE content LIKE 'TEST_E2E_%' OR content LIKE '%test%';

-- 6. Xóa nhóm câu hỏi test
DELETE FROM question_groups WHERE title LIKE 'TEST_E2E_%' OR title LIKE '%test%';

-- 7. Xóa nhật ký công việc import test
DELETE FROM import_jobs WHERE file_name LIKE '%test%';
```

---

## 6. Ghi Chú Tuân Thủ

- **Rule #888:** Không thực hiện bất kỳ lệnh `git commit` nào lên repository.
- **Rule #999:** Gợi ý commit message: `test(sprint4): add master postman collection and newman execution guide for sprint 4`.
