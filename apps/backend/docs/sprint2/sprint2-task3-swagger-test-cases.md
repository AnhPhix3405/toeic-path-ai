# Sprint 2 - Task 3 RBAC Swagger test cases

Tài liệu này hướng dẫn kiểm thử thủ công phân quyền Student, Teacher và Admin trên
Swagger UI. Các kịch bản tập trung vào xác thực, phân quyền, API quản trị, thay đổi
role, khóa/mở khóa tài khoản và việc thu hồi session.

## 1. Điều kiện trước khi kiểm thử

1. PostgreSQL đang chạy và migration đã được áp dụng:

   ```bash
   pnpm migration:run
   ```

2. Tạo admin ban đầu trong `.env`:

   ```env
   INITIAL_ADMIN_EMAIL=admin@example.com
   INITIAL_ADMIN_PASSWORD=StrongAdmin123!
   ```

3. Chạy seed và khởi động backend:

   ```bash
   pnpm seed:admin
   pnpm start:dev
   ```

4. Mở Swagger UI:

   ```text
   http://localhost:3001/api/docs
   ```

5. Mở Developer Tools, bật `Preserve log` trong tab `Network`. Tab `Application`
   > `Cookies` được dùng để quan sát refresh cookie.

## 2. Dữ liệu kiểm thử

Sử dụng ba tài khoản:

| Role | Email | Cách tạo |
| --- | --- | --- |
| Admin | `admin@example.com` | `pnpm seed:admin` |
| Student A | `student.a@example.com` | API register |
| Student B | `student.b@example.com` | API register |

Mật khẩu mẫu:

```text
StrongPassword123!
```

Student A sẽ được nâng thành Teacher trong quá trình kiểm thử. Student B được dùng
cho các kịch bản khóa/mở khóa.

Mỗi lần login, lưu access token vào một nơi tạm thời và ghi rõ token thuộc tài khoản
nào. Nút `Authorize` của Swagger chỉ giữ một Bearer token tại một thời điểm. Khi đổi
role kiểm thử, cần logout/login hoặc thay token trong `Authorize` theo từng bước.

## 3. Chuẩn bị tài khoản Student

Endpoint: `POST /api/v1/auth/register`

Đăng ký lần lượt Student A và Student B:

```json
{
  "email": "student.a@example.com",
  "password": "StrongPassword123!"
}
```

```json
{
  "email": "student.b@example.com",
  "password": "StrongPassword123!"
}
```

Kết quả mong đợi:

- HTTP `201 Created`.
- Mỗi tài khoản có `role: student`, `status: active`.
- Response không có `passwordHash` hoặc token.
- Lưu `id` của hai tài khoản để gọi API Admin.

## 4. TC01 - Register không cho client tự cấp role

Gọi `POST /api/v1/auth/register` với email mới:

```json
{
  "email": "attacker@example.com",
  "password": "StrongPassword123!",
  "role": "admin"
}
```

Kết quả mong đợi:

- HTTP `400 Bad Request`.
- Validation báo `role` không được phép tồn tại trong request.
- Không tạo tài khoản Admin.

Có thể kiểm tra tương tự với field `status: "active"` và mong đợi HTTP `400`.

## 5. TC02 - API Admin không có access token

Endpoint: `GET /api/v1/admin/users`

1. Chọn `Authorize` > `Logout` để xóa Bearer token khỏi Swagger.
2. Gọi endpoint danh sách user.

Kết quả mong đợi:

- HTTP `401 Unauthorized`.
- Không trả danh sách user.

## 6. TC03 - Student không được gọi API Admin

1. Login Student A bằng `POST /api/v1/auth/login`.
2. Copy `accessToken` từ response.
3. Nhập token vào nút `Authorize`.
4. Gọi `GET /api/v1/admin/users`.

Kết quả mong đợi:

- HTTP `403 Forbidden`.
- Message cho biết user không có quyền truy cập resource.

## 7. TC04 - Admin lấy danh sách user

1. Login tài khoản Admin.
2. Thay Bearer token trong `Authorize` bằng access token Admin.
3. Gọi `GET /api/v1/admin/users` với:

   ```text
   page=1
   limit=20
   role=student
   status=active
   ```

Kết quả mong đợi:

- HTTP `200 OK`.
- Response có `data` và `meta`.
- `meta` có `page`, `limit`, `total`, `totalPages`.
- Tất cả phần tử trả về có `role: student`, `status: active`.
- Không có `passwordHash`, `refreshTokenHash` hoặc nội dung token.

## 8. TC05 - Search, pagination và validation query

Endpoint: `GET /api/v1/admin/users`

Thực hiện lần lượt:

