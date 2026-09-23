# Hướng dẫn Postman — Sprint 3 Task 4

Collection: `sprint3-task4-question-classification.postman_collection.json`.

## Phạm vi và điều kiện chạy

Collection kiểm thử catalog TOEIC Part, Topic, Skill; gán và thay thế classification; validation
reference; transaction atomic; và policy `Read-All, Edit-Own`. Teacher/Admin được đọc catalog và
classification của mọi Question, nhưng chỉ owner được cập nhật; Admin không bypass ownership.

Chỉ chạy collection và cleanup SQL trên database `development` hoặc `test` cô lập. Không chạy
cleanup trên production.

Trước khi import collection:

1. Khởi động PostgreSQL và backend.
2. Chạy `pnpm migration:run` để áp dụng `AddQuestionClassification1788000012000` và seed baseline.
3. Tạo hoặc seed một Admin phát triển, ví dụ bằng `pnpm seed:admin`.
4. Trong Collection Variables, đặt `adminEmail` và `adminPassword` khớp Admin đó. Không lưu
   credential thật vào file collection.

## Cách chạy

1. Import collection vào Postman.
2. Chạy tuần tự toàn bộ collection, bắt đầu từ `00 - Setup` và kết thúc bằng `99 - Cleanup`.
3. Không bỏ qua setup. Collection đăng ký Student và Teacher candidate với email `sprint3.task4.*`,
   dùng Admin nâng role Teacher, lấy token, đọc catalog và lưu UUID động theo tên. Collection không
   phụ thuộc UUID seed cố định.
4. Setup xác nhận baseline gồm 7 Parts, 6 Topics và 6 Skills, sau đó tạo một Question thuộc Teacher
   và một Question thuộc Admin.
5. Các test chính kiểm tra nhiều Topic/Skill, replace semantics, response detail/list, đọc chéo,
   Edit-Own, Student/guest, duplicate IDs, reference không tồn tại, difficulty sai, UUID sai và
   rollback toàn bộ classification khi một Skill không hợp lệ.
6. Nếu lần chạy trước dừng giữa chừng, dùng cleanup SQL bên dưới trước khi chạy lại.

## Cleanup SQL giới hạn cho development/test

Chỉ dùng SQL dưới đây trên database development/test nếu folder `99 - Cleanup` không chạy được.
Các điều kiện chỉ nhắm đúng nội dung và email cố định do collection Task 4 tạo; không xóa catalog
seed hoặc Admin được cấu hình qua `adminEmail`.

```sql
BEGIN;

DELETE FROM questions
WHERE content IN (
  '[S3T4] The manager _____ the report yesterday.',
  '[S3T4] Admin owned classification question.'
);

DELETE FROM users
WHERE email IN (
  'sprint3.task4.student@example.com',
  'sprint3.task4.teacher@example.com'
);

COMMIT;
```

`question_topics` và `question_skills` được xóa cascade khi Question bị xóa. Không xóa dữ liệu
trong `toeic_parts`, `topics` hoặc `skills` vì đó là reference data dùng chung của hệ thống.
