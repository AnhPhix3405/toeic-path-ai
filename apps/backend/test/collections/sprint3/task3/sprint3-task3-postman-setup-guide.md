# Hướng dẫn Postman — Sprint 3 Task 3

Collection: `sprint3-task3-question-options.postman_collection.json`.

## Phạm vi và điều kiện chạy

Collection kiểm thử `explanation`, CRUD option có thứ tự, label tự sinh, một đáp án đúng duy nhất và policy `Read-All, Edit-Own`. Teacher/Admin được đọc Question của nhau, nhưng chỉ owner được sửa option; Admin không bypass ownership.

Chỉ chạy collection và cleanup SQL trên database `development` hoặc `test` cô lập. Không chạy cleanup trên production.

Trước khi import collection:

1. Khởi động PostgreSQL và backend.
2. Chạy `pnpm migration:run` để áp dụng migration `AddQuestionOptions1788000011000`.
3. Tạo hoặc seed một Admin phát triển, ví dụ bằng `pnpm seed:admin`.
4. Trong Collection Variables, đặt `adminEmail` và `adminPassword` khớp Admin đó. Không lưu credential thật vào file collection.

## Cách chạy

1. Import collection vào Postman.
2. Chạy tuần tự toàn bộ collection, bắt đầu từ `00 - Setup`.
3. Không bỏ qua setup. Collection tạo các tài khoản có email `sprint3.task3.*`, dùng Admin nâng Teacher candidate lên role `teacher`, rồi tạo Question thuộc Teacher và Admin.
4. Các test chính kiểm tra option trong cả detail và Question Bank list, option `A`, `B`, `C`, label `AA` ở position `27`, trim content/explanation, sắp xếp theo position, chuyển đáp án đúng, position trùng (`409`), dữ liệu sai (`400`), option không tồn tại (`404`), role (`403`) và ownership (`403`).
5. Chạy `99 - Cleanup` sau khi hoàn tất. Khi Question bị xóa, các dòng `question_options` liên quan được xóa cascade.

Collection chấp nhận `409` khi đăng ký lại tài khoản để có thể chạy lại setup, nhưng dữ liệu Question của lần chạy bị ngắt nên được cleanup trước khi chạy lại.

## Cleanup SQL giới hạn cho development/test

Chỉ dùng SQL dưới đây trên database development/test nếu folder `99 - Cleanup` không chạy được. Điều kiện xóa dùng đúng email và nội dung cố định của collection, không dùng wildcard rộng.

```sql
BEGIN;

DELETE FROM question_options
WHERE question_id IN (
  SELECT id
  FROM questions
  WHERE content IN (
    '[S3T3] The report was ___ yesterday.',
    '[S3T3] Admin owned question'
  )
);

DELETE FROM questions
WHERE content IN (
  '[S3T3] The report was ___ yesterday.',
  '[S3T3] Admin owned question'
);

DELETE FROM users
WHERE email IN (
  'sprint3.task3.student@example.com',
  'sprint3.task3.teacher@example.com'
);

COMMIT;
```

Không xóa Admin được cấu hình qua `adminEmail`; tài khoản đó thuộc môi trường, không phải dữ liệu do collection tạo.
