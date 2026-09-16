# Hướng dẫn chạy Postman — Sprint 3 Task 1

Collection kiểm thử CRUD câu hỏi:

```text
test/collections/sprint3/task1/sprint3-task1-questions.postman_collection.json
```

Chỉ chạy collection và các câu SQL cleanup trong hướng dẫn này trên database development/test. Không chạy trên production.

## 1. Chuẩn bị backend

Đảm bảo PostgreSQL đang chạy, `.env` đã được cấu hình và migration mới nhất đã được áp dụng:

```bash
pnpm migration:run
pnpm start
```

Collection dùng `http://localhost:3001/api/v1` làm `baseUrl` mặc định. Thay biến này nếu backend chạy ở port khác.

## 2. Chuẩn bị tài khoản Admin

Collection tự tạo hai tài khoản có định danh cố định:

- Student: `sprint3.task1.student@example.com`
- Teacher candidate: `sprint3.task1.teacher@example.com`
- Mật khẩu mặc định: `StrongPassword123!`

Do API đăng ký luôn tạo Student, setup cần một Admin hiện hữu để đổi role của teacher candidate. Sau khi import collection, điền hai collection variables sau:

- `adminEmail`
- `adminPassword`

Không lưu thông tin đăng nhập production trong collection. Tài khoản Admin không được collection tạo hoặc xóa.

## 3. Chạy collection

Chạy toàn bộ collection theo thứ tự bằng Collection Runner. Thư mục `00 - Setup` phải chạy đầu tiên vì nó:

1. Đăng ký Student và teacher candidate; HTTP `201` hoặc `409` đều hợp lệ.
2. Đăng nhập Student và Admin.
3. Tìm teacher candidate bằng email chính xác.
4. Gán role `teacher`.
5. Đăng nhập Teacher và lưu access token.

Các thư mục tiếp theo kiểm tra:

- Luồng `POST → GET list → GET detail → PATCH → DELETE`.
- Response không lộ `createdBy`, relation hoặc dữ liệu xác thực.
- Guest nhận `401`; Student nhận `403`; Teacher và Admin đều được read/create.
- Policy `Read-All, Edit-Own`, đặc biệt regression case `ADMIN + NOT OWNER = 403`.
- UUID, DTO, whitespace, enum và chống mass assignment.
- `404` cho question không tồn tại.

Collection dùng marker `[S3T1]` trong nội dung câu hỏi và tự xóa question của luồng thành công. Nếu runner dừng giữa chừng, dùng SQL cleanup bên dưới.

## 4. Cleanup dữ liệu test

Chỉ thực hiện trên database development/test. Kiểm tra đúng hai email cố định trước khi xóa:

```sql
SELECT id, email, role, status, created_at
FROM users
WHERE email IN (
  'sprint3.task1.student@example.com',
  'sprint3.task1.teacher@example.com'
);

SELECT q.id, q.content, q.created_by, q.created_at
FROM questions q
JOIN users u ON u.id = q.created_by
WHERE u.email = 'sprint3.task1.teacher@example.com'
  AND q.content LIKE '[S3T1]%';
```

Sau khi xác nhận kết quả chỉ chứa dữ liệu do collection tạo, chạy đúng thứ tự:

```sql
DELETE FROM questions
WHERE created_by = (
  SELECT id
  FROM users
  WHERE email = 'sprint3.task1.teacher@example.com'
)
AND content LIKE '[S3T1]%';

DELETE FROM users
WHERE email IN (
  'sprint3.task1.student@example.com',
  'sprint3.task1.teacher@example.com'
);
```

Các bản ghi `user_profiles`, `auth_sessions` và `password_reset_tokens` liên quan sẽ được xóa theo foreign key `ON DELETE CASCADE`. Nếu đã thay `studentEmail` hoặc `teacherEmail`, phải thay SQL bằng đúng giá trị đã dùng; không mở rộng điều kiện xóa.
