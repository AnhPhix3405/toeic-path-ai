# Task 7 - Kịch bản kiểm thử quên và đặt lại mật khẩu trên Swagger

## 1. Mục đích

Tài liệu này hướng dẫn kiểm thử thủ công hai endpoint:

```http
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Các nội dung cần xác nhận:

- Không thể suy ra email có tồn tại từ response quên mật khẩu.
- Email được trim và chuyển thành chữ thường.
- Database chỉ lưu SHA-256 hash, không lưu raw reset token.
- Token có hạn sử dụng, dùng một lần và token cũ bị revoke.
- Đặt lại mật khẩu cập nhật password hash và revoke toàn bộ auth session.
- Mật khẩu cũ, refresh token cũ và reset token đã dùng không thể sử dụng lại.
- Reset thành công xóa refresh cookie ở trình duyệt.
- Response và log không làm lộ token hoặc mật khẩu.

Chỉ thực hiện các câu SQL thay đổi dữ liệu trong tài liệu này trên database development/test.

## 2. Chuẩn bị môi trường

Từ thư mục gốc repository, kiểm tra PostgreSQL:

```powershell
docker compose ps
```

Từ `apps/backend`, chạy migration và backend:

```powershell
pnpm migration:run
pnpm start:dev
```

Mở Swagger:

```text
http://localhost:3001/api/docs
```

Nếu backend dùng port khác, thay `3001` bằng giá trị `PORT` trong `.env`.

Mở `psql` trong một terminal khác:

```powershell
docker compose exec postgres psql -U admin -d toeic_path_ai_db
```

Kết thúc `psql` bằng `\q`.

### Giới hạn của development mail adapter

`ConsoleMailAdapter` hiện chỉ xác nhận email đã được tiếp nhận và cố ý không log reset URL/raw token. Vì vậy có thể kiểm tra việc tạo và revoke token qua Swagger + SQL, nhưng không thể lấy raw token do endpoint `forgot-password` vừa sinh để gọi `reset-password`.

Để kiểm thử reset thành công, mục 5 cung cấp một raw token dành riêng cho test và câu SQL lưu đúng SHA-256 hash của token đó. Không sửa API để trả token và không log token nhằm phục vụ test.

## 3. Tạo tài khoản và phiên test

Trong Swagger, gọi `POST /api/v1/auth/register`:

```json
{
  "fullName": "Swagger Task 7",
  "email": "swagger.task7.001@example.com",
  "password": "OldPassword123!",
  "confirmPassword": "OldPassword123!",
  "acceptTerms": true
}
```

Mong đợi HTTP `201 Created`. Nếu email đã tồn tại từ lần test trước, dùng email có số khác hoặc dọn riêng dữ liệu test sau khi xác nhận đúng database.

Gọi `POST /api/v1/auth/login`:

```json
{
  "email": "swagger.task7.001@example.com",
  "password": "OldPassword123!"
}
```

Mong đợi HTTP `200`, có access token và response header `Set-Cookie`. Giữ tab Swagger này để kiểm tra refresh cookie cũ sau khi reset.

Kiểm tra đã có session:

```sql
SELECT s.id, s.user_id, s.revoked_at, s.expires_at
FROM auth_sessions s
JOIN users u ON u.id = s.user_id
WHERE u.email = 'swagger.task7.001@example.com'
ORDER BY s.created_at DESC;
```

Mong đợi có ít nhất một dòng với `revoked_at IS NULL`.

## 4. Kiểm thử forgot-password

### TC01 - Email tồn tại

Gọi `POST /api/v1/auth/forgot-password`:

```json
{
  "email": "swagger.task7.001@example.com"
}
```

Mong đợi HTTP `200` và đúng response chung:

```json
{
  "message": "If the email is registered, reset instructions will be sent."
}
```

Kiểm tra database:

```sql
SELECT
  prt.id,
  length(prt.token_hash) AS hash_length,
  prt.expires_at > now() AS is_unexpired,
  prt.used_at,
  prt.revoked_at,
  prt.created_at
FROM password_reset_tokens prt
JOIN users u ON u.id = prt.user_id
WHERE u.email = 'swagger.task7.001@example.com'
ORDER BY prt.created_at DESC;
```

Mong đợi token mới nhất có `hash_length = 64`, `is_unexpired = true`, `used_at` và `revoked_at` bằng null. Database không có cột chứa raw token hoặc reset URL.

### TC02 - Email không tồn tại không bị lộ

Request:

```json
{
  "email": "swagger.task7.missing@example.com"
}
```

Mong đợi HTTP `200` và body giống hoàn toàn TC01.

```sql
SELECT COUNT(*)
FROM password_reset_tokens prt
JOIN users u ON u.id = prt.user_id
WHERE u.email = 'swagger.task7.missing@example.com';
```

Mong đợi `0`.

### TC03 - Normalize email

Request:

```json
{
  "email": "  Swagger.Task7.001@Example.COM  "
}
```

Mong đợi HTTP `200` và user của TC01 có thêm một token. Token active trước đó phải bị revoke.

```sql
SELECT 
    prt.created_at, 
    prt.used_at, 
    prt.revoked_at
