# Hướng dẫn Kiểm thử Postman — Sprint 5 Task 2

Collection kiểm thử:
```text
test/collections/sprint5/task2/sprint5-task2-exams.postman_collection.json
```

> [!WARNING]
> Chỉ chạy collection và các câu lệnh SQL cleanup trong tài liệu này trên môi trường `development` hoặc `test` cô lập. Tuyệt đối không chạy trên môi trường `production`.

---

## 1. Phạm Vi Nghiệp Vụ Kiểm Thử (Scope)

Collection kiểm thử toàn diện các nghiệp vụ cốt lõi của **Sprint 5 — Task 2: Khởi Tạo Đề Thi & Quản Lý Cấu Hình Cơ Bản (UC16)**:

1. **Khởi Tạo Đề Thi (`POST /api/v1/exams`):**
   - Tạo đề `full_test` thành công và **tự động seed 7 sections** (Part 1 đến 7) chuẩn TOEIC (6, 25, 39, 30, 30, 16, 54 câu) trong transaction.
   - Tạo đề `mini_test` và `placement_test` (không auto-seed sections).
   - Kiểm tra ràng buộc hợp lệ khung giờ thi (`openAt < closeAt`), bắt lỗi `400 Bad Request` (`ERR_INVALID_SCHEDULE_TIME`) khi `closeAt <= openAt`.
   - Bắt lỗi dữ liệu payload (tiêu đề quá ngắn < 5 ký tự, thời lượng <= 0 hoặc > 300 phút).
   - Phân quyền RBAC: Chặn vai trò Student truy cập endpoint tạo đề (`403 Forbidden`).

2. **Chi Tiết Đề Thi Quản Trị (`GET /api/v1/exams/:id/manage`):**
   - Giáo viên chủ sở hữu truy xuất thông tin chi tiết đầy đủ của đề thi cùng danh sách sections.
   - Quản trị viên (Admin) có quyền xem chi tiết đề thi của bất kỳ ai.
   - Chặn học viên truy cập vào endpoint quản trị (`403 Forbidden`).
   - Xử lý đề thi không tồn tại (`404 Not Found`).

3. **Cập Nhật Cấu Hình & Concurrency Locking (`PATCH /api/v1/exams/:id`):**
   - Cập nhật thành công các thông số khi version khớp; hệ thống tự động tăng `version = version + 1`.
   - Kiểm soát xung đột phiên làm việc (**Optimistic Locking**): Khi gửi version cũ hoặc lệch version, API từ chối với mã lỗi `409 Conflict` (`ERR_CONCURRENCY_CONFLICT`).
   - Bắt buộc phải có trường `version` trong request body.
   - Kiểm tra chéo lịch thi khi cập nhật bán phần (Partial Update): Nếu chỉ gửi `closeAt` mới mà nhỏ hơn `openAt` đang lưu trong CSDL, hệ thống phát hiện và ném lỗi `400 Bad Request` (`ERR_INVALID_SCHEDULE_TIME`).
   - Phân quyền RBAC: Chặn vai trò Student cập nhật đề thi (`403 Forbidden`).

4. **Xóa & Chặn Xóa Đề Thi (`DELETE /api/v1/exams/:id`):**
   - Soft Delete thành công khi đề thi chưa có bài làm (`is_deleted = true`, `deleted_at = now()`).
   - Đề thi đã xóa mềm không còn truy xuất được qua `GET /manage` (`404 Not Found`) và không thể bị sửa đè qua `PATCH` (`404 Not Found`).
   - Phân quyền RBAC: Chặn vai trò Student xóa đề thi (`403 Forbidden`).

---

## 2. Chuẩn Bị Backend & Môi Trường

