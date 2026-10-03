# Hướng dẫn Postman — Sprint 4 Task 2

Collection: `sprint4-task2-media-presigned-url.postman_collection.json`.

## Phạm vi và điều kiện chạy

Collection kiểm thử toàn diện chức năng **Quản lý tài nguyên đa phương tiện & Presigned URL** (`/api/v1/media/*`):

1. **Direct Upload qua Presigned URL:**
   - Tạo Presigned URL cho tệp đơn lẻ (Audio MP3/WAV $\le$ 15MB, Image PNG/JPEG/WEBP $\le$ 5MB).
   - Tạo Presigned URL hàng loạt theo Batch (1 đến 10 tệp).
   - Kiểm tra định dạng `storageKey`: `questions/{resourceType}/{userId}/{uuid}.{ext}`.
2. **Xác thực Storage & Confirm Upload:**
   - Mô phỏng tải trực tiếp qua HTTP PUT tới URL Cloud Storage (Supabase Storage).
   - Endpoint `/media/confirm` xác thực sự tồn tại thực tế và kích thước tệp trên Cloud Storage.
   - Kiểm tra quyền sở hữu `storageKey` (ngăn chặn hành vi giả mạo ID người dùng khác).
   - Kiểm tra ràng buộc Check Constraint mục tiêu độc quyền (`questionId` XOR `questionGroupId`).
3. **Tra cứu & Cập nhật liên kết (Retrieval & Association):**
   - Lấy chi tiết tài nguyên media theo ID (`GET /media/:id`).
   - Lấy danh sách tài nguyên gắn với câu hỏi (`GET /media/question/:questionId`).
   - Lấy danh sách tài nguyên gắn với nhóm câu hỏi (`GET /media/group/:groupId`).
   - Cập nhật mục tiêu liên kết (`PATCH /media/:id/target`).
4. **Xóa mềm (Soft Delete) & Loại trừ (Exclusion):**
   - Xóa tài nguyên (`DELETE /media/:id`) trả về `204 No Content`.
   - Xác nhận tài nguyên đã xóa mềm không còn truy xuất được qua `GET /media/:id` (404) và bị loại khỏi danh sách câu hỏi.
5. **Validation & Phân quyền RBAC:**
   - Bắt lỗi khi dung lượng Audio > 15MB hoặc Image > 5MB.
   - Bắt lỗi MIME type không được hỗ trợ (`video/mp4`, v.v.).
   - Bắt lỗi Batch vượt quá 10 tệp hoặc rỗng.
   - Chặn truy cập không có token (`401 Unauthorized`).
   - Chặn vai trò Student (`403 Forbidden`) đối với tất cả các thao tác quản lý tài nguyên.

> [!WARNING]
> Chỉ chạy collection và cleanup SQL trên database `development` hoặc `test` cô lập. Không chạy cleanup trên production.

---

## Chuẩn bị trước khi chạy

1. Khởi động PostgreSQL và Backend:
   ```bash
   pnpm --filter backend start:dev
   ```
2. Đảm bảo migration đã được thực thi:
   ```bash
   pnpm --filter backend migration:run
   ```
3. Khởi tạo tài khoản Admin phát triển (nếu chưa có):
   ```bash
   pnpm --filter backend seed:admin
   ```
4. Cấu hình biến môi trường trong Postman Collection Variables:
   - `adminEmail`: Email của tài khoản Admin (ví dụ: `admin@example.com`).
   - `adminPassword`: Mật khẩu của tài khoản Admin.

---

## Cách chạy

1. Import file `sprint4-task2-media-presigned-url.postman_collection.json` vào Postman.
2. Mở Collection Runner và chọn chạy tuần tự toàn bộ folder từ `00 - Setup` đến `99 - Cleanup`.
3. **Lưu ý:**
   - Folder `00 - Setup` sẽ tự động đăng ký tài khoản Teacher (`sprint4.task2.teacher@example.com`), Student (`sprint4.task2.student@example.com`), nâng quyền Teacher, đăng nhập lấy JWT tokens, và tạo 2 Question mẫu + 1 Question Group mẫu.
   - Folder `02 - Direct Upload Simulation` sẽ gửi trực tiếp request `PUT` lên Cloud Storage qua `uploadUrl` được sinh ra ở folder `01`, sau đó mới gọi `/media/confirm`.

---

## Cleanup SQL giới hạn cho development/test

Nếu quá trình chạy Postman bị dừng giữa chừng hoặc folder `99 - Cleanup` chưa hoàn tất, sử dụng đoạn SQL an toàn dưới đây trong môi trường dev/test:

```sql
BEGIN;

-- 1. Xóa các bản ghi media test do Task 2 tạo
DELETE FROM media_resources
WHERE file_name LIKE '%toeic-part3%'
   OR file_name LIKE '%batch-%'
   OR file_name LIKE '%unowned%'
   OR file_name LIKE '%dummy%';

-- 2. Xóa các nhóm câu hỏi test do Task 2 tạo
DELETE FROM question_groups
WHERE title LIKE '[S4T2]%';

-- 3. Xóa các câu hỏi test do Task 2 tạo
DELETE FROM questions
WHERE content LIKE '[S4T2]%';

-- 4. Xóa các tài khoản test do Task 2 tạo
DELETE FROM users
WHERE email IN (
  'sprint4.task2.student@example.com',
  'sprint4.task2.teacher@example.com'
);

COMMIT;
```

> [!NOTE]
> Đoạn SQL trên chỉ xóa các bản ghi có tiền tố `[S4T2]` hoặc email test tương ứng, không ảnh hưởng đến dữ liệu seed hệ thống (`toeic_parts`, `topics`, `skills`).