FROM password_reset_tokens prt
JOIN users u ON u.id = prt.user_id
WHERE u.email = 'swagger.task7.001@example.com'
ORDER BY prt.created_at DESC;
```

Mong đợi chỉ token mới nhất còn `used_at IS NULL AND revoked_at IS NULL`; token active cũ có `revoked_at IS NOT NULL`.

Kiểm tra invariant tổng quát:

```sql
SELECT user_id, COUNT(*) AS active_token_count
FROM password_reset_tokens
WHERE used_at IS NULL
  AND revoked_at IS NULL
  AND expires_at > now()
GROUP BY user_id
HAVING COUNT(*) > 1;
```

Mong đợi không có dòng nào.

### TC04 - Email sai định dạng và field thừa

Lần lượt thử:

```json
{
  "email": "not-an-email"
}
```

```json
{
  "email": "swagger.task7.001@example.com",
  "redirectUrl": "https://attacker.example/reset"
}
```

Mong đợi cả hai trả HTTP `400 Bad Request`. `redirectUrl` bị từ chối do global validation không cho field ngoài DTO.

## 5. Chuẩn bị raw token test đã biết

Raw token chỉ dùng cho tài liệu này:

```text
swagger-task7-reset-token-001-long-safe-demo
```

SHA-256 tương ứng:

```text
4165f456bd65bc90ddff7c116e637d759f7632442e952717a82059dac63c0590
```

Trong `psql`, revoke token active hiện tại rồi tạo token test:

```sql
BEGIN;

UPDATE password_reset_tokens
SET revoked_at = now()
WHERE user_id = (
  SELECT id FROM users WHERE email = 'swagger.task7.001@example.com'
)
  AND used_at IS NULL
  AND revoked_at IS NULL;

INSERT INTO password_reset_tokens (
  user_id,
  token_hash,
  expires_at,
  used_at,
  revoked_at
)
SELECT
  id,
  '4165f456bd65bc90ddff7c116e637d759f7632442e952717a82059dac63c0590',
  now() + interval '30 minutes',
  NULL,
  NULL
FROM users
WHERE email = 'swagger.task7.001@example.com'
ON CONFLICT (token_hash) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  expires_at = EXCLUDED.expires_at,
  used_at = NULL,
  revoked_at = NULL;

