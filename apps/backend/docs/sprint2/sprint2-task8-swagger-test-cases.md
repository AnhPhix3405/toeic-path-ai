# Task 8 - Kịch bản kiểm thử hồ sơ cá nhân trên Swagger

## 1. Mục đích

Tài liệu này hướng dẫn kiểm thử thủ công hai endpoint của UC06:

```http
GET /api/v1/profile/me
PATCH /api/v1/profile/me
```

Các nội dung cần xác nhận:

- Student và Teacher xem, cập nhật được hồ sơ của chính mình.
- Admin không được sử dụng endpoint tự phục vụ này.
- Danh tính người dùng được lấy từ access token, không lấy từ request.
- PATCH chỉ thay đổi `fullName`, `birthday`, `gender`, `bio` được gửi lên.
- `avatarUrl`, email, role, status và thông tin xác thực không thể bị sửa.
- Field nullable có thể được xóa bằng `null`.
- Validation từ chối dữ liệu sai và field ngoài DTO.
- `updated_at` thay đổi sau khi cập nhật thành công.
- Request lỗi không làm thay đổi dữ liệu cũ.

Chỉ thực hiện các câu SQL thay đổi dữ liệu trong tài liệu này trên database
development/test.

## 2. Chuẩn bị môi trường

Từ thư mục gốc repository, kiểm tra PostgreSQL:

```powershell
docker compose ps
```

Từ `apps/backend`, áp dụng migration và khởi động backend:

```powershell
pnpm migration:run
pnpm start:dev
```

Mở Swagger UI:

```text
http://localhost:3001/api/docs
```

Nếu backend dùng port khác, thay `3001` bằng giá trị `PORT` trong `.env`.

Có thể mở `psql` trong terminal khác để đối chiếu database:

```powershell
docker compose exec postgres psql -U admin -d toeic_path_ai_db
```

Kết thúc `psql` bằng `\q`.

## 3. Chuẩn bị tài khoản kiểm thử

### 3.1. Tạo Student

Trong Swagger, gọi `POST /api/v1/auth/register`:

```json
{
  "fullName": "Swagger Task 8 Student",
  "email": "swagger.task8.student@example.com",
  "password": "StrongPassword123!",
  "confirmPassword": "StrongPassword123!",
  "acceptTerms": true
}
```

Mong đợi HTTP `201 Created`, `role = student`, `status = active` và profile được
tạo cùng tài khoản.

### 3.2. Chuẩn bị Teacher

Public register luôn tạo Student. Để có Teacher, dùng một tài khoản Teacher đã có
trong database development hoặc:

1. Đăng ký `swagger.task8.teacher@example.com` như mục 3.1.
2. Login bằng Admin.
3. Dùng `PATCH /api/v1/admin/users/{teacherUserId}/role` với body:

   ```json
   {
     "role": "teacher"
   }
   ```

4. Login lại tài khoản Teacher để nhận access token mới vì thao tác đổi role sẽ
   revoke session cũ.

### 3.3. Authorize trong Swagger

Gọi `POST /api/v1/auth/login` bằng tài khoản cần test:

```json
{
  "email": "swagger.task8.student@example.com",
  "password": "StrongPassword123!"
}
```

Copy `accessToken`, chọn nút `Authorize` ở đầu Swagger và nhập token. Nút
`Authorize` chỉ giữ một Bearer token tại một thời điểm; phải thay token khi chuyển
giữa Student, Teacher và Admin.

## 4. Kiểm thử xem hồ sơ

### TC01 - Student xem hồ sơ của chính mình

Authorize bằng Student rồi gọi `GET /api/v1/profile/me`.

Mong đợi HTTP `200 OK` và response có dạng:

```json
{
  "userId": "uuid-cua-student",
  "email": "swagger.task8.student@example.com",
  "role": "student",
  "profile": {
    "fullName": "Swagger Task 8 Student",
    "avatarUrl": null,
    "birthday": null,
    "gender": null,
    "bio": null
  },
  "updatedAt": "2026-09-02T08:00:00.000Z"
}
```

Giá trị `updatedAt` thực tế phụ thuộc thời điểm tạo/cập nhật dữ liệu.

Response không được chứa:

```text
password
passwordHash
refreshToken
refreshTokenHash
authSessions
termsAcceptedAt
termsVersion
```

### TC02 - Không có hoặc sai access token

1. Chọn `Authorize` > `Logout`, gọi `GET /api/v1/profile/me`.
2. Authorize bằng một chuỗi token không hợp lệ rồi gọi lại endpoint.

Mong đợi cả hai trường hợp trả HTTP `401 Unauthorized` và không trả dữ liệu hồ sơ.

### TC03 - Teacher xem hồ sơ của chính mình

Authorize bằng Teacher rồi gọi `GET /api/v1/profile/me`.

Mong đợi HTTP `200`, response có email và `userId` của Teacher, `role = teacher`.
Response không được trả hồ sơ Student đã dùng ở TC01.

### TC04 - Admin không được dùng endpoint profile/me

Authorize bằng Admin rồi gọi lần lượt:

