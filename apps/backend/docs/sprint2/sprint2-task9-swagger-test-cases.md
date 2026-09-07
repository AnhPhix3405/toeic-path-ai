# Task 9 - Kịch bản kiểm thử avatar trên Swagger UI

## 1. Mục đích

Tài liệu này hướng dẫn kiểm thử thủ công hai endpoint của Task 9:

```http
POST   /api/v1/profile/me/avatar
DELETE /api/v1/profile/me/avatar
```

Các nội dung cần xác nhận:

- Student và Teacher chỉ quản lý avatar của chính mình.
- Admin, tài khoản không active và request không có session hợp lệ bị từ chối.
- Upload chỉ nhận đúng một file qua field `avatar`.
- Chỉ chấp nhận JPEG, PNG và WebP hợp lệ; không tin riêng MIME do client khai báo.
- Ảnh được decode, chuẩn hóa thành WebP 512 x 512 và loại bỏ metadata trước khi lưu.
- PostgreSQL chỉ lưu URL và metadata; binary nằm trong Supabase Storage.
- Upload lỗi không làm mất avatar cũ.
- Thay avatar chỉ xóa file cũ sau khi database đã chuyển sang file mới.
- DELETE có tính idempotent và xóa đồng thời toàn bộ metadata avatar trong database.
- Response không công khai storage key, credential hoặc lỗi nội bộ của Supabase.

Chỉ chạy các câu SQL thay đổi dữ liệu hoặc thử cấu hình lỗi trên môi trường development/test.

## 2. Chuẩn bị môi trường

### 2.1. Cấu hình backend và Supabase

Trong `apps/backend/.env`, bảo đảm có các biến sau:

```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STORAGE_BUCKET_AVATARS=your-public-avatar-bucket

AVATAR_MAX_SIZE_BYTES=2097152
AVATAR_MAX_WIDTH=2048
AVATAR_MAX_HEIGHT=2048
AVATAR_OUTPUT_WIDTH=512
AVATAR_OUTPUT_HEIGHT=512
AVATAR_OUTPUT_FORMAT=webp
AVATAR_OUTPUT_QUALITY=85
```

Yêu cầu đối với Supabase:

- Bucket trong `STORAGE_BUCKET_AVATARS` đã tồn tại.
- Bucket được đặt là public để `avatarUrl` có thể hiển thị trực tiếp trên frontend.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ nằm ở backend, không nhập key này vào Swagger hay trình duyệt.
- Không chụp màn hình, log hoặc đưa service-role key vào tài liệu test.

### 2.2. Khởi động hệ thống

Từ thư mục gốc repository:

```powershell
docker compose ps
```

Từ `apps/backend`:

```powershell
pnpm migration:run
pnpm start:dev
```

Mở Swagger UI:

```text
http://localhost:3001/api/docs
```

Nếu backend dùng port khác, thay `3001` bằng giá trị `PORT` trong `.env`.

Kiểm tra migration:

```powershell
pnpm typeorm migration:show
```

Migration sau phải có dấu `[X]`:

```text
AddAvatarMetadataToUserProfiles1788000008000
```

### 2.3. Chuẩn bị file ảnh

Chuẩn bị các file riêng, không dùng ảnh chứa thông tin cá nhân thật:

| File | Nội dung |
| --- | --- |
| `avatar-a.jpg` | JPEG hợp lệ, nhỏ hơn 2 MB, không quá 2048 x 2048 |
| `avatar-b.png` | PNG hợp lệ, khác rõ avatar A |
| `avatar-c.webp` | WebP hợp lệ |
| `empty.png` | File rỗng |
| `fake.png` | File text hoặc PDF được đổi đuôi thành `.png` |
| `avatar.svg` | SVG hợp lệ để kiểm tra định dạng bị cấm |
| `too-large.jpg` | JPEG lớn hơn 2 MB |
| `too-wide.png` | Ảnh hợp lệ có width hoặc height lớn hơn 2048 pixel |

Không chỉ đổi đuôi file hợp lệ để tạo `too-large.jpg`; file phải là ảnh decode được và kích thước
thực sự vượt giới hạn.

## 3. Chuẩn bị tài khoản và Authorize

### 3.1. Tạo Student

Trên Swagger, gọi `POST /api/v1/auth/register`:

```json
{
  "fullName": "Swagger Task 9 Student",
  "email": "swagger.task9.student@example.com",
  "password": "StrongPassword123!",
  "confirmPassword": "StrongPassword123!",
  "acceptTerms": true
}
```

Mong đợi HTTP `201 Created` và profile có `avatarUrl = null`.

### 3.2. Chuẩn bị Teacher

Public register luôn tạo Student. Có thể dùng Teacher có sẵn hoặc:

