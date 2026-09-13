# Hướng dẫn chuẩn bị Postman — Sprint 2 Task 10

Chỉ sử dụng collection này với database development/test riêng biệt và một instance backend đang chạy:

```text
test/collections/sprint2/task10/sprint2-task10-auth-rate-limit.postman_collection.json
```

## 1. Chuẩn bị môi trường

Cấu hình file `.env` dựa trên `.env.example`. Giá trị mặc định của collection tương ứng với cấu hình mặc định của Task 10. Đặc biệt cần kiểm tra:

```dotenv
RATE_LIMIT_ENABLED=true
AUTH_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
TRUST_PROXY_HOPS=0
JSON_BODY_LIMIT=16kb
```

Collection tự đăng ký tài khoản `task10.student@example.com` với mật khẩu `StrongPassword123!` ở request đầu tiên. Có thể thay đổi hai biến `testEmail` và `testPassword` trước khi chạy nếu muốn sử dụng thông tin test khác.

Request đăng ký chấp nhận cả hai kết quả:

- HTTP `201` khi tài khoản được tạo mới.
- HTTP `409` khi email đã tồn tại.

Nếu nhận HTTP `409`, tài khoản hiện có phải dùng đúng mật khẩu trong biến `testPassword` và đang ở trạng thái `active`; nếu không, request đăng nhập tiếp theo sẽ thất bại. Để kết quả có thể lặp lại ổn định, nên dùng database test sạch hoặc một email test riêng chưa tồn tại.

Không lưu thông tin đăng nhập production trong collection.

## 2. Import và cấu hình collection

Import collection vào Postman và đặt `baseUrl` (mặc định là `http://localhost:3001/api/v1`). Đảm bảo các biến ngưỡng trong collection khớp với biến môi trường của backend:

| Biến trong collection  | Biến môi trường backend                |
| ---------------------- | -------------------------------------- |
| `registerIpMax`        | `RATE_LIMIT_REGISTER_IP_MAX`           |
| `loginEmailFailureMax` | `RATE_LIMIT_LOGIN_EMAIL_FAILURE_MAX`   |
| `forgotEmailMax`       | `RATE_LIMIT_FORGOT_PASSWORD_EMAIL_MAX` |
| `resetTokenMax`        | `RATE_LIMIT_RESET_PASSWORD_TOKEN_MAX`  |

## 3. Chạy các trường hợp kiểm thử

Rate limiter hiện chỉ lưu counter trong process của backend. Hãy khởi động lại backend trước khi chạy từng thư mục kiểm thử rate-limit được đánh số để request từ lần chạy trước không ảnh hưởng kết quả.

Chạy lần lượt từng request bằng Postman Desktop. Các request kiểm tra spam sử dụng `pm.sendRequest` để gửi những request ban đầu, sau đó request chính sẽ xác nhận API trả về HTTP `429 Too Many Requests`.

Collection tự đăng ký tài khoản test, sau đó kiểm tra đăng nhập bình thường, chống mass assignment, giới hạn body 16 KB, việc loại bỏ `/auth/revoke`, giới hạn lỗi theo email đã chuẩn hóa, forgot-password không làm lộ email, reset-token limiting, header `Retry-After` và contract response `429`.

## 4. Kiểm tra Origin

Trường hợp Origin không hợp lệ phải nhận HTTP `403` từ auth origin guard và không được để lộ stack trace. CORS không cấp header cho origin không nằm trong allowlist; preflight request của trình duyệt vì vậy cũng không được phép truy cập API.

## 5. Các giới hạn của kiểm thử bằng Postman

Postman không thể chứng minh trực tiếp các hành vi nội bộ như auth service không được gọi hoặc kiểm tra nội dung tracker key trong bộ nhớ. Sử dụng Jest unit/E2E test cho các kiểm tra này. Có thể truy vấn database để xác nhận request bị chặn không tạo user, không thay đổi `users.status`, đồng thời không tạo, rotate hoặc revoke `auth_sessions`.

Refresh-token rotation tạo raw refresh token mới sau mỗi lần thành công. Vì vậy, kiểm thử black-box không thể làm cạn per-token fingerprint counter một cách ổn định bằng các lần rotation thành công. Collection mặc định không kiểm tra refresh IP limit vì cần gửi 60 request, đồng thời việc này sẽ sử dụng hết ngân sách client-IP và có thể làm sai lệch các trường hợp chạy sau.

## 6. Giới hạn single-instance

Counter hiện bị xóa khi backend khởi động lại và không được chia sẻ giữa nhiều process. Vì vậy, collection này chỉ xác nhận cơ chế bảo vệ trong cấu hình một backend instance hiện tại.

Trước khi chạy nhiều backend instance, cần thay provider `AUTH_RATE_LIMIT_STORE` bằng adapter sử dụng Redis để các instance dùng chung counter.

## 7. Xóa dữ liệu test sau khi chạy

Chỉ chạy câu lệnh sau trên database development/test sau khi đã kiểm tra đúng giá trị `testEmail`. Không chạy trên production.

Với email mặc định của collection:

```sql
DELETE FROM users
WHERE email = 'task10.student@example.com';
```

Các bản ghi liên quan trong `user_profiles`, `auth_sessions` và `password_reset_tokens` sẽ được xóa theo foreign key `ON DELETE CASCADE`.

Nếu đã thay đổi biến `testEmail`, phải thay email trong câu lệnh SQL bằng đúng giá trị đã sử dụng. Nên kiểm tra bản ghi trước khi xóa:

```sql
SELECT id, email, role, status, created_at
FROM users
WHERE email = 'task10.student@example.com';
```