```http
GET /api/v1/profile/me
PATCH /api/v1/profile/me
```

Với PATCH, có thể dùng body hợp lệ:

```json
{
  "bio": "Admin must not use UC06"
}
```

Mong đợi cả hai trả HTTP `403 Forbidden`.

## 5. Kiểm thử cập nhật hồ sơ

Authorize lại bằng Student trước khi thực hiện các test case trong mục này.

### TC05 - Cập nhật nhiều trường thành công

Gọi `PATCH /api/v1/profile/me`:

```json
{
  "fullName": "  Swagger Task 8 Updated  ",
  "birthday": "2003-08-15",
  "gender": "male",
  "bio": "  Mục tiêu TOEIC 850  "
}
```

Mong đợi HTTP `200 OK`:

- `fullName = "Swagger Task 8 Updated"`.
- `birthday = "2003-08-15"`.
- `gender = "male"`.
- `bio = "Mục tiêu TOEIC 850"`.
- Khoảng trắng đầu/cuối của `fullName` và `bio` đã bị loại bỏ.
- `avatarUrl` giữ nguyên.
- Response vẫn có email và role cũ.

Gọi lại `GET /api/v1/profile/me`; dữ liệu phải giống response PATCH.

### TC06 - PATCH một field không làm mất field khác

Gọi PATCH chỉ với:

```json
{
  "bio": "Mục tiêu TOEIC 900"
}
```

Mong đợi HTTP `200`:

- Chỉ `bio` thay đổi.
- `fullName`, `birthday`, `gender` và `avatarUrl` giữ nguyên giá trị từ TC05.

Gọi GET lần nữa để xác nhận dữ liệu đã được lưu.

### TC07 - Xóa field nullable bằng null

Gọi PATCH:

```json
{
  "birthday": null,
  "gender": null,
  "bio": null
}
```

Mong đợi HTTP `200`; ba field trên trả về `null`, còn `fullName` và `avatarUrl`
không đổi.

### TC08 - Bio rỗng được chuẩn hóa thành null

Gọi PATCH:

```json
{
  "bio": "   "
}
```

Mong đợi HTTP `200` và `profile.bio = null`.

### TC09 - Teacher cập nhật hồ sơ

Authorize bằng Teacher rồi gọi:

```json
{
  "fullName": "Swagger Task 8 Teacher Updated",
  "gender": "other",
  "bio": "Teacher profile"
}
```

Mong đợi HTTP `200`; response thuộc Teacher và không làm thay đổi hồ sơ Student.
Authorize lại bằng Student, gọi GET và xác nhận dữ liệu Student vẫn giữ nguyên.

## 6. Kiểm thử validation và mass assignment

Trước mỗi test lỗi, gọi GET và ghi lại response hiện tại. Sau request lỗi, gọi GET
lại và xác nhận dữ liệu không thay đổi.

### TC10 - Body rỗng

Gọi PATCH với:

```json
{}
```

Mong đợi HTTP `400 Bad Request`, không cập nhật `updatedAt`.

### TC11 - Full name không hợp lệ

Thử lần lượt:

```json
{
  "fullName": "   "
}
```

```json
{
  "fullName": "chuỗi dài hơn 150 ký tự"
}
```

Ở request thứ hai, dùng một chuỗi thực tế dài 151 ký tự. Mong đợi cả hai trả HTTP
`400`, tên cũ không thay đổi.

### TC12 - Birthday không hợp lệ hoặc ở tương lai

Thử lần lượt:

```json
{
  "birthday": "2003-02-30"
}
```

```json
{
  "birthday": "2999-01-01"
}
```

```json
{
  "birthday": "15/08/2003"
}
```

Mong đợi tất cả trả HTTP `400`; birthday cũ không thay đổi.

### TC13 - Gender sai enum

```json
{
  "gender": "unknown"
}
```

Mong đợi HTTP `400`. Các giá trị hợp lệ duy nhất là `male`, `female`, `other` hoặc
`null`.

### TC14 - Bio vượt quá 500 ký tự

Gửi `bio` có 501 ký tự.

Mong đợi HTTP `400`; bio cũ không thay đổi.

### TC15 - Không thể sửa field bị cấm

Thử riêng từng request sau:

```json
{
  "role": "admin"
}
```

```json
{
  "email": "attacker@example.com"
}
```

```json
{
  "status": "locked"
}
```

```json
{
  "avatarUrl": "https://attacker.example/avatar.png"
}
```

```json
{
  "password": "ChangedPassword123!"
}
```

Mong đợi tất cả trả HTTP `400 Bad Request` vì global validation bật
`forbidNonWhitelisted`. Không field nào trong database bị thay đổi.

Kiểm tra thêm request trộn field hợp lệ và field bị cấm:

```json
{
  "fullName": "Must Not Be Applied",
  "role": "admin"
}
```

Mong đợi HTTP `400`; ngay cả `fullName` cũng không được cập nhật.

### TC16 - Client không thể chọn profile đích

Thêm `userId`, `profileId` hoặc cả hai vào body PATCH:

