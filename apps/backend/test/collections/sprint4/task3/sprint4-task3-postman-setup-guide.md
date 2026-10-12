# Hướng dẫn Postman — Sprint 4 Task 3

Collection: `sprint4-task3-questions-import.postman_collection.json`.

## 1. Phạm Vi Kiểm Thử

Collection này bao phủ toàn bộ các yêu cầu nghiệp vụ và kỹ thuật của **Sprint 4 Task 3: Import Câu Hỏi Hàng Loạt từ Excel / Gói ZIP & Xử Lý Bất Đồng Bộ (UC14)**:

1. **Sinh & Tải File Mẫu (`GET /questions/import/template`):**
   - File Excel 15 cột chuẩn theo TOEIC: `Part`, `Question_Text`, `Option_A`, `Option_B`, `Option_C`, `Option_D`, `Correct_Answer`, `Explanation`, `Difficulty`, `Topic_Code`, `Skill_Code`, `Group_ID`, `Passage_Code`, `Passage_Text`, `Media_Ref`.
   - Dropdown data validation (Part 1-7, Correct Answer A-D, Difficulty easy/medium/hard).
   - Sheet hướng dẫn chi tiết quy tắc nhập liệu.
2. **Cơ Chế Phân Nhánh Đồng Bộ vs Bất Đồng Bộ (Sync vs Async BullMQ):**
   - **Tệp < 100 dòng:** Xử lý đồng bộ ngay lập tức, trả về `201 Created` kèm JSON kết quả import (`isAsync: false`, `successCount`, `errorCount`).
   - **Tệp $\ge$ 100 dòng:** Upload file gốc lên Cloud Storage, lưu `storageKey`, đẩy job vào BullMQ queue `questions-import-queue` (payload chỉ chứa metadata & storageKey, tuyệt đối không gửi buffer nhị phân qua Redis), trả về `202 Accepted` (`isAsync: true`, `jobId`).
3. **Phòng Vệ Zip Bomb & Zip Slip:**
   - Từ chối đường dẫn tương đối độc hại (`..`).
   - Giới hạn tối đa 500 file trong ZIP và dung lượng giải nén tối đa 150 MB.
4. **Group Atomicity & Rollback (BR14.6):**
   - Import câu hỏi theo nhóm (`Group_ID`): Nếu 1 câu con trong nhóm lỗi, toàn bộ nhóm bị rollback sạch sẽ, không tạo bản ghi rác.
5. **Kiểm Tra Whitelist Status Khi Thay Thế Media (003-PMR #4 & BR13.4):**
   - Chỉ cho phép thay thế tài nguyên media nếu câu hỏi / nhóm ở trạng thái `draft` hoặc `revision_requested`.
   - Nếu đã `published` hoặc `pending_review`: lập tức từ chối với lỗi `CANNOT_REPLACE_MEDIA_ON_PUBLISHED_CONTENT`.
6. **Submit for Review Trọn Gói Nhóm (003-PMR #5):**
   - Gửi duyệt 1 câu con trong nhóm $\rightarrow$ Hệ thống tự động gom toàn bộ câu con trong nhóm cùng gửi duyệt (`pending_review`). Nếu 1 câu con chưa hợp lệ, từ chối cả nhóm.
7. **Rate Limiting & RBAC:**
   - Áp dụng Policy `questionsImport` (5 lần / 15 phút per user).
   - Bảo vệ phân quyền: chỉ cho phép `TEACHER` và `ADMIN`. `STUDENT` nhận `403 Forbidden`.

---

## 2. Chuẩn Bị & Chạy Kiểm Thử

### Bước 1: Khởi động dịch vụ
```bash
docker compose up -d postgres
pnpm --filter backend start:dev
```

### Bước 2: Chạy Newman CLI
```bash
npx newman run apps/backend/test/collections/sprint4/task3/sprint4-task3-questions-import.postman_collection.json \
  --env-var "baseUrl=http://localhost:3001" \
  --env-var "teacherEmail=teacher@example.com" \
  --env-var "teacherPassword=StrongPassword123!" \
  --env-var "adminEmail=admin@example.com" \
  --env-var "adminPassword=StrongPassword123!"
```

---

## 3. SQL Dọn Dẹp Dữ Liệu Sau Kiểm Thử (Isolated Cleanup)

```sql
-- Dọn dẹp dữ liệu kiểm thử Import Job
DELETE FROM import_jobs WHERE file_name LIKE '%test%' OR file_name LIKE '%questions_%';

-- Dọn dẹp câu hỏi và nhóm câu hỏi kiểm thử
DELETE FROM question_options WHERE question_id IN (
  SELECT id FROM questions WHERE content LIKE '%Test Import%' OR content LIKE '%GRP_SAMPLE%'
);
DELETE FROM media_resources WHERE file_name LIKE '%test%' OR file_name LIKE '%conversation_%';
DELETE FROM questions WHERE content LIKE '%Test Import%' OR content LIKE '%GRP_SAMPLE%';
DELETE FROM question_groups WHERE title LIKE '%GRP_%' OR context LIKE '%Test Import%';
```
