# Hướng dẫn Postman — Sprint 3 Task 2

Collection: `sprint3-task2-question-groups.postman_collection.json`.

## Phạm vi và điều kiện chạy

Collection kiểm thử QuestionGroup, câu hỏi độc lập, gắn/gỡ Question, thứ tự trong nhóm và quyền `Read-All, Edit-Own`. Chỉ chạy trên database `development` hoặc `test` cô lập. Không chạy cleanup SQL trên production.

Trước khi import collection:

1. Khởi động PostgreSQL và backend.
2. Chạy `pnpm migration:run` để có migration `CreateQuestionGroups1788000010000`.
3. Tạo hoặc seed một tài khoản Admin phát triển, ví dụ qua `pnpm seed:admin`.
4. Trong Collection Variables, đặt `adminEmail` và `adminPassword` khớp Admin đó. Không lưu credential thật vào collection.

## Cách chạy

1. Import collection vào Postman.
2. Chạy tuần tự toàn bộ collection, bắt đầu tại `00 - Setup`.
3. Không bỏ qua các request setup: collection tự đăng ký Student/Teacher có email định danh `sprint3.task2.*`, sau đó dùng Admin nâng Teacher candidate lên role `teacher`.
4. Chạy `99 - Cleanup` sau khi hoàn tất để xóa chính xác Question/QuestionGroup test tạo ra.

Các request kiểm tra bao gồm create/read/update/delete group, attach/detach Question, thứ tự trùng (`409`), Student bị chặn (`403`), đọc chéo resource và ownership không bị Admin bypass.

## Cleanup SQL giới hạn cho development/test

Chỉ dùng các câu lệnh dưới đây cho database development/test nếu Postman cleanup không chạy được. Các định danh email và prefix được giới hạn đúng dữ liệu collection tạo.

```sql
BEGIN;

DELETE FROM questions
WHERE content LIKE '[S3T2]%';

DELETE FROM question_groups
WHERE title LIKE '[S3T2]%';

DELETE FROM users
WHERE email IN (
  'sprint3.task2.student@example.com',
  'sprint3.task2.teacher@example.com'
);

COMMIT;
```

Không xóa Admin cấu hình trong `adminEmail`; tài khoản đó là dữ liệu môi trường, không phải dữ liệu do collection tạo.
