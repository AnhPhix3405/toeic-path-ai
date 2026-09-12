# Hướng dẫn chuẩn bị Postman - Sprint 2 Task 8

Tài liệu này hướng dẫn chuẩn bị môi trường trước khi chạy collection kiểm thử profile:

```text
test/collections/sprint2-task8-profile.postman_collection.json
```

Chỉ sử dụng database development hoặc test riêng biệt. Không chạy collection trên production
hoặc database có dữ liệu cần giữ lại vì collection tạo tài khoản, thay đổi role, khóa tài khoản và
revoke session.

## 1. Yêu cầu

- Node.js và `pnpm` theo phiên bản của repository.
- PostgreSQL đang hoạt động.
- Backend đã cài dependencies và áp dụng đầy đủ migration.
- Postman Desktop hoặc Postman Web có Desktop Agent.
- File `.env` hợp lệ trong `apps/backend`.

## 2. Cấu hình Admin trong `.env`

Backend không có route đăng ký Admin công khai. Khai báo tài khoản Admin ban đầu trong `.env`:

```dotenv
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=replace-with-a-strong-password
```

Mật khẩu phải có ít nhất 12 ký tự. Không sao chép mật khẩu thật vào collection và không commit
file `.env`.

Nếu Admin chưa tồn tại, chạy từ thư mục `apps/backend`:

```powershell
pnpm run seed:admin
```

Seed tạo tài khoản Admin và profile tương ứng trong cùng một transaction. Nếu Admin đã tồn tại,
script không tạo lại hoặc đổi mật khẩu.

## 3. Chuẩn bị backend

Từ thư mục `apps/backend`:

```powershell
pnpm install --frozen-lockfile
pnpm migration:run
pnpm start:dev
```

Theo cấu hình mặc định, kiểm tra Swagger tại:

```text
http://localhost:3001/api/docs
```

Nếu `PORT` trong `.env` khác `3001`, cần đổi `baseUrl` trong Postman cho phù hợp.

## 4. Import collection

Trong Postman:

1. Chọn **Import**.
2. Chọn file `test/collections/sprint2-task8-profile.postman_collection.json`.
3. Mở collection vừa import và chọn tab **Variables**.
4. Điền cả **Initial value** và **Current value** cho các biến cần thiết.

Các biến chính:

| Biến | Giá trị |
| --- | --- |
| `baseUrl` | Ví dụ `http://localhost:3001/api/v1` |
| `adminEmail` | Giá trị `INITIAL_ADMIN_EMAIL` trong `.env` |
| `adminPassword` | Giá trị `INITIAL_ADMIN_PASSWORD` trong `.env` |
| `studentEmail` | Mặc định `swagger.task8.student@example.com` |
| `teacherEmail` | Mặc định `swagger.task8.teacher@example.com` |
| `testPassword` | Mật khẩu của hai tài khoản test |

Không export hoặc chia sẻ collection sau khi đã lưu `adminPassword`. Nếu cần chia sẻ collection,
xóa giá trị mật khẩu trước khi export.

Các biến token và ID sau đây được collection tự cập nhật trong quá trình chạy:

- `studentToken`
- `teacherToken`
- `adminToken`
- `studentUserId`
- `teacherUserId`
- `studentSnapshot`

## 5. Dữ liệu test

Collection đăng ký hai tài khoản:

```text
swagger.task8.student@example.com
swagger.task8.teacher@example.com
```

Public registration ban đầu tạo cả hai dưới role `student`. Các request setup sau đó dùng Admin để
tìm tài khoản Teacher, đổi role thành `teacher`, rồi đăng nhập lại để lấy access token mới.

Nếu hai email đã tồn tại, request đăng ký chấp nhận cả HTTP `201` và `409`. Tuy nhiên, mật khẩu và
trạng thái của tài khoản hiện có phải phù hợp với các biến trong collection. Để có kết quả dễ lặp
lại, nên dùng database test sạch hoặc xóa riêng hai tài khoản test trước khi chạy.

## 6. Thứ tự chạy

Chạy các folder theo thứ tự hiển thị:

1. `00 - Setup`
2. `01 - Read and authorization`
3. `02 - Successful updates`
4. `03 - Validation and mass assignment`
5. `04 - Session and account status`

Không chạy riêng các request phụ thuộc token hoặc ID trước folder setup.

Folder cuối thực hiện logout, khóa rồi mở khóa Student. Nếu quá trình chạy bị dừng ngay sau request
khóa tài khoản, cần dùng Admin gọi endpoint sau để mở khóa lại:

```http
PATCH /api/v1/admin/users/{studentUserId}/status
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "status": "active"
}
```

## 7. Lưu ý về quyền Admin

Tài liệu Swagger Task 8 ban đầu mô tả Admin nhận HTTP `403` tại `/profile/me`. Contract UC06 hiện
tại đã được cập nhật: Admin active được phép xem, sửa và quản lý avatar của profile thuộc chính
access token của Admin.

Vì vậy collection hiện mong đợi HTTP `200` khi Admin gọi GET/PATCH `/profile/me`. Client không có
tham số `userId` hoặc `profileId` để chọn profile của người khác.

## 8. Sau khi chạy

- Xác nhận request `TC18 - Unlock Student cleanup` thành công.
- Không lưu hoặc chia sẻ token và mật khẩu Admin.
- Có thể xóa hai tài khoản test trên database development/test; profile và session liên quan sẽ
  được xóa theo foreign key cascade.

```sql
DELETE FROM users
WHERE email IN (
  'swagger.task8.student@example.com',
  'swagger.task8.teacher@example.com'
);
```
