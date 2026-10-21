# Hướng dẫn Kiểm thử Postman — Sprint 5 Task 3

Collection kiểm thử:
```text
test/collections/sprint5/task3/sprint5-task3-exams-structure.postman_collection.json
```

> [!WARNING]
> Chỉ chạy collection và các câu lệnh SQL cleanup trong tài liệu này trên môi trường `development` hoặc `test` cô lập. Tuyệt đối không chạy trên môi trường `production`.

---

## 1. Phạm Vi Nghiệp Vụ Kiểm Thử (Scope — UC17)

Collection kiểm thử toàn diện các nghiệp vụ cốt lõi của **Sprint 5 — Task 3: Thiết Lập Cấu Trúc Đề & Tuyển Chọn Câu Hỏi Từ Ngân Hàng (UC17)**:

1. **Thiết Lập Cấu Hình Sections (`POST /api/v1/exams/:id/sections`):**
   - Cấu hình danh sách Part, target questions count và target duration cho `mini_test` và `placement_test`.
   - **Khóa đề Full Test (PMR 012):** Chặn cấu hình trên đề `full_test` với mã lỗi `400 Bad Request` (`ERR_FULL_TEST_SECTIONS_IMMUTABLE`) vì 7 Part chuẩn TOEIC đã được cố định từ khi khởi tạo.
   - **Ràng buộc Placement Test (BR17.2):** Kiểm tra tổng số câu từ 20 đến 100 câu và bắt buộc có cả Listening (Part 1–4) và Reading (Part 5–7). Bắt lỗi `400 Bad Request` (`ERR_INVALID_PLACEMENT_TEST_STRUCTURE`) nếu vi phạm.
   - **Optimistic Locking:** Bắt buộc gửi `version`. Nếu gửi version cũ hoặc sai lệch, API từ chối với `409 Conflict` (`ERR_CONCURRENCY_CONFLICT`). Thành công tự động tăng `version = version + 1`.
   - **RBAC Guard:** Chặn học viên (Student) cấu hình sections (`403 Forbidden`).

2. **Tra Cứu Cấu Trúc Chi Tiết Đề Thi (`GET /api/v1/exams/:id/structure`):**
   - Trả về metadata đề thi, danh sách các sections (kèm `actualQuestionsCount` đếm số lượng câu hỏi thực tế trong section), và danh sách `questions` đã gán theo đúng thứ tự `orderIndex ASC`.
   - Giáo viên sở hữu đề thi hoặc Admin có quyền truy cập. Học viên bị từ chối (`403 Forbidden`) khi đề ở trạng thái `draft`.

3. **Tuyển Chọn & Nạp Câu Hỏi Vào Đề (`POST /api/v1/exams/:id/questions`):**
   - **Kiểm tra chéo quyền sở hữu Section (PMR 012):** Bắt buộc `sectionId` gửi lên phải tồn tại và thuộc về chính `examId` đó. Báo lỗi `400 Bad Request` (`ERR_SECTION_NOT_FOUND`) nếu gửi nhầm section của đề khác.
   - **Chặn xé nhóm ngầm (PMR 012):** Kiểm tra mọi câu hỏi trong `questionIds` đơn lẻ phải có `questionGroupId === null`. Báo lỗi `400 Bad Request` (`ERR_INVALID_GROUP_INTEGRITY`) nếu đưa câu hỏi nhóm vào mảng câu đơn.
   - **Chỉ nạp câu hỏi Published (BR17.4):** Chặn thêm câu hỏi chưa được phê duyệt xuất bản (`ERR_QUESTION_NOT_PUBLISHED`).
   - **Chặn trùng lặp câu hỏi (BR17.6):** Một câu hỏi chỉ xuất hiện tối đa 1 lần trong đề thi (`409 Conflict` - `ERR_DUPLICATE_EXAM_QUESTION`).
   - Tự động gán `orderIndex` liên tục tiếp nối câu hỏi hiện có trong đề, denormalize `question_group_id` và `group_order`.

