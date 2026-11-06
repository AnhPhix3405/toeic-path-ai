# Hướng Dẫn Thiết Lập & Chạy Newman Cho Sprint 6 Task 3 (UC21: Exam Delivery & UI Split-View)

Tài liệu này hướng dẫn cách chạy bộ automated collection test cho **Task 3 (UC21: Lấy nội dung đề thi, phân trang câu hỏi theo Part và tối ưu UI split-view)**.

---

## 1. Mục Tiêu Kiểm Thử (Task 3 Scope)

Tập trung kiểm thử các **critical edge cases, business rules, boundary checks, permissions và payload integrity** của UC21 ngoài phạm vi E2E:
1. **Query Param Boundary Validation:**
   - `partNumber = 0` $\rightarrow$ HTTP 400 Bad Request
   - `partNumber = 8` $\rightarrow$ HTTP 400 Bad Request
   - `partNumber = 'abc'` $\rightarrow$ HTTP 400 Bad Request
   - Non-existent `attemptId` $\rightarrow$ HTTP 404 `ERR_ATTEMPT_NOT_FOUND`
2. **Granular Part Practice Delivery:**
   - Lọc chính xác Part 5 $\rightarrow$ chỉ trả về câu hỏi Part 5.
   - Lọc chính xác Part 6 $\rightarrow$ trả về câu hỏi Part 6 kèm nhóm đoạn văn `questionGroups`.
   - Lọc Part 7 không được chọn trong lượt Part Practice $\rightarrow$ HTTP 400 `ERR_PART_NOT_IN_ATTEMPT`.
   - Lấy toàn bộ không truyền `partNumber` $\rightarrow$ trả về đúng danh sách câu hỏi của các Part đã chọn (Parts 5 & 6), tuyệt đối không lẫn câu hỏi Part khác.
3. **Multi-User Security & Authorization:**
   - Học viên khác (Student 2) cố tình truy cập câu hỏi hoặc tổng quan của Student 1 $\rightarrow$ HTTP 403 `ERR_FORBIDDEN_ATTEMPT_ACCESS`.
   - Quản trị viên (Admin) truy cập câu hỏi và tổng quan của học viên $\rightarrow$ HTTP 200 OK (phục vụ giám sát thi và audit trail).
4. **Split-View UI Optimization & Security Leak Prevention:**
   - Nhóm câu hỏi đoạn văn (`questionGroups`) chứa đầy đủ `passageText`.
   - Mọi phương án trả về tuyệt đối KHÔNG lộ cờ `isCorrect`.
   - Ma trận tiến độ `questionsProgress` trong overview phản ánh đầy đủ `totalQuestions` câu hỏi với thứ tự và trạng thái chuẩn.
5. **Teardown & Lifecycle Cleanup:**
   - Hủy bỏ (`abandon`) lượt thi sau khi test xong để đảm bảo tính toàn vẹn trạng thái hệ thống.

---

## 2. Tiền Đề Môi Trường

1. **Docker Containers đang chạy:**
   - PostgreSQL (`toeic-path-ai-postgres`) trên port `5400`.
   - Redis (`toeic-path-ai-redis`) trên port `6379`.
2. **NestJS Backend đang chạy:**
   - Port: `http://localhost:3001`
3. **Dữ liệu mẫu (Seed Data):**
   ```bash
   pnpm --filter backend exec ts-node test/collections/sprint6/task5/seed-sprint6-postman.ts
   ```

---

## 3. Lệnh Chạy Kiểm Thử Tự Động (Newman CLI)

Để thực thi bộ test và đảm bảo 100% assertions pass:

```bash
npx newman run apps/backend/test/collections/sprint6/task3/sprint6-task3-exam-delivery.postman_collection.json --delay-request 100 --reporters cli --bail
```
