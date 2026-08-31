# Task 6 - Kịch bản kiểm thử đăng ký trên Swagger

## 1. Mục đích

Tài liệu này hướng dẫn kiểm thử thủ công endpoint:

```http
POST /api/v1/auth/register
```

Các nội dung cần xác nhận:

- Đăng ký luôn tạo tài khoản Student ở trạng thái Active.
- Email và họ tên được chuẩn hóa.
- Mật khẩu xác nhận và việc đồng ý điều khoản được kiểm tra.
- Một `users` và một `user_profiles` được tạo trong cùng transaction.
- Client không thể tự truyền `role` hoặc `status`.
- Email trùng trả về HTTP 409.
- Response không làm lộ dữ liệu nhạy cảm.
- Tài khoản mới có thể đăng nhập.

## 2. Chuẩn bị môi trường

Trong thư mục `apps/backend`, bảo đảm `.env` có:

```env
TERMS_VERSION=2026-08-31
```

Chạy migration và backend:

```powershell
pnpm migration:run
pnpm start:dev
```

Mở Swagger:

```text
http://localhost:3001/api/docs
```

Nếu backend dùng port khác, thay `3001` bằng giá trị `PORT` trong `.env`.

### Cách chạy câu SQL kiểm tra

Nếu PostgreSQL đang chạy bằng Docker Compose của repository, chạy từ thư mục gốc repository:

```powershell
docker compose exec postgres psql -U admin -d toeic_path_ai_db
```

Sau đó dán các câu SQL trong từng test case. Kết thúc bằng:

```sql
\q
```

Cũng có thể chạy một câu SQL trực tiếp:

```powershell
docker compose exec postgres psql -U admin -d toeic_path_ai_db -c "SELECT email, role, status FROM users ORDER BY created_at DESC LIMIT 5;"
```

Không sử dụng database production cho kịch bản này.

## 3. Request hợp lệ chuẩn

Mỗi lần chạy lại toàn bộ kịch bản, đổi số trong email để tránh dữ liệu của lần chạy trước, ví dụ `swagger.task6.001@example.com`.

```json
{
  "fullName": "Nguyen Van A",
  "email": "swagger.task6.001@example.com",
  "password": "StrongPassword123!",
  "confirmPassword": "StrongPassword123!",
  "acceptTerms": true
}
```

## 4. Các test case

### TC01 - Đăng ký thành công và tạo profile

Thực hiện trên Swagger:

1. Mở `POST /api/v1/auth/register`.
2. Chọn **Try it out**.
3. Gửi request hợp lệ chuẩn.

Kết quả mong đợi:

- HTTP `201 Created`.
- Response có `id`, `email`, `role`, `status`, `profile`, `createdAt`.
- `role` bằng `student`.
- `status` bằng `active`.
- `profile.fullName` bằng `Nguyen Van A`.
- `profile.avatarUrl` và `profile.bio` bằng `null`.

Kiểm tra database:

```sql
SELECT
  u.id,
  u.email,
  u.role,
  u.status,
  u.terms_accepted_at,
  u.terms_version,
  p.user_id,
  p.full_name,
  p.avatar_url,
  p.bio
FROM users u
JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'swagger.task6.001@example.com';
```

Mong đợi đúng một dòng; `p.user_id = u.id`, thông tin điều khoản không null, `avatar_url` và `bio` là null.

### TC02 - Trim họ tên và normalize email

Request:

```json
{
  "fullName": "   Nguyen Van B   ",
  "email": "   Swagger.Task6.002@Example.COM   ",
  "password": "StrongPassword123!",
  "confirmPassword": "StrongPassword123!",
  "acceptTerms": true
}
```

Kết quả mong đợi:

- HTTP `201`.
- Response có email `swagger.task6.002@example.com`.
- `profile.fullName` bằng `Nguyen Van B`, không có khoảng trắng ở hai đầu.

Kiểm tra database:

```sql
SELECT u.email, p.full_name
FROM users u
JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'swagger.task6.002@example.com';
```

### TC03 - Email không hợp lệ

Request: dùng request chuẩn nhưng đổi email thành:

```json
"email": "not-an-email"
```

Mong đợi HTTP `400 Bad Request`; database không có tài khoản `not-an-email`.

```sql
SELECT COUNT(*) FROM users WHERE email = 'not-an-email';
```

Mong đợi `0`.

### TC04 - Mật khẩu yếu

Đổi cả hai trường mật khẩu thành `password`.

Mong đợi HTTP `400`; thông báo validation cho biết mật khẩu phải dài 12-72 ký tự và có chữ hoa, chữ thường, số, ký tự đặc biệt.

### TC05 - Xác nhận mật khẩu không khớp

```json
{
  "fullName": "Password Mismatch",
  "email": "swagger.task6.005@example.com",
  "password": "StrongPassword123!",
  "confirmPassword": "DifferentPassword123!",
  "acceptTerms": true
}
```

Mong đợi HTTP `400`, có lỗi `confirmPassword must match password`.

```sql
SELECT COUNT(*) FROM users WHERE email = 'swagger.task6.005@example.com';
```

Mong đợi `0`.

### TC06 - Không đồng ý điều khoản

Gửi request hợp lệ với:

```json
"acceptTerms": false
```

Mong đợi HTTP `400`, có lỗi `acceptTerms must be true`; không tạo user/profile.

### TC07 - Thiếu họ tên

Xóa hoàn toàn trường `fullName` khỏi request.

Mong đợi HTTP `400`; không tạo tài khoản.

