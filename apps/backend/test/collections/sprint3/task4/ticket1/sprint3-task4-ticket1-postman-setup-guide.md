# Hướng dẫn Postman — Sprint 3 Task 4 Ticket 1: Google Authentication

Collection: `sprint3-task4-ticket1-google-auth.postman_collection.json`.

## 1. Mục tiêu và phạm vi kiểm thử

Collection này kiểm thử tự động và thủ công cho endpoint:
- **`POST /api/v1/auth/google`** (Sign in or Sign up with Google OAuth2 ID Token).

Phạm vi bao gồm:
1. **Validation & Security**:
   - Thiếu body hoặc body rỗng (`400 Bad Request`).
   - `idToken` không phải chuỗi hoặc rỗng (`400 Bad Request`).
   - `idToken` giả mạo / hết hạn (`401 Unauthorized`).
   - Header `Origin` không thuộc allowlist (`403 Forbidden`).
2. **Account Conflict**:
   - Đăng ký tài khoản `local` (email + password), sau đó gửi yêu cầu Google Auth trùng email đó (khi token mang email đó). Giả lập hoặc kiểm tra lỗi conflict `409 Conflict`.
3. **Happy Path (với Google ID Token thực tế)**:
   - Gửi `idToken` hợp lệ từ Google:
     - Tạo mới User (`role: student`, `status: active`, `authProvider: google`, `providerId: sub`) và UserProfile (`fullName`, `avatarUrl`).
     - Trả về JSON `{ user: SafeUser, accessToken, accessTokenExpiresIn }` (HTTP 200).
     - Set cookie `toeic_refresh_token` (HTTP-only).
   - Gọi lại lần 2 với cùng Google Account $\rightarrow$ Đăng nhập thành công (Idempotency), không tạo trùng tài khoản.
   - Dùng `accessToken` vừa nhận gọi `GET /api/v1/auth/me` để xác thực phiên làm việc.
4. **Cleanup**:
   - Dọn dẹp dữ liệu test sinh ra trong database development.

---

## 2. Điều kiện chuẩn bị môi trường

1. Đảm bảo PostgreSQL đang chạy và migration đã được áp dụng:
   ```bash
   pnpm migration:run
   ```
2. Đảm bảo cấu hình file `.env` tại `apps/backend`:
   ```dotenv
   GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
   AUTH_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   REFRESH_COOKIE_NAME=toeic_refresh_token
   ```
3. Khởi động server backend:
   ```bash
   pnpm start:dev
   ```

---

## 3. Cách lấy Google ID Token thực tế (Manual Testing)

Để kiểm thử Happy Path (đăng nhập/đăng ký thành công thật với Google):
1. Truy cập [Google OAuth2 Playground](https://developers.google.com/oauthplayground) hoặc dùng frontend client đã tích hợp Google Sign-In.
2. Hoặc sử dụng client ID Google Cloud Console cấu hình cho domain `http://localhost:3000`.
3. Copy chuỗi `id_token` (JWT gồm 3 phần: header.payload.signature).
4. Trong Postman: Mở **Collection Variables** $\rightarrow$ Điền chuỗi vừa lấy vào biến `googleIdToken`.

*(Nếu chưa có real token ngay, các request validation, invalid token, empty body, origin restriction vẫn chạy tự động và pass 100%).*

---

## 4. Các biến Collection (Variables)

| Tên biến | Giá trị mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:3001/api/v1` | URL gốc của Backend API |
| `localTestEmail` | `s3t4.ticket1.local@example.com` | Email kiểm tra tài khoản local conflict |
| `localTestPassword` | `StrongPassword123!` | Mật khẩu tài khoản local |
| `googleIdToken` | `your-google-id-token-here` | Token Google ID để test Happy Path |
| `accessToken` | `""` | Tự động lưu token trả về sau khi Google auth thành công |

---

## 5. Cleanup SQL (Dành cho database development/test)

Nếu cần xóa sạch tài khoản do collection test tạo ra:

```sql
BEGIN;

-- Xóa user test conflict
DELETE FROM users
WHERE email = 's3t4.ticket1.local@example.com';

-- Xóa user tạo bởi Google OAuth (thay email bằng email tài khoản Google test của bạn)
DELETE FROM users
WHERE auth_provider = 'google';

COMMIT;
```
*(Các bảng `user_profiles` và `auth_sessions` được cấu hình `ON DELETE CASCADE` tự động xóa theo user)*.