4. **Sắp Xếp Lại Thứ Tự Câu Hỏi (`PUT /api/v1/exams/:id/questions/reorder`):**
   - Hoán vị thứ tự các câu hỏi trong đề từ $1..N$.
   - Tận dụng ràng buộc `DEFERRABLE INITIALLY DEFERRED` để cập nhật đồng loạt không bị lỗi unique constraint giữa chừng.
   - **Bảo toàn toàn vẹn nhóm (BR17.5 & PMR 012):** Bắt buộc các câu hỏi cùng `questionGroupId` phải có `orderIndex` liên tiếp nhau và giữ nguyên quan hệ tăng dần của `group_order`. Vi phạm ném `400 Bad Request` (`ERR_INVALID_GROUP_INTEGRITY`).
   - Bắt lỗi khi danh sách `items` không chứa đủ tất cả câu hỏi của đề thi (`ERR_INVALID_GROUP_INTEGRITY`).

5. **Gỡ Bỏ Câu Hỏi & Dồn Thứ Tự (`DELETE /api/v1/exams/:id/questions/:questionId?version=N`):**
   - Gỡ bỏ câu hỏi đơn: Xóa bản ghi và tự động dồn lại chuỗi `orderIndex` liên tục từ $1..N$.
   - Gỡ bỏ câu hỏi nhóm: Tự động xóa toàn bộ các câu hỏi con cùng thuộc `questionGroupId` đó và dồn lại chuỗi `orderIndex`.
   - Kiểm tra `version` query param để đảm bảo Optimistic Locking (`ERR_CONCURRENCY_CONFLICT`).

6. **Thuật Toán Sinh Đề Tự Động A4 (`POST /api/v1/exams/:id/auto-generate`):**
   - Sinh câu hỏi tự động bốc từ ngân hàng câu hỏi `published`.
   - **Giải thuật Knapsack / Target Matching (PMR 012):** Triệt tiêu nguy cơ overshoot chỉ tiêu số câu trong Part nhóm (Part 3, 4, 6, 7).
   - Rollback và trả về `422 Unprocessable Entity` (`ERR_QUESTION_BANK_INSUFFICIENT`) nếu ngân hàng thiếu câu hỏi.

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

Sau khi import file `sprint5-task3-exams-structure.postman_collection.json` vào Postman, thiết lập các biến sau trong tab **Variables** của Collection:

| Tên biến | Giá trị mẫu | Mô tả |
|---|---|---|
| `baseUrl` | `http://localhost:3001/api/v1` | URL gốc của Backend API |
| `adminEmail` | `admin@example.com` | Email tài khoản Admin có sẵn |
| `adminPassword` | `AdminPassword123!` | Mật khẩu tài khoản Admin |
| `teacherEmail` | `sprint5.task3.teacher@example.com` | Email ứng viên Teacher |
| `studentEmail` | `sprint5.task3.student@example.com` | Email tài khoản Student |
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
   - `00.8 - Create Mini Test for Structure Testing` (tạo đề mini test, lưu `miniTestExamId`)
   - `00.9 - Create Full Test for Structure Testing` (tạo đề full test, lưu `fullTestExamId`)
   - `00.10 - Create Placement Test Base` (tạo đề placement test, lưu `placementTestExamId`)
   - `00.11 - Seed Single Question 1 for Part 5` (tạo câu hỏi Part 5 published)
   - `00.12 - Seed Single Question 2 for Part 5` (tạo câu hỏi Part 5 published thứ hai)
2. **`01 - Configure Sections (POST /exams/:id/sections)`**:
   - `01.1 - Teacher Configure Sections for Mini Test (Part 1 & 5)`: 201 Created, `sectionsCount === 2`.
   - `01.2 - Teacher Configure Valid Placement Test Sections (50 Qs)`: 201 Created.
   - `01.3 - Error: Configure Sections on Full Test Forbidden`: 400 `ERR_FULL_TEST_SECTIONS_IMMUTABLE`.
   - `01.4 - Error: Placement Test with < 20 questions`: 400 `ERR_INVALID_PLACEMENT_TEST_STRUCTURE`.
   - `01.5 - Error: Placement Test missing Reading Section`: 400 `ERR_INVALID_PLACEMENT_TEST_STRUCTURE`.
   - `01.6 - Error: Optimistic Locking Stale Version`: 409 `ERR_CONCURRENCY_CONFLICT`.
   - `01.7 - RBAC Guard: Student Cannot Configure Sections`: 403 `ERR_FORBIDDEN_EXAM_ACCESS`.
