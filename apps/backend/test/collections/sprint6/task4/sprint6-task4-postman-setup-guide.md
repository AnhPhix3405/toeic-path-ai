# Hướng Dẫn Thiết Lập & Chạy Newman Cho Sprint 6 Task 4 (UC22: Real-time Saving & Batch Offline Recovery)

Tài liệu này hướng dẫn cách chạy bộ automated collection test cho **Task 4 (UC22: Lưu câu trả lời real-time, đánh dấu review & batch offline sync)**.

---

## 1. Mục Tiêu Kiểm Thử (Task 4 Scope)

Tập trung kiểm thử các **critical edge cases, business rules, atomic counter, input bounds, offline recovery và strict authorization** của UC22 ngoài phạm vi E2E:
1. **Explicit Uncheck Mechanism:**
   - Thí sinh gửi `{ selectedOptionId: null }` $\rightarrow$ giải phóng phương án đã chọn, nguyên tử giảm `answeredCount` về `0`.
2. **Conditional Upsert Invariant:**
   - Thí sinh chỉ toggle cờ review `{ isMarkedForReview: true }` mà không gửi `selectedOptionId` $\rightarrow$ cơ chế Conditional Upsert bảo lưu nguyên vẹn đáp án đã chọn trong cơ sở dữ liệu (`answeredCount` không bị giảm hoặc xóa đè).
3. **Input Bounds & DTO Constraints:**
   - `timeSpentSeconds > 7200` $\rightarrow$ HTTP 400 Bad Request (`timeSpentSeconds không được vượt quá 7200 giây`).
   - `timeSpentSeconds < 0` $\rightarrow$ HTTP 400 Bad Request (`timeSpentSeconds không được âm`).
   - Mảng batch `answers: []` rỗng $\rightarrow$ HTTP 400 Bad Request (`answers phải có ít nhất 1 phần tử`).
   - `questionId` không tồn tại trong snapshot đề thi $\rightarrow$ HTTP 400 `ERR_QUESTION_NOT_IN_ATTEMPT`.
   - `selectedOptionId` không thuộc danh sách options của câu hỏi $\rightarrow$ HTTP 400 `ERR_INVALID_OPTION_CHOICE`.
4. **Offline Batch Recovery & Chronology Sync:**
   - Đồng bộ phục hồi mạng sau offline: gửi danh sách câu trả lời kèm `clientAnsweredAt`.
   - Xử lý cô lập lỗi ngoại lệ (In-Memory Pre-validation): nếu 1 câu bị lỗi ID (glitch), các câu hợp lệ khác vẫn được upsert thành công vào database và API trả về danh sách `failedItems` rõ ràng.
5. **Lifecycle Guards & Strict Authorization:**
   - Quản trị viên (Admin) hoặc thí sinh khác (Student 2) cố tình lưu đáp án thay cho thí sinh sở hữu $\rightarrow$ HTTP 403 `ERR_FORBIDDEN_ATTEMPT_ACCESS`.
   - Thí sinh cố tình lưu đáp án trên bài thi đã bị hủy (`abandoned`) $\rightarrow$ HTTP 400 `ERR_ATTEMPT_NOT_IN_PROGRESS`.

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
npx newman run apps/backend/test/collections/sprint6/task4/sprint6-task4-exam-answers.postman_collection.json --delay-request 100 --reporters cli --bail
```