COMMIT;
```

Xác nhận đúng một token test active:

```sql
SELECT token_hash, expires_at, used_at, revoked_at
FROM password_reset_tokens
WHERE token_hash = '4165f456bd65bc90ddff7c116e637d759f7632442e952717a82059dac63c0590';
```

## 6. Kiểm thử reset-password

### TC05 - Reset thành công

Gọi `POST /api/v1/auth/reset-password`:

```json
{
  "token": "swagger-task7-reset-token-001-long-safe-demo",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

Mong đợi HTTP `200`:

```json
{
  "message": "Password has been reset successfully. Please sign in again."
}
```

Kiểm tra response header có `Set-Cookie` xóa refresh cookie (giá trị rỗng/hết hạn, đúng tên và path cấu hình).

Kiểm tra database:

```sql
SELECT
  u.email,
  u.password_hash <> 'NewPassword123!' AS password_is_hashed,
  prt.used_at,
  prt.revoked_at
FROM users u
JOIN password_reset_tokens prt ON prt.user_id = u.id
WHERE u.email = 'swagger.task7.001@example.com'
  AND prt.token_hash = '4165f456bd65bc90ddff7c116e637d759f7632442e952717a82059dac63c0590';
```

Mong đợi `password_is_hashed = true`, `used_at IS NOT NULL`.

Tất cả session cũ phải bị revoke:

```sql
SELECT COUNT(*) AS active_session_count
FROM auth_sessions s
JOIN users u ON u.id = s.user_id
WHERE u.email = 'swagger.task7.001@example.com'
  AND s.revoked_at IS NULL;
```

Mong đợi `active_session_count = 0`.

### TC06 - Mật khẩu cũ thất bại, mật khẩu mới thành công

Gọi `POST /api/v1/auth/login` bằng `OldPassword123!`; mong đợi HTTP `401`.

Gọi lại bằng:

```json
{
  "email": "swagger.task7.001@example.com",
  "password": "NewPassword123!"
}
```

Mong đợi HTTP `200` và tạo một auth session mới.

### TC07 - Không dùng lại reset token

Gửi lại đúng request TC05. Mong đợi HTTP `400` với thông báo token không hợp lệ hoặc hết hạn; password và session không bị thay đổi thêm.

### TC08 - Token giả

```json
{
  "token": "invalid-reset-token",
  "newPassword": "AnotherPassword123!",
  "confirmPassword": "AnotherPassword123!"
}
```

Mong đợi HTTP `400`; response không cho biết token không tồn tại, hết hạn, đã dùng hay bị revoke.

### TC09 - Password confirmation không khớp

Tạo lại token test theo mục 5 rồi gửi:

```json
{
  "token": "swagger-task7-reset-token-001-long-safe-demo",
  "newPassword": "AnotherPassword123!",
  "confirmPassword": "DifferentPassword123!"
}
```

Mong đợi HTTP `400`, có lỗi `confirmPassword must match newPassword`. Token vẫn chưa được dùng.

### TC10 - Mật khẩu yếu và field thừa

Thử mật khẩu `password`, sau đó thử request hợp lệ nhưng thêm `email` hoặc `userId`.

Mong đợi HTTP `400` trong tất cả trường hợp; không cập nhật password, token hoặc session.

### TC11 - Token hết hạn

Tạo lại token theo mục 5, sau đó:

```sql
UPDATE password_reset_tokens
SET expires_at = now() - interval '1 minute'
WHERE token_hash = '4165f456bd65bc90ddff7c116e637d759f7632442e952717a82059dac63c0590';
```

Gửi request TC05. Mong đợi HTTP `400` với cùng lỗi chung như token giả/đã dùng.

### TC12 - Token bị revoke

Tạo lại token theo mục 5, sau đó:

```sql
UPDATE password_reset_tokens
SET revoked_at = now()
WHERE token_hash = '4165f456bd65bc90ddff7c116e637d759f7632442e952717a82059dac63c0590';
```

Gửi request TC05. Mong đợi HTTP `400` với cùng lỗi chung.

### TC13 - Tài khoản locked không được tự mở

Chỉ thực hiện trên user test. Tạo lại token theo mục 5 rồi khóa user:

```sql
UPDATE users
SET status = 'locked'
WHERE email = 'swagger.task7.001@example.com';
```

Gửi request TC05. Mong đợi HTTP `400`; status vẫn là `locked`, password không đổi và token không được dùng. Khôi phục user test để tiếp tục:

```sql
UPDATE users
SET status = 'active'
WHERE email = 'swagger.task7.001@example.com';
```

## 7. Refresh token cũ và request đồng thời

Sau reset thành công, gọi `POST /api/v1/auth/refresh` từ tab/browser vẫn giữ refresh cookie cũ. Mong đợi HTTP `401 Unauthorized` và cookie bị xóa. Swagger có thể đã nhận cookie xóa ngay ở TC05; để quan sát rõ trường hợp này có thể giữ refresh cookie cũ trong một HTTP client riêng trước khi reset.

Swagger UI không phù hợp để bắn chính xác hai request đồng thời. Điều kiện "cùng một token chỉ một request thành công" và rollback transaction được kiểm tra tự động bằng:

```powershell
pnpm test
pnpm test:e2e
```

Mong đợi chỉ một request reset thành công; request còn lại trả HTTP `400`.

## 8. Kiểm tra migration và schema

```powershell
pnpm migration:run
```

Mong đợi `No migrations are pending` sau khi migration đã được áp dụng.

Trong `psql`:

```sql
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'password_reset_tokens'
ORDER BY ordinal_position;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.password_reset_tokens'::regclass;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'password_reset_tokens'
ORDER BY indexname;
```

Cần có:

- UUID primary key và foreign key `user_id -> users.id ON DELETE CASCADE`.
- `token_hash varchar(64)` unique.
- Các timestamp dùng `timestamp with time zone`.
- Index cho `user_id`, `expires_at` và partial index token active.

Không chạy `migration:revert` trên database có dữ liệu cần giữ. Chỉ kiểm tra chu kỳ `run -> revert -> run` trên database development/test dùng riêng và khi đã chủ động chấp nhận việc drop bảng Task 7.

## 9. Kiểm tra dữ liệu nhạy cảm

Trong toàn bộ test:

- Response `forgot-password` không chứa `token`, `tokenHash`, `resetUrl` hoặc trạng thái tồn tại của email.
- Response `reset-password` không chứa password, password hash, token hoặc session.
- Log backend không chứa raw reset token, token hash, password hoặc URL có token.
- Database chỉ chứa hash 64 ký tự; raw token test không xuất hiện trong bất kỳ cột nào.

Có thể rà soát source và log thủ công, nhưng không in giá trị secret thật ra terminal dùng chung.

## 10. Dọn dữ liệu test tùy chọn

Xác nhận đúng database trước:

```sql
SELECT current_database();
```

Trên database development/test, xóa riêng user của tài liệu này:

```sql
DELETE FROM users
WHERE email = 'swagger.task7.001@example.com';
```

`auth_sessions`, `password_reset_tokens` và `user_profiles` liên quan phải tự xóa theo foreign key cascade.