1. Đăng ký `swagger.task9.teacher@example.com` như mục 3.1.
2. Login Admin.
3. Gọi `PATCH /api/v1/admin/users/{teacherUserId}/role` với:

   ```json
   {
     "role": "teacher"
   }
   ```

4. Login lại Teacher để nhận access token mới vì session cũ đã bị revoke.

### 3.3. Authorize

Gọi `POST /api/v1/auth/login`:

```json
{
  "email": "swagger.task9.student@example.com",
  "password": "StrongPassword123!"
}
```

Copy `accessToken`, chọn **Authorize** ở đầu Swagger UI và nhập token. Khi đổi giữa Student,
Teacher và Admin, phải thay token tương ứng.

## 4. Upload và thay avatar thành công

### TC01 - Student upload JPEG

1. Authorize bằng Student.
2. Mở `POST /api/v1/profile/me/avatar`.
3. Chọn **Try it out**.
4. Tại field `avatar`, chọn `avatar-a.jpg`.
5. Chọn **Execute**.

Mong đợi HTTP `200 OK`:

- Response là profile của Student đang đăng nhập.
- `profile.avatarUrl` là URL Supabase public mới và mở được trên trình duyệt.
- `updatedAt` mới hơn thời điểm trước upload.
- Các field `fullName`, `birthday`, `gender`, `bio`, email và role không thay đổi.
- Response không có `avatarStorageKey`, `avatarMimeType`, `avatarSizeBytes`, bucket hoặc credential.

Gọi `GET /api/v1/profile/me`; `profile.avatarUrl` phải trùng response upload.

### TC02 - Ảnh được chuẩn hóa thành WebP

Sau TC01, tải ảnh từ `avatarUrl` hoặc xem object trong Supabase Storage.

Mong đợi:

- Object có đường dẫn dạng `avatars/<userId>/<uuid>.webp`.
- MIME được lưu là `image/webp`.
- Kích thước ảnh đầu ra là 512 x 512.
- Tên file gốc `avatar-a.jpg` không được dùng làm storage key.
- Metadata nhạy cảm như EXIF GPS của file nguồn không còn trong ảnh đầu ra.

### TC03 - Thay JPEG bằng PNG

Gọi lại `POST /api/v1/profile/me/avatar` với `avatar-b.png`.

Mong đợi HTTP `200`:

- `avatarUrl` mới khác URL ở TC01.
- GET profile trả URL mới.
- Object mới tồn tại và là WebP.
- Object cũ của TC01 đã được yêu cầu xóa khỏi Supabase Storage.
- Database không còn trỏ đến object cũ.

### TC04 - Upload WebP hợp lệ

Upload `avatar-c.webp`. Mong đợi HTTP `200`; ảnh vẫn được decode và encode lại, không lưu nguyên
binary do client gửi. GET profile trả URL mới nhất.

### TC05 - Teacher upload avatar của chính mình

Authorize bằng Teacher rồi upload một ảnh hợp lệ.

Mong đợi HTTP `200`, response chứa `userId`, email và role của Teacher. Authorize lại bằng Student,
gọi GET profile và xác nhận avatar Student không bị thay đổi.

## 5. Validation file trên Swagger UI

Trước mỗi test lỗi, gọi GET và ghi lại `avatarUrl`, `updatedAt`. Sau request lỗi, gọi GET lần nữa;
hai giá trị phải giữ nguyên.

### TC06 - Không chọn file

Mở endpoint upload, chọn **Try it out** nhưng không chọn file rồi **Execute**.

Mong đợi HTTP `400 Bad Request`; profile và object hiện tại không thay đổi.

### TC07 - File rỗng

Chọn `empty.png`. Mong đợi HTTP `400`; không tạo object mới trên Supabase.

### TC08 - SVG bị từ chối

Chọn `avatar.svg`. Mong đợi HTTP `415 Unsupported Media Type` hoặc lỗi validation `400` từ tầng
multipart; không lưu SVG và không thay đổi avatar cũ.

### TC09 - File giả mạo MIME/chữ ký

Chọn `fake.png`, là file không phải ảnh thật nhưng đã đổi đuôi thành `.png`.

Mong đợi HTTP `400` hoặc `415`. Backend phải decode/kiểm tra nội dung thực, không chấp nhận chỉ vì
filename hoặc MIME do browser gửi là PNG.

### TC10 - File vượt 2 MB

Chọn `too-large.jpg`. Mong đợi HTTP `413 Payload Too Large`; request bị dừng trước khi upload lên
Supabase và avatar cũ giữ nguyên.

### TC11 - Kích thước pixel vượt giới hạn

Chọn `too-wide.png`. Mong đợi HTTP `400 Bad Request`; không tạo object mới và profile không đổi.

