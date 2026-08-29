# Sprint 2 - Task 2 Swagger test cases

Tài liệu này hướng dẫn kiểm thử thủ công HTTP-only refresh cookie trên Swagger
UI của backend.

## 1. Điều kiện trước khi kiểm thử

1. PostgreSQL đang chạy và các migration hiện có đã được áp dụng:

   ```bash
   pnpm migration:run
   ```

2. Cấu hình local trong `.env`:

   ```env
   REFRESH_COOKIE_NAME=toeic_refresh_token
   REFRESH_COOKIE_PATH=/api/v1/auth
   REFRESH_COOKIE_MAX_AGE_MS=604800000
   REFRESH_COOKIE_SECURE=false
   REFRESH_COOKIE_SAME_SITE=lax
   ```

3. Khởi động backend:

   ```bash
   pnpm start:dev
   ```

4. Mở Swagger UI tại:

   ```text
   http://localhost:3001/api/docs
   ```

5. Mở Developer Tools của trình duyệt:

   - Tab `Network` dùng để xem response body và header `Set-Cookie`.
   - Tab `Application` > `Cookies` dùng để xem metadata của cookie.
   - Bật `Preserve log` trong tab `Network` để giữ lịch sử request.

Swagger UI và API đang cùng origin nên trình duyệt có thể tự lưu và gửi cookie.
Không nhập refresh token vào Swagger hoặc JavaScript console.

## 2. Dữ liệu kiểm thử

Sử dụng một email chưa tồn tại:

```json
{
  "email": "swagger.student@example.com",
  "password": "StrongPassword123!"
}
```

Nếu chạy lại toàn bộ kịch bản, đổi email hoặc xóa dữ liệu test có chủ đích trong
database test.

## 3. TC01 - Đăng ký tài khoản thành công

Endpoint: `POST /api/v1/auth/register`

Các bước:

1. Chọn `Try it out`.
2. Nhập dữ liệu kiểm thử.
3. Chọn `Execute`.

Kết quả mong đợi:

- HTTP `201 Created`.
- Response có `id`, `email`, `role: student`, `status: active`.
- Response không có `password`, `passwordHash` hoặc token.

## 4. TC02 - Không cho đăng ký email trùng

Gọi lại `POST /api/v1/auth/register` với email của TC01.

Kết quả mong đợi:

- HTTP `409 Conflict`.
- Không tạo thêm user.

## 5. TC03 - Validate mật khẩu yếu

Gọi `POST /api/v1/auth/register` với email mới và mật khẩu:

```json
{
  "email": "weak.password@example.com",
  "password": "123456"
}
```

Kết quả mong đợi:

- HTTP `400 Bad Request`.
- Thông báo cho biết mật khẩu phải có độ dài và độ mạnh yêu cầu.

## 6. TC04 - Đăng nhập sai mật khẩu

Endpoint: `POST /api/v1/auth/login`

Gửi email của TC01 với mật khẩu không đúng.

Kết quả mong đợi:

- HTTP `401 Unauthorized`.
- Không có access token.
- Không tạo refresh cookie hợp lệ.

## 7. TC05 - Login tạo HTTP-only refresh cookie

Endpoint: `POST /api/v1/auth/login`

Các bước:

1. Gửi email và mật khẩu đúng của TC01.
2. Mở request login trong tab `Network`.
3. Kiểm tra response body và `Set-Cookie`.
4. Kiểm tra cookie `toeic_refresh_token` trong tab `Application`.

Kết quả mong đợi:

- HTTP `200 OK`.
- JSON chỉ chứa `user`, `accessToken`, `accessTokenExpiresIn`.
- JSON không chứa trường `refreshToken`.
- Header có dạng:

  ```text
  Set-Cookie: toeic_refresh_token=...; Max-Age=604800; Path=/api/v1/auth; HttpOnly; SameSite=Lax
  ```

- Cookie có các thuộc tính:

  | Thuộc tính | Giá trị local mong đợi |
  | ---------- | ---------------------- |
  | Name       | `toeic_refresh_token`  |
  | HttpOnly   | `true`                 |
  | Path       | `/api/v1/auth`         |
  | SameSite   | `Lax`                  |
  | Secure     | `false`                |
  | Max-Age    | 7 ngày                 |

Lưu `accessToken` để dùng cho các test Bearer token.

## 8. TC06 - Kiểm tra access token bằng `/auth/me`

Endpoint: `GET /api/v1/auth/me`

Các bước:

1. Chọn nút `Authorize` ở đầu Swagger UI.
2. Nhập access token từ TC05. Nếu hộp thoại không tự thêm prefix, nhập đúng giá
   trị token theo hướng dẫn hiển thị của Swagger.
3. Thực thi `/auth/me`.

Kết quả mong đợi:

- HTTP `200 OK`.
- Response trả đúng `id`, `sessionId`, `email`, `role` của tài khoản.
- Response không chứa refresh token.

## 9. TC07 - Refresh thành công và rotation cookie

Endpoint: `POST /api/v1/auth/refresh`

Các bước:

1. Không nhập request body; endpoint không còn nhận `RefreshTokenDto`.
2. Ghi lại giá trị refresh cookie hiện tại trong DevTools.
3. Chọn `Execute`.
4. Kiểm tra response và cookie sau request.

Kết quả mong đợi:

- Trình duyệt tự gửi cookie trong request.
- HTTP `200 OK`.
- JSON chỉ chứa `accessToken` và `accessTokenExpiresIn`.
- JSON không chứa `refreshToken` hoặc `user`.
- Response có `Set-Cookie` mới.
- Giá trị refresh cookie mới khác giá trị trước refresh.
- Access token mới có thể dùng cho `/auth/me`.

## 10. TC08 - Refresh token cũ không được tái sử dụng

Test này cần dùng DevTools để mô phỏng replay:

1. Trước TC07, lưu lại giá trị cookie cũ.
2. Sau khi TC07 rotation thành công, mở `Application` > `Cookies`.
3. Thay giá trị cookie hiện tại bằng refresh token cũ.
4. Gọi lại `POST /api/v1/auth/refresh`.

Kết quả mong đợi:

- HTTP `401 Unauthorized`.
- Response gửi lệnh xóa cookie.
- Cookie không còn giá trị refresh token hợp lệ.

Sau test này, login lại để tạo session mới cho các test tiếp theo.

## 11. TC09 - Refresh khi thiếu cookie

Các bước:

1. Xóa cookie `toeic_refresh_token` trong DevTools.
2. Gọi `POST /api/v1/auth/refresh` không có request body.

Kết quả mong đợi:

- HTTP `401 Unauthorized`.
- Thông báo refresh cookie là bắt buộc.
- Response vẫn gọi clear cookie với đúng path `/api/v1/auth`.

## 12. TC10 - Cookie chứa access token thay vì refresh token

Các bước:

1. Login lại để lấy access token.
2. Trong DevTools, đặt giá trị cookie `toeic_refresh_token` bằng access token.
3. Gọi `POST /api/v1/auth/refresh`.

Kết quả mong đợi:

- HTTP `401 Unauthorized` vì token có `type: access`.
- Refresh cookie bị xóa.

## 13. TC11 - Cookie bị chỉnh sửa

Các bước:

1. Login lại.
2. Sửa một vài ký tự trong giá trị refresh cookie bằng DevTools.
3. Gọi `POST /api/v1/auth/refresh`.

Kết quả mong đợi:

- HTTP `401 Unauthorized` vì chữ ký RS256 không hợp lệ.
- Refresh cookie bị xóa.

## 14. TC12 - Logout thành công

Endpoint: `POST /api/v1/auth/logout`

Các bước:

1. Login lại và cập nhật access token trong nút `Authorize`.
2. Xác nhận refresh cookie đang tồn tại.
3. Gọi `/auth/logout`.

Kết quả mong đợi:

- HTTP `204 No Content`.
- Response body rỗng.
- Response xóa cookie với đúng `Path`, `HttpOnly`, `SameSite` và `Secure` như
  lúc tạo.
- Cookie `toeic_refresh_token` biến mất khỏi trình duyệt.
- Session tương ứng đã bị revoke.

## 15. TC13 - Không refresh được sau logout

Ngay sau TC12, gọi `POST /api/v1/auth/refresh`.

Kết quả mong đợi:

- HTTP `401 Unauthorized` vì không còn refresh cookie hợp lệ.

## 16. TC14 - Logout lặp lại

Vì access token của session đã revoke sẽ bị access guard từ chối, để kiểm tra
tính idempotent của service/controller hãy login tạo session mới, gọi logout một
lần và xác nhận việc clear cookie không gây lỗi khi cookie phía client đã bị xóa.

Kết quả mong đợi cho lần logout hợp lệ:

- HTTP `204 No Content`.
- Cookie không tồn tại vẫn không làm thao tác clear cookie phát sinh lỗi.

Lưu ý: gọi lại bằng access token thuộc session đã revoke sẽ nhận `401` tại guard;
đây là hành vi bảo vệ endpoint, không phải lỗi clear-cookie.

## 17. Các kiểm tra không thể kết luận chỉ bằng Swagger cùng origin

Các trường hợp sau cần môi trường hoặc công cụ bổ sung:

- CORS từ origin không được phép: dùng frontend khác origin hoặc cURL/Postman có
  header `Origin` tùy chỉnh.
- Cookie production có `Secure`: chạy backend qua HTTPS với
  `REFRESH_COOKIE_SECURE=true`.
- `SameSite=None`: chỉ cấu hình cùng `Secure=true`; ứng dụng sẽ từ chối khởi động
  nếu cấu hình `none` và `secure=false`.
- Kiểm tra JavaScript không đọc được cookie: cờ `HttpOnly` có thể xem trong
  DevTools; `document.cookie` không được chứa `toeic_refresh_token`.
- Tài khoản locked: cần chuẩn bị user có `status=locked` trong database test rồi
  kiểm tra login trả `403` và refresh kết thúc phiên.

## 18. Checklist hoàn tất

- [x] Login JSON không có refresh token.
- [x] Login tạo cookie `HttpOnly` đúng path và SameSite.
- [x] `/auth/me` hoạt động với access token.
- [x] Refresh không có request body.
- [x] Refresh rotation thay cookie cũ bằng cookie mới.
- [x] Refresh token cũ bị từ chối.
- [x] Cookie sai, thiếu hoặc sai loại trả `401` và bị xóa.
- [x] Logout trả `204`, revoke session và xóa cookie.
- [x] Refresh sau logout trả `401`.
- [x] Refresh token không xuất hiện trong JSON, localStorage hoặc sessionStorage.