Kiểm tra thêm trường hợp chỉ có khoảng trắng:

```json
"fullName": "   "
```

Kết quả cũng phải là HTTP `400`.

### TC08 - Client cố gán quyền Admin

Thêm vào request hợp lệ:

```json
"role": "admin"
```

Mong đợi HTTP `400` vì global validation bật `forbidNonWhitelisted`; không tạo tài khoản.

```sql
SELECT COUNT(*)
FROM users
WHERE email = 'swagger.task6.008@example.com';
```

Mong đợi `0`.

### TC09 - Client cố gán status

Thêm vào request hợp lệ:

```json
"status": "locked"
```

Mong đợi HTTP `400`; không tạo tài khoản.

### TC10 - Email trùng chính xác

1. Đăng ký `swagger.task6.010@example.com` lần đầu, mong đợi HTTP `201`.
2. Gửi lại chính request đó, mong đợi HTTP `409 Conflict`.

Kiểm tra database:

```sql
SELECT
  COUNT(DISTINCT u.id) AS user_count,
  COUNT(p.id) AS profile_count
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'swagger.task6.010@example.com';
```

Mong đợi `user_count = 1` và `profile_count = 1`.

### TC11 - Email trùng khác chữ hoa/thường và khoảng trắng

1. Đăng ký thành công email `swagger.task6.011@example.com`.
2. Đăng ký lần nữa với email:

```json
"email": "  Swagger.Task6.011@Example.COM  "
```

Mong đợi lần thứ hai trả HTTP `409`; database vẫn chỉ có một user và một profile.

```sql
SELECT u.email, COUNT(p.id) AS profile_count
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'swagger.task6.011@example.com'
GROUP BY u.email;
```

### TC12 - Response không chứa dữ liệu nhạy cảm

Đăng ký bằng một email mới và xem response body.

Mong đợi response không chứa bất kỳ trường nào sau đây:

```text
password
passwordHash
refreshToken
refreshTokenHash
termsAcceptedAt
termsVersion
emailVerifiedAt
lastLoginAt
```

Kiểm tra mật khẩu trong database là hash, không phải plain text:

```sql
SELECT
  email,
  password_hash,
  password_hash <> 'StrongPassword123!' AS is_hashed
FROM users
WHERE email = 'swagger.task6.012@example.com';
```

Mong đợi `is_hashed = true`; hash bcrypt thường bắt đầu bằng `$2`.

### TC13 - Mỗi user chỉ có tối đa một profile

Sau khi đăng ký thành công, kiểm tra constraint:

```sql
SELECT user_id, COUNT(*) AS profile_count
FROM user_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;
```

Mong đợi không có dòng nào.

Kiểm tra user đăng ký qua public API nhưng thiếu profile:

```sql
SELECT u.id, u.email
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.role = 'student'
  AND u.terms_accepted_at IS NOT NULL
  AND p.id IS NULL;
```

Mong đợi không có dòng nào đối với dữ liệu tạo trong các test case này.

### TC14 - Đăng nhập bằng tài khoản vừa tạo

Sau TC01, mở `POST /api/v1/auth/login` và gửi:

```json
{
  "email": "swagger.task6.001@example.com",
  "password": "StrongPassword123!"
}
```

Mong đợi:

- HTTP `200 OK`.
- Response có `user`, `accessToken`, `accessTokenExpiresIn`.
- `user.role = student`, `user.status = active`.
- Header `Set-Cookie` có refresh cookie HTTP-only nếu Swagger hiển thị response headers.

## 5. Trường hợp transaction rollback khi lưu profile lỗi

Không thể tạo lỗi lưu profile một cách an toàn chỉ bằng request Swagger vì DTO đã chặn dữ liệu sai trước khi transaction chạy. Không nên drop table, xóa constraint hoặc sửa schema để mô phỏng lỗi này.

Hành vi rollback được kiểm tra bằng unit test sử dụng transaction manager:

```powershell
pnpm test
```

Sau các lượt kiểm thử Swagger, có thể dùng câu SQL sau để phát hiện dữ liệu mồ côi:

```sql
SELECT u.id, u.email
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.email LIKE 'swagger.task6.%@example.com'
  AND p.id IS NULL;
```

Mong đợi không có dòng nào.

## 6. Kiểm tra tổng hợp cuối cùng

```sql
SELECT
  u.id,
  u.email,
  u.role,
  u.status,
  u.terms_accepted_at,
  u.terms_version,
  p.user_id,
  p.full_name,
  p.avatar_url,
  p.bio
FROM users u
JOIN user_profiles p ON p.user_id = u.id
WHERE u.email LIKE 'swagger.task6.%@example.com'
ORDER BY u.created_at;
```

Tất cả bản ghi đăng ký thành công phải có:

- Email viết thường và không có khoảng trắng hai đầu.
- `role = student`.
- `status = active`.
- `terms_accepted_at` và `terms_version` có giá trị.
- Đúng một profile liên kết với user.
- `full_name` đã trim; `avatar_url` và `bio` là null.

## 7. Dọn dữ liệu test tùy chọn

Chỉ chạy trên database development/test sau khi xác nhận đúng database:

```sql
SELECT current_database();
```

Sau đó có thể xóa dữ liệu của riêng kịch bản này:

```sql
DELETE FROM users
WHERE email LIKE 'swagger.task6.%@example.com';
```

Các profile liên quan sẽ tự xóa nhờ foreign key `ON DELETE CASCADE`.