1. Khởi động PostgreSQL và Redis container hiện hữu (Rule #1001: cổng `5400` và `6379`).
2. Đảm bảo migration mới nhất đã được áp dụng:
   ```bash
   pnpm --filter backend migration:run
   ```
3. Khởi động Backend server:
   ```bash
   pnpm --filter backend start:dev
   ```
4. Collection mặc định sử dụng `http://localhost:3001/api/v1` làm `baseUrl`.

---

## 3. Cấu Hình Postman Collection Variables

Sau khi import file `sprint5-task2-exams.postman_collection.json` vào Postman, thiết lập các biến sau trong tab **Variables** của Collection:

| Tên biến | Giá trị mẫu | Mô tả |
|---|---|---|
| `baseUrl` | `http://localhost:3001/api/v1` | URL gốc của Backend API |
| `adminEmail` | `admin@example.com` | Email tài khoản Admin có sẵn |
| `adminPassword` | `AdminPassword123!` | Mật khẩu tài khoản Admin |
| `teacherEmail` | `sprint5.task2.teacher@example.com` | Email ứng viên Teacher |
| `studentEmail` | `sprint5.task2.student@example.com` | Email tài khoản Student |
| `testPassword` | `StrongPassword123!` | Mật khẩu tài khoản test |

---

## 4. Thứ Tự Thực Thi Trong Collection Runner

Chạy collection tuần tự từ trên xuống dưới bằng Postman Collection Runner:

1. **`00 - Setup & Auth`**:
   - `00.1 - Register Student Candidate` (201/409)
   - `00.2 - Register Teacher Candidate` (201/409)
   - `00.3 - Login Admin` (lấy `adminToken`)
   - `00.4 - Find Teacher Candidate User ID` (tra cứu ID của teacher)
   - `00.5 - Upgrade Teacher Role via Admin` (nâng cấp role lên `teacher`)
   - `00.6 - Login Teacher` (lấy `teacherToken`)
   - `00.7 - Login Student` (lấy `studentToken`)
2. **`01 - Create Exam (POST /exams)`**:
   - `01.1 - Create Full Test (Auto-seed 7 Sections)`: Kiểm tra mã 201, `sectionsCount === 7`, `version === 1`.
   - `01.2 - Create Mini Test (No Auto-seeding)`: Kiểm tra mã 201, `sectionsCount === 0`.
   - `01.3 - Create Placement Test with Schedule Window`: Kiểm tra lưu trữ mốc thời gian mở/đóng.
   - `01.4 - Validation Error: closeAt earlier than openAt`: Kiểm tra mã 400 `ERR_INVALID_SCHEDULE_TIME`.
   - `01.5 - Validation Error: Title Too Short & Duration = 0`: Kiểm tra mã 400.
   - `01.6 - RBAC Guard: Student Cannot Create Exam`: Kiểm tra mã 403.
3. **`02 - Get Exam Management Detail (GET /exams/:id/manage)`**:
   - `02.1 - Teacher Get Own Full Test Detail`: Kiểm tra mã 200, danh sách 7 sections chuẩn.
   - `02.2 - Admin Get Full Test Detail`: Kiểm tra mã 200 cho Admin.
   - `02.3 - RBAC Guard: Student Cannot Access Manage Endpoint`: Kiểm tra mã 403.
   - `02.4 - Not Found: Non-existent Exam UUID`: Kiểm tra mã 404.
4. **`03 - Update Exam Configuration (PATCH /exams/:id)`**:
   - `03.1 - Teacher Update Exam Title & Duration`: Kiểm tra mã 200, `version` tăng lên 2.
   - `03.2 - Optimistic Locking Conflict (Stale Version)`: Gửi version cũ, kiểm tra mã 409 `ERR_CONCURRENCY_CONFLICT`.
   - `03.3 - Missing Version Field in Payload`: Thiếu version, kiểm tra mã 400.
   - `03.4 - Partial Update Schedule Conflict`: Cập nhật `closeAt` nhỏ hơn `openAt` hiện hữu, kiểm tra mã 400 `ERR_INVALID_SCHEDULE_TIME`.
   - `03.5 - RBAC Guard: Student Cannot Update Exam`: Kiểm tra mã 403.
5. **`04 - Delete & Delete Guards (DELETE /exams/:id)`**:
   - `04.1 - RBAC Guard: Student Cannot Delete Exam`: Kiểm tra mã 403.
   - `04.2 - Teacher Soft Delete Mini Test`: Kiểm tra mã 200, `success === true`.
   - `04.3 - Verify Soft Deleted Exam Cannot Be Retrieved`: Kiểm tra mã 404.
   - `04.4 - Verify Soft Deleted Exam Cannot Be Updated`: Kiểm tra mã 404.
   - `04.5 - Cleanup: Soft Delete Remaining Test Exams`: Dọn dẹp các đề thi test còn lại.

---

## 5. Dọn Dẹp Dữ Liệu Sau Kiểm Thử (Database Cleanup SQL)

Nếu muốn xóa triệt để dữ liệu phát sinh trong quá trình chạy collection khỏi database `development`/`test`:

```sql
-- 1. Xóa các đề thi do collection Sprint 5 Task 2 tạo ra
DELETE FROM exams
WHERE title LIKE '%[S5T2]%';

-- 2. Xóa các tài khoản test chuyên biệt của Sprint 5 Task 2
DELETE FROM users
WHERE email IN (
  'sprint5.task2.student@example.com',
  'sprint5.task2.teacher@example.com'
);
```

> [!NOTE]
> Các bản ghi liên quan trong `exam_sections`, `user_profiles`, `auth_sessions` sẽ tự động bị xóa theo ràng buộc khóa ngoại `CASCADE`.