### TC12 - Nhiều file hoặc sai field name

Swagger schema chỉ hiển thị một field `avatar`, do đó Swagger UI thông thường không cho chọn hai
file hoặc đổi field name. Xác nhận trên giao diện rằng endpoint không có field `file`, `image`,
`userId`, `profileId`, `storageKey`, `avatarUrl`, `folder` hoặc `provider`.

Để kiểm tra runtime ngoài Swagger, có thể dùng PowerShell/cURL trên môi trường test:

```powershell
curl.exe -X POST "http://localhost:3001/api/v1/profile/me/avatar" `
  -H "Authorization: Bearer <access-token>" `
  -F "file=@avatar-a.jpg"
```

Mong đợi sai field name trả HTTP `400`. Không đưa access token thật vào tài liệu hoặc commit.

## 6. Xóa avatar

### TC13 - Xóa avatar hiện tại

Sau khi profile đang có avatar, gọi `DELETE /api/v1/profile/me/avatar`.

Mong đợi HTTP `200`:

- `profile.avatarUrl = null`.
- GET profile cũng trả `avatarUrl = null`.
- Các field profile khác giữ nguyên.
- Object cũ đã được yêu cầu xóa khỏi Supabase Storage.
- Response không trả storage key đã xóa.

### TC14 - DELETE nhiều lần

Gọi DELETE lần thứ hai khi avatar đã null.

Mong đợi HTTP `200`, `profile.avatarUrl = null`. Backend không tạo lỗi và không gọi xóa một
storage key không tồn tại.

### TC15 - Upload lại sau khi xóa

Upload một ảnh hợp lệ sau TC14. Mong đợi HTTP `200`, avatar mới hoạt động bình thường và không phụ
thuộc object đã xóa trước đó.

## 7. Authentication, authorization và ownership

### TC16 - Thiếu hoặc sai access token

1. Chọn **Authorize** > **Logout**, gọi POST và DELETE avatar.
2. Authorize bằng một token không hợp lệ, gọi lại hai endpoint.

Mong đợi tất cả trả HTTP `401 Unauthorized`; database và Supabase Storage không thay đổi.

### TC17 - Admin bị từ chối

Authorize bằng Admin, gọi POST với file hợp lệ và gọi DELETE.

Mong đợi HTTP `403 Forbidden` cho cả hai. Admin không thể dùng UC06 để thay avatar người khác.

### TC18 - Tài khoản locked hoặc session bị revoke

Chỉ dùng user test:

1. Login Student và giữ access token.
2. Dùng Admin đổi status Student thành `locked`, hoặc logout để revoke session.
3. Dùng token cũ gọi POST và DELETE avatar.

Mong đợi HTTP `401`; avatar và storage không thay đổi. Sau test, mở khóa user và login lại để tạo
session mới.

### TC19 - Client không thể chọn user khác

Kiểm tra Swagger không có endpoint sau:

```http
POST   /api/v1/profiles/{userId}/avatar
DELETE /api/v1/profiles/{userId}/avatar
```

Hai endpoint Task 9 không có path/query/body field để truyền `userId`. Upload bằng token Teacher
không được thay avatar Student và ngược lại.

## 8. Kiểm tra database và Supabase Storage

### 8.1. Kiểm tra schema

Trong `psql`:

```sql
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name LIKE 'avatar%'
ORDER BY ordinal_position;
```

Cần có:

- `avatar_url`: `text`, nullable.
- `avatar_storage_key`: `varchar(500)`, nullable.
- `avatar_mime_type`: `varchar(100)`, nullable.
- `avatar_size_bytes`: `integer`, nullable.

Kiểm tra constraint:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
  AND conname = 'CHK_user_profiles_avatar_consistency';
```

### 8.2. Kiểm tra metadata sau upload

```sql
SELECT
  u.id AS user_id,
  u.email,
  p.avatar_url,
  p.avatar_storage_key,
  p.avatar_mime_type,
  p.avatar_size_bytes,
  p.updated_at