1. Gửi `search=student.a` và xác nhận chỉ tìm theo email phù hợp.
2. Gửi `page=1&limit=1` và xác nhận `data` tối đa một phần tử.
3. Gửi `limit=101` và mong đợi HTTP `400`.
4. Gửi `page=0` và mong đợi HTTP `400`.
5. Gửi `role=super_admin` và mong đợi HTTP `400`.
6. Gửi `status=disabled` và mong đợi HTTP `400`.

## 9. TC06 - Admin xem chi tiết user

Endpoint: `GET /api/v1/admin/users/:id`

1. Dùng `id` của Student A.
2. Gọi endpoint bằng token Admin.

Kết quả mong đợi:

- HTTP `200 OK`.
- Response đúng email, role và status của Student A.
- Không có dữ liệu nhạy cảm.

Gọi lại với UUID hợp lệ nhưng không tồn tại:

```text
00000000-0000-4000-8000-000000000000
```

Kết quả mong đợi: HTTP `404 Not Found`.

Gọi với `id` không phải UUID và mong đợi HTTP `400 Bad Request`.

## 10. TC07 - Admin cấp role Teacher cho Student

Trước khi đổi role:

1. Login Student A và lưu access token cũ.
2. Không logout Student A để session vẫn đang active.
3. Authorize lại bằng token Admin.

Endpoint: `PATCH /api/v1/admin/users/:id/role`

Body:

```json
{
  "role": "teacher"
}
```

Kết quả mong đợi:

- HTTP `200 OK`.
- Response có `role: teacher`.
- `updatedAt` được cập nhật.
- Toàn bộ session cũ của Student A bị revoke.

## 11. TC08 - Session cũ bị từ chối sau khi đổi role

1. Nhập access token Student A đã lưu trước TC07 vào `Authorize`.
2. Gọi `GET /api/v1/auth/me`.

Kết quả mong đợi:

- HTTP `401 Unauthorized` vì session đã bị revoke.

3. Trong cùng browser, thử `POST /api/v1/auth/refresh` nếu cookie Student A vẫn còn.

Kết quả mong đợi:

- HTTP `401 Unauthorized`.
- Refresh cookie cũ bị xóa.

4. Login lại Student A.
5. Gọi `GET /api/v1/auth/me` bằng access token mới.

Kết quả mong đợi:

- HTTP `200 OK`.
- Response có `role: teacher`, `status: active`.

## 12. TC09 - Teacher không được gọi API Admin

Sử dụng access token mới của Student A sau khi đã thành Teacher, gọi:

```text
GET /api/v1/admin/users
```

Kết quả mong đợi:

- HTTP `403 Forbidden`.
- Teacher không nhận được danh sách user.

## 13. TC10 - Validation role không hợp lệ

Authorize bằng Admin rồi gọi `PATCH /api/v1/admin/users/:id/role`:

```json
{
  "role": "super_admin"
}
```

Kết quả mong đợi:

- HTTP `400 Bad Request`.
- Role của user không thay đổi.

Gọi endpoint với UUID không tồn tại và role hợp lệ, mong đợi HTTP `404 Not Found`.

## 14. TC11 - Admin không được tự thay đổi role

1. Lấy `id` của Admin từ `GET /api/v1/admin/users`.
2. Gọi `PATCH /api/v1/admin/users/{adminId}/role` bằng chính token Admin:

```json
{
  "role": "student"
}
```

Kết quả mong đợi:

- HTTP `409 Conflict`.
- Admin vẫn giữ role `admin`.

Ngay cả khi gửi lại `role: admin`, API hiện tại vẫn từ chối self-change với HTTP `409`.

## 15. TC12 - Admin khóa tài khoản Student

Trước khi khóa:

1. Login Student B và lưu access token.
2. Đảm bảo Student B có refresh cookie/session active.
3. Authorize lại bằng token Admin.

Endpoint: `PATCH /api/v1/admin/users/{studentBId}/status`

Body:

```json
{
  "status": "locked"
}
```

Kết quả mong đợi:

- HTTP `200 OK`.
- Response có `status: locked`.
- Tất cả session active của Student B bị revoke.

## 16. TC13 - Tài khoản locked không sử dụng API hoặc login

Thực hiện lần lượt:

1. Dùng access token Student B đã lưu gọi `GET /api/v1/auth/me`.
   - Mong đợi HTTP `401`.
2. Dùng refresh cookie cũ gọi `POST /api/v1/auth/refresh`.
   - Mong đợi HTTP `401` vì session đã bị revoke.
3. Login lại Student B với đúng mật khẩu.
   - Mong đợi HTTP `403 Forbidden` vì account bị khóa.

## 17. TC14 - Admin mở khóa tài khoản

Authorize bằng Admin, gọi `PATCH /api/v1/admin/users/{studentBId}/status`:

```json
{
  "status": "active"
}
```

Kết quả mong đợi:

- HTTP `200 OK`.
- Response có `status: active`.
- Session cũ không được khôi phục.

