# Hướng Dẫn Chạy Kiểm Thử Postman Sprint 6 — Task 2 (UC20)

Tài liệu hướng dẫn thực thi bộ kiểm thử chuyên sâu cho **Task 2: Khởi Tạo Lượt Thi, Kiểm Soát Giới Hạn & Snapshot Đề Thi (UC20)**.

---

## 1. Mục Tiêu & Phạm Vi Kiểm Thử (Scope)

- **Mục tiêu:** Kiểm chứng các Business Rules, Guards, Giới hạn và mã lỗi nghiệp vụ của UC20:
  - Kiểm tra trạng thái đề thi: Không tồn tại (`ERR_EXAM_NOT_AVAILABLE`), Chưa mở (`ERR_EXAM_NOT_YET_OPEN`), Đã đóng (`ERR_EXAM_CLOSED`).
  - Kiểm tra điều kiện Part Practice: Đề cấm thi Part (`ERR_PART_PRACTICE_NOT_ALLOWED`), mảng `selectedParts` rỗng hoặc phần tử không thuộc 1..7 (`ERR_INVALID_SELECTED_PARTS`).
  - Kiểm tra hạch toán số lượt thi: Chặn khi vượt quá `max_attempts` (`ERR_MAX_ATTEMPTS_EXCEEDED`, tính cả trạng thái `abandoned`).
  - Kiểm tra điều kiện hủy bài: Chặn hủy lại bài đã hủy (`ERR_ATTEMPT_NOT_IN_PROGRESS`), Không tìm thấy (`ERR_ATTEMPT_NOT_FOUND`).
- **Ngoài phạm vi (Out of scope):** Các luồng Happy Path và lifecycle chung đã được kiểm chứng ở Master E2E Suite.

---

## 2. Chuẩn Bị & Khởi Tạo Fixtures

1. **Dọn dẹp Redis Cache / Rate Limit:**
   ```bash
   docker exec toeic-path-ai-redis redis-cli FLUSHDB
   ```

2. **Nạp dữ liệu đề thi mẫu phục vụ kiểm thử:**
   ```bash
   pnpm --filter backend exec ts-node test/collections/sprint6/task5/seed-sprint6-postman.ts
   ```

---

## 3. Lệnh Chạy Newman CLI

```bash
newman run apps/backend/test/collections/sprint6/task2/sprint6-task2-exam-attempts.postman_collection.json \
  --delay-request 100 \
  --reporters cli \
  --bail
```

> **Tiêu chí nghiệm thu (Rule #777):** 100% assertions PASS.