3. **`02 - Get Structure (GET /exams/:id/structure)`**:
   - `02.1 - Teacher Get Own Exam Structure`: 200 OK.
   - `02.2 - Admin Get Exam Structure`: 200 OK.
   - `02.3 - RBAC Guard: Student Cannot Access Draft Structure`: 403 `ERR_FORBIDDEN_EXAM_ACCESS`.
   - `02.4 - Not Found: Non-existent Exam UUID`: 404 Not Found.
4. **`03 - Add Questions (POST /exams/:id/questions)`**:
   - `03.1 - Teacher Add Single Question to Section`: 201 Created.
   - `03.2 - Error: Section Does Not Belong to Exam`: 400 `ERR_SECTION_NOT_FOUND`.
   - `03.3 - Error: Duplicate Question In Exam`: 409 `ERR_DUPLICATE_EXAM_QUESTION`.
   - `03.4 - Teacher Add Second Question to Section`: 201 Created, `orderIndex = 2`.
   - `03.5 - Error: Optimistic Locking Stale Version`: 409 `ERR_CONCURRENCY_CONFLICT`.
   - `03.6 - RBAC Guard: Student Cannot Add Questions`: 403 Forbidden.
5. **`04 - Reorder Questions (PUT /exams/:id/questions/reorder)`**:
   - `04.1 - Teacher Validly Swap Question Order`: 200 OK (câu 1 đổi sang vị trí 2, câu 2 sang vị trí 1).
   - `04.2 - Error: Incomplete Question Items Array`: 400 `ERR_INVALID_GROUP_INTEGRITY`.
   - `04.3 - Error: Optimistic Locking Stale Version`: 409 `ERR_CONCURRENCY_CONFLICT`.
   - `04.4 - RBAC Guard: Student Cannot Reorder Questions`: 403 Forbidden.
6. **`05 - Remove Question (DELETE /exams/:id/questions/:questionId)`**:
   - `05.1 - Error: Optimistic Locking Stale Version on Delete`: 409 `ERR_CONCURRENCY_CONFLICT`.
   - `05.2 - Teacher Remove Question and Compact Orders`: 200 OK, câu còn lại dồn về `orderIndex = 1`.
   - `05.3 - Error: Question Not Found in Exam`: 404 Not Found.
   - `05.4 - RBAC Guard: Student Cannot Remove Question`: 403 Forbidden.
7. **`06 - Auto-Generate Exam A4 (POST /exams/:id/auto-generate)`**:
   - `06.1 - Error: Optimistic Locking Stale Version on Auto-generate`: 409 `ERR_CONCURRENCY_CONFLICT`.
   - `06.2 - RBAC Guard: Student Cannot Auto-Generate`: 403 Forbidden.
   - `06.3 - Teacher Auto-Generate Exam`: 201 Created hoặc 422 `ERR_QUESTION_BANK_INSUFFICIENT`.
8. **`07 - Cleanup`**:
   - `07.1 - Soft Delete Mini Test Exam`: 200 OK.
   - `07.2 - Soft Delete Placement Test Exam`: 200 OK.
   - `07.3 - Soft Delete Full Test Exam`: 200 OK.

---

## 5. SQL Dọn Dẹp Dữ Liệu Sau Kiểm Thử (Isolated Cleanup)

```sql
-- Dọn dẹp các câu hỏi liên kết trong đề thi kiểm thử Sprint 5 Task 3
DELETE FROM exam_questions WHERE exam_id IN (
  SELECT id FROM exams WHERE title LIKE '%Sprint 5 Task 3%'
);

-- Dọn dẹp sections của đề thi kiểm thử
DELETE FROM exam_sections WHERE exam_id IN (
  SELECT id FROM exams WHERE title LIKE '%Sprint 5 Task 3%'
);

-- Dọn dẹp các đề thi kiểm thử
DELETE FROM exams WHERE title LIKE '%Sprint 5 Task 3%';

-- Dọn dẹp câu hỏi kiểm thử được sinh trong bước Setup
DELETE FROM question_options WHERE question_id IN (
  SELECT id FROM questions WHERE content LIKE '%Sprint 5 Task 3 Sample Question%'
);
DELETE FROM questions WHERE content LIKE '%Sprint 5 Task 3 Sample Question%';
```