FROM users u
JOIN user_profiles p ON p.user_id = u.id
WHERE u.email IN (
  'swagger.task9.student@example.com',
  'swagger.task9.teacher@example.com'
)
ORDER BY u.email;
```

Sau upload thành công:

- URL và storage key đều khác null.
- Key có dạng `avatars/<userId>/<uuid>.webp`.
- MIME là `image/webp`.
- Size là số dương và là kích thước output đã xử lý.
- URL không chứa service-role key.

Sau DELETE, cả bốn field avatar phải là `NULL`.

Kiểm tra invariant toàn bảng:

```sql
SELECT user_id, avatar_url, avatar_storage_key
FROM user_profiles
WHERE (avatar_url IS NULL) <> (avatar_storage_key IS NULL);
```

Mong đợi không có dòng nào.

Trong Supabase Dashboard > Storage > bucket avatar, đối chiếu object theo storage key. Không dùng
`avatarUrl` để suy ngược key trong code; SQL chỉ phục vụ kiểm tra thủ công trên database test.

## 9. Các trường hợp lỗi và đồng thời không nên phá hệ thống qua Swagger

### TC20 - Storage upload lỗi giữ avatar cũ

Trên môi trường development/test cô lập, có thể tạm dùng bucket không tồn tại hoặc credential test
không hợp lệ rồi restart backend. Upload ảnh mới phải trả lỗi storage (`502` hoặc lỗi dịch vụ đã
chuẩn hóa); GET profile vẫn trả avatar cũ và object cũ vẫn tồn tại.

Khôi phục `.env` ngay sau test. Không thực hiện cách này trên production và không xóa bucket đang
dùng để mô phỏng lỗi.

### TC21 - Database update lỗi và cleanup file mới

Không nên drop column, constraint hoặc dừng PostgreSQL trong lúc request chỉ để test trên database
dùng chung. Luồng cleanup bù trừ được kiểm tra bằng unit test:

```powershell
pnpm test
```

Mong đợi test xác nhận database lỗi sau upload sẽ yêu cầu xóa file mới và giữ metadata avatar cũ.

### TC22 - Hai upload hoặc upload/DELETE đồng thời

Swagger UI gửi request tuần tự nên không chứng minh chính xác race condition. Điều kiện cần xác
nhận bằng test tự động hoặc HTTP client chạy đồng thời:

- Cả upload và DELETE khóa cùng row `user_profiles` bằng `FOR UPDATE`.
- Hai upload kết thúc với đúng một avatar hiện hành.
- File bị thay thế được cleanup.
- Upload đồng thời DELETE không để database trỏ tới object đã bị xóa nhầm.

Chạy regression tự động:

```powershell
pnpm lint
pnpm build
pnpm test
pnpm test:e2e
```

## 10. Kiểm tra migration run/revert

Chỉ chạy trên database development/test và bảo đảm Task 9 là migration cuối cùng:

```powershell
pnpm migration:run
pnpm typeorm migration:show
pnpm migration:revert
pnpm typeorm migration:show
pnpm migration:run
pnpm typeorm migration:show
```

Mong đợi:

1. Lần `run` đầu thêm ba cột metadata và constraint.
2. `revert` gỡ constraint trước, sau đó gỡ ba cột.
3. Lần `run` cuối áp dụng lại thành công.
4. Trạng thái cuối có `[X] AddAvatarMetadataToUserProfiles1788000008000`.

Không chạy `revert` trên production hoặc database chứa metadata avatar cần giữ.

## 11. Checklist hoàn tất

- [ ] Student upload JPEG, PNG và WebP hợp lệ thành công.
- [ ] Teacher chỉ thay được avatar của Teacher.
- [ ] GET profile trả đúng URL mới nhất.
- [ ] Ảnh đầu ra là WebP 512 x 512 và không dùng filename client.
- [ ] Không file, file rỗng, SVG, file giả, file quá lớn và ảnh quá kích thước bị từ chối.
- [ ] Upload lỗi giữ nguyên avatar cũ.
- [ ] Thay avatar cập nhật database trước khi cleanup file cũ.
- [ ] DELETE xóa toàn bộ metadata và object cũ.
- [ ] DELETE nhiều lần vẫn thành công.
- [ ] Thiếu/sai token trả `401`; Admin bị từ chối; user locked không thao tác được.
- [ ] Client không truyền được userId, URL, storage key, bucket hoặc provider.
- [ ] Response và log không chứa credential, binary hoặc storage metadata nội bộ.
- [ ] Database không có URL/key lệch trạng thái null.
- [ ] Migration `run -> revert -> run` thành công và kết thúc ở trạng thái đã áp dụng.
- [ ] Lint, build, unit test và E2E đều thành công.

## 12. Dọn dữ liệu test tùy chọn

Xác nhận đúng database trước:

```sql
SELECT current_database();
```

Trước khi xóa user, gọi DELETE avatar qua API để backend cleanup object Supabase đúng quy trình.
Sau đó, trên database development/test:

```sql
DELETE FROM users
WHERE email IN (
  'swagger.task9.student@example.com',
  'swagger.task9.teacher@example.com'
);
```

Profile và auth session liên quan sẽ được xóa theo foreign key cascade. Nếu xóa user trực tiếp khi
profile vẫn còn avatar, database cascade không tự xóa object trong Supabase Storage; khi đó phải
xóa object test thủ công trong Supabase Dashboard theo storage key đã ghi nhận trước khi xóa row.
