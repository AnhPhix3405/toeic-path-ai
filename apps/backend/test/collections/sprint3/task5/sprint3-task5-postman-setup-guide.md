# Hướng dẫn Postman — Sprint 3 Task 5

Collection: `sprint3-task5-search-filter-pagination.postman_collection.json`.

## Phạm vi và điều kiện chạy

Collection kiểm thử toàn diện chức năng **Tìm kiếm, lọc và phân trang câu hỏi** (`GET /api/v1/questions`):
1. **Tìm kiếm:** Tìm kiếm full-text trong nội dung câu hỏi (`content`), hỗ trợ escape an toàn các ký tự wildcard SQL (`%` và `_`).
2. **Lọc danh mục:** Lọc theo TOEIC Part, Topic (OR logic), Skill (OR logic), độ khó (`difficulty`), trạng thái (`status`), loại câu hỏi (`questionType`).
3. **Array Query String:** Hỗ trợ cả định dạng phân tách bằng dấu phẩy (`topicIds=id1,id2`) và lặp key (`topicIds=id1&topicIds=id2`), xử lý chuỗi rỗng (`topicIds=`) an toàn.
4. **Phân trang:** Trả về cấu trúc paginated (`data[]`, `total`, `page`, `limit`, `totalPages`), kiểm tra page 1, page 2, out-of-range page (`page=999`).
5. **Validation:** Bắt lỗi tham số không hợp lệ (`page=0`, `limit=101`, `difficulty=invalid`, `partId=not-uuid`).
6. **Phân quyền:** Chặn truy cập unauthenticated (401) và Student (403), cho phép Teacher và Admin (200).

Chỉ chạy collection và cleanup SQL trên database `development` hoặc `test` cô lập. Không chạy cleanup trên production.

Trước khi import collection:

1. Khởi động PostgreSQL và backend (`pnpm start:dev`).
2. Chạy migration đầy đủ: `pnpm migration:run`.
3. Tạo hoặc seed một Admin phát triển, ví dụ bằng `pnpm seed:admin`.
4. Trong Collection Variables, cấu hình `adminEmail` và `adminPassword` khớp tài khoản Admin.

## Cách chạy

1. Import collection vào Postman.
2. Chạy tuần tự toàn bộ collection từ `00 - Setup` đến `99 - Cleanup`.
3. Không bỏ qua setup: Setup sẽ tạo tài khoản Teacher (`sprint3.task5.teacher@example.com`), Student (`sprint3.task5.student@example.com`), lấy danh mục Part/Topic/Skill động từ DB và seed 5 câu hỏi có metadata để test.
4. Nếu lần chạy trước dừng giữa chừng, dùng cleanup SQL bên dưới trước khi chạy lại.

## Cleanup SQL giới hạn cho development/test

Chỉ dùng SQL dưới đây trên database development/test nếu folder `99 - Cleanup` không chạy được:

```sql
BEGIN;

-- Xóa các câu hỏi test do Task 5 tạo
DELETE FROM questions
WHERE content LIKE '[S3T5]%';

-- Xóa các tài khoản test do Task 5 tạo
DELETE FROM users
WHERE email IN (
  'sprint3.task5.student@example.com',
  'sprint3.task5.teacher@example.com'
);

COMMIT;
```

`question_topics` và `question_skills` sẽ được xóa cascade tự động khi Question bị xóa. Không xóa dữ liệu trong `toeic_parts`, `topics` hoặc `skills` vì đây là danh mục dùng chung của hệ thống.