```json
{
  "bio": "Attempted IDOR",
  "userId": "uuid-cua-user-khac"
}
```

Mong đợi HTTP `400`; hồ sơ của cả hai user không thay đổi.

Swagger cũng không được hiển thị endpoint dạng:

```http
GET /api/v1/profiles/{userId}
PATCH /api/v1/profiles/{userId}
```

`/profile/me` không có path, query hoặc body parameter để chọn user khác.

## 7. Kiểm tra database

### 7.1. Kiểm tra schema Task 8

```sql
SELECT column_name, data_type, udt_name, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;
```

Cần có:

- `birthday` có type `date`, nullable.
- `gender` dùng `user_profiles_gender_enum`, nullable.
- `bio` là `varchar(500)`, nullable.
- `updated_at` là `timestamp with time zone`, not null.

Kiểm tra giá trị enum:

```sql
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_profiles_gender_enum'::regtype
ORDER BY enumsortorder;
```

Mong đợi lần lượt: `male`, `female`, `other`.

### 7.2. Kiểm tra dữ liệu và updated_at

```sql
SELECT
  u.id AS user_id,
  u.email,
  u.role,
  u.status,
  p.full_name,
  p.avatar_url,
  p.birthday,
  p.gender,
  p.bio,
  p.created_at,
  p.updated_at
FROM users u
JOIN user_profiles p ON p.user_id = u.id
WHERE u.email IN (
  'swagger.task8.student@example.com',
  'swagger.task8.teacher@example.com'
)
ORDER BY u.email;
```

Sau PATCH thành công, `updated_at` phải mới hơn giá trị trước PATCH. Sau PATCH trả
HTTP `400` hoặc `403`, dữ liệu và `updated_at` phải giữ nguyên.

Kiểm tra invariant mỗi user có tối đa một profile:

```sql
SELECT user_id, COUNT(*) AS profile_count
FROM user_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;
```

Mong đợi không có dòng nào.

## 8. Session và trạng thái tài khoản

### TC17 - Session bị revoke

1. Login Student và lưu access token.
2. Logout hoặc dùng Admin đổi role/status để session Student bị revoke.
3. Dùng lại access token cũ gọi `GET /api/v1/profile/me` và PATCH.

Mong đợi HTTP `401 Unauthorized` cho cả hai endpoint.

### TC18 - Tài khoản locked

Chỉ dùng user test. Authorize bằng Admin và khóa Student qua:

```http
PATCH /api/v1/admin/users/{studentUserId}/status
```

```json
{
  "status": "locked"
}
```

Dùng token Student cũ gọi GET/PATCH profile; mong đợi HTTP `401`. Login lại bằng
đúng mật khẩu cũng phải bị từ chối theo auth policy hiện tại.

Sau test, dùng Admin mở khóa lại:

```json
{
  "status": "active"
}
```

Login lại Student để tạo session mới; GET profile phải thành công.

## 9. Trường hợp profile bị thiếu

Sau Task 6, mỗi user hợp lệ phải có đúng một profile. Không xóa profile trên
database dùng chung chỉ để kiểm thử lỗi này.

Trên database development/test cô lập, có thể tạo user/profile test riêng rồi chủ
động xóa profile của user đó. Khi gọi GET hoặc PATCH:

- API phải trả lỗi server theo convention hiện tại.
- Backend phải ghi structured log `profile_invariant_violation` kèm `userId`.
- API không được tự tạo profile rỗng.

Hành vi này cũng được kiểm tra tự động bằng:

```powershell
pnpm test
```

## 10. Checklist hoàn tất

- [ ] Student GET/PATCH profile của chính mình thành công.
- [ ] Teacher GET/PATCH profile của chính mình thành công.
- [ ] Admin bị từ chối với HTTP `403`.
- [ ] Thiếu hoặc sai access token trả HTTP `401`.
- [ ] Session revoked và tài khoản locked không truy cập được.
- [ ] PATCH chỉ thay đổi các field được gửi.
- [ ] `null` xóa được birthday, gender và bio.
- [ ] `avatarUrl` giữ nguyên và không thể PATCH từ client.
- [ ] Email, role, status, password, userId và profileId bị từ chối.
- [ ] Body rỗng, birthday tương lai, gender sai và text quá dài trả HTTP `400`.
- [ ] Request lỗi không thay đổi dữ liệu hoặc `updated_at`.
- [ ] Response không chứa dữ liệu xác thực nhạy cảm.
- [ ] Không có endpoint cho client chọn hồ sơ người khác.
- [ ] Schema có birthday, gender enum và timestamp đúng yêu cầu.

## 11. Dọn dữ liệu test tùy chọn

Xác nhận đúng database trước:

```sql
SELECT current_database();
```

Trên database development/test, xóa riêng dữ liệu của tài liệu này:

```sql
DELETE FROM users
WHERE email IN (
  'swagger.task8.student@example.com',
  'swagger.task8.teacher@example.com'
);
```

Các profile và auth session liên quan phải tự xóa theo foreign key `ON DELETE
CASCADE`.