Sau khi mở khóa:

1. Thử lại access token cũ và mong đợi HTTP `401`.
2. Login Student B lại từ đầu và mong đợi HTTP `200`.
3. Access token mới gọi `/auth/me` thành công.

## 18. TC15 - Admin không được tự khóa

Authorize bằng Admin rồi gọi `PATCH /api/v1/admin/users/{adminId}/status`:

```json
{
  "status": "locked"
}
```

Kết quả mong đợi:

- HTTP `409 Conflict`.
- Tài khoản Admin vẫn có `status: active`.
- Session Admin hiện tại vẫn sử dụng được.

## 19. TC16 - Không được khóa hoặc hạ quyền Admin active cuối cùng

Kịch bản này có ý nghĩa rõ nhất khi hệ thống có từ hai Admin trở lên. Nếu chỉ có một
Admin, self-protection ở TC11 và TC15 đã ngăn thao tác.

Với hai Admin, dùng Admin A để hạ quyền hoặc khóa Admin B cho tới khi hệ thống chỉ còn
một Admin active. Sau đó thử loại bỏ Admin active cuối cùng.

Kết quả mong đợi:

- HTTP `409 Conflict`.
- Hệ thống luôn còn ít nhất một Admin active.
- Thay đổi user và revoke session cùng rollback nếu transaction thất bại.

Không xóa hoặc sửa trực tiếp Admin cuối cùng trong database production để thực hiện test.

## 20. TC17 - Status không hợp lệ và user không tồn tại

Gọi `PATCH /api/v1/admin/users/:id/status` với:

```json
{
  "status": "disabled"
}
```

Kết quả mong đợi: HTTP `400 Bad Request`.

Gọi với UUID không tồn tại và body hợp lệ:

```json
{
  "status": "locked"
}
```

Kết quả mong đợi: HTTP `404 Not Found`.

## 21. TC18 - Field thừa trong DTO quản trị

Gọi endpoint thay role với body:

```json
{
  "role": "teacher",
  "status": "active"
}
```

Kết quả mong đợi:

- HTTP `400 Bad Request` vì `status` không thuộc `UpdateUserRoleDto`.
- Không có thay đổi một phần trong database.

Thực hiện tương tự bằng cách thêm `role` vào request thay status.

## 22. Lưu ý khi đổi tài khoản trên Swagger

Swagger UI chỉ quản lý một Bearer token chung. Refresh cookie lại được browser quản lý
theo origin, không theo nút `Authorize`. Vì vậy:

- Trước mỗi test, kiểm tra token hiện tại thuộc đúng tài khoản.
- Khi cần session của user khác, login user đó trước và lưu token/cookie cần kiểm tra.
- Login tài khoản tiếp theo có thể ghi đè refresh cookie trong browser.
- Với kịch bản cần giữ nhiều refresh cookie đồng thời, dùng cửa sổ Incognito/profile
  browser khác hoặc bổ sung Postman/cURL.
- Không dán access/refresh token thật vào tài liệu, log hoặc source code.

## 23. Các kiểm tra cần công cụ bổ sung

Swagger xác minh được hành vi HTTP nhưng không chứng minh trực tiếp transaction rollback
hoặc số row session đã cập nhật. Các kiểm tra sau nên được xác nhận bằng test tự động hoặc
database test:

- Tất cả `auth_sessions` active của user đều có `revoked_at` sau đổi role/khóa.
- Transaction rollback cả user và session nếu câu lệnh revoke thất bại.
- Hai request đồng thời không thể làm mất Admin active cuối cùng.
- Role được lấy từ database thay vì tin trực tiếp vào claim cũ trong JWT.
- Response không bao giờ select hoặc serialize `password_hash`.

Không chạy câu lệnh xóa/reset database nếu chưa được phê duyệt rõ ràng.

## 24. Checklist hoàn tất

- [ ] Public register chỉ tạo Student active.
- [ ] Register có `role` hoặc `status` trả `400`.
- [ ] Không token gọi API Admin trả `401`.
- [ ] Student gọi API Admin trả `403`.
- [ ] Teacher gọi API Admin trả `403`.
- [ ] Admin gọi API quản trị thành công.
- [ ] List/search/filter/pagination hoạt động và không lộ dữ liệu nhạy cảm.
- [ ] Đổi role revoke session cũ.
- [ ] Role mới xuất hiện sau khi user login lại.
- [ ] Khóa tài khoản revoke session và chặn login.
- [ ] Mở khóa không khôi phục session cũ.
- [ ] Admin không tự đổi role hoặc tự khóa.
- [ ] Không thể khóa hoặc hạ quyền Admin active cuối cùng.
- [ ] UUID, enum, query và field thừa được validation đúng.
- [ ] Swagger mô tả đúng các response `400`, `401`, `403`, `404`, `409`.
