# Hướng dẫn Postman — Sprint 4 Task 4 (UC15 — Kiểm Duyệt Câu Hỏi & Phân Quyền RBAC)

Collection: `sprint4-task4-question-review.postman_collection.json`.

## 1. Phạm Vi Kiểm Thử

Collection này bao phủ toàn bộ 8 kịch bản kiểm thử trọng yếu theo đặc tả UC15 và [task4-plan.md](../../../../../meta/sprints/sprint4/task4/task4-plan.md):

1. **01 - Authentication:**
   - Đăng nhập 4 vai trò: Teacher 1 (Creator), Teacher 2 (Reviewer/Peer), Admin, Student.
   - Lưu trữ tự động JWT Bearer Token vào biến môi trường Postman.
2. **02 - Review Queue Retrieval:**
   - Lấy danh sách hàng đợi kiểm duyệt (`GET /api/v1/questions/reviews/queue`).
   - Xác thực eager loading: `options`, `part`, `creator`, và `questionGroup` (`context`, `title`).
3. **03 - Maker-Checker Defense (BR15.7 & E5):**
   - Teacher 1 tự duyệt câu hỏi do chính mình biên soạn $\rightarrow$ Bị chặn `403 Forbidden` (`ERR_CANNOT_SELF_REVIEW`).
4. **04 - Admin Emergency Bypass (BR15.7 & Audit Log):**
   - Admin tự duyệt câu hỏi của chính mình với `emergencyBypass: true` $\rightarrow$ Duyệt thành công `200 OK` (`published`), phát sinh Audit Log `ADMIN_REVIEW_BYPASS`.
5. **05 - Optimistic Locking Conflict (BR15.11 & E1):**
   - Reviewer gửi request duyệt với `version` không khớp phiên bản hiện tại $\rightarrow$ Trả về `409 Conflict` (`ERR_CONCURRENCY_CONFLICT`).
6. **06 - Revision Request & Rejection (BR15.4 & E2):**
   - Yêu cầu chỉnh sửa có `feedback` $\rightarrow$ Chuyển sang `revision_requested`, tăng `version`.
   - Yêu cầu chỉnh sửa thiếu `feedback` $\rightarrow$ Ném lỗi `400 Bad Request`.
   - Từ chối câu hỏi có `feedback` $\rightarrow$ Chuyển sang `rejected`.
7. **07 - Quick-Fix & Direct Approval (Tech Debt 006 Sync):**
   - Sửa nhanh nội dung câu hỏi/options và duyệt trực tiếp sang `published`.
   - Tự động snapshot phiên bản trước và sau vào `question_histories`.
   - Chấp nhận `content: null` cho Part 1 & Part 2.
   - Chặn rỗng text cho Part 3/4/5/6/7 và bắt buộc Single Choice Invariant (đúng 1 đáp án đúng).
8. **08 - Batch Review & RBAC Defenses:**
   - Phê duyệt hàng loạt danh sách câu hỏi với transaction độc lập cho từng item.
   - Tự động bỏ qua câu hỏi do chính Reviewer tạo hoặc xung đột version vào mảng `skipped`.
   - Student gọi API kiểm duyệt $\rightarrow$ Bị chặn `403 Forbidden`.
   - Tra cứu lịch sử snapshot (`GET /:id/histories`) và nhật ký kiểm duyệt (`GET /:id/logs`).

---

## 2. Chuẩn Bị & Chạy Kiểm Thử Bằng Newman CLI

### Bước 1: Khởi động container CSDL và Backend
```bash
docker compose up -d postgres redis
pnpm --filter backend start:dev
```

### Bước 2: Chạy kiểm thử Newman CLI
```bash
npx newman run apps/backend/test/collections/sprint4/task4/sprint4-task4-question-review.postman_collection.json \
  --env-var "baseUrl=http://localhost:3000/api/v1" \
  --env-var "teacher1Email=teacher1@example.com" \
  --env-var "teacher1Password=StrongPassword123!" \
  --env-var "teacher2Email=teacher2@example.com" \
  --env-var "teacher2Password=StrongPassword123!" \
  --env-var "adminEmail=admin@example.com" \
  --env-var "adminPassword=StrongPassword123!" \
  --env-var "studentEmail=student@example.com" \
  --env-var "studentPassword=StrongPassword123!"
```

---

## 3. SQL Dọn Dẹp Dữ Liệu Sau Kiểm Thử (Isolated Cleanup)

```sql
-- Dọn dẹp logs và snapshot kiểm duyệt câu hỏi test
DELETE FROM question_reviews WHERE reviewer_id IN (
  SELECT id FROM users WHERE email IN ('teacher1@example.com', 'teacher2@example.com', 'admin@example.com')
);

DELETE FROM question_histories WHERE changed_by IN (
  SELECT id FROM users WHERE email IN ('teacher1@example.com', 'teacher2@example.com', 'admin@example.com')
);
```
