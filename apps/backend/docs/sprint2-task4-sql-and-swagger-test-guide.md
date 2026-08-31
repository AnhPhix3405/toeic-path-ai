# Sprint 2 - Task 4: Hướng dẫn test cleanup auth session

Tài liệu này hướng dẫn tạo dữ liệu mẫu bằng SQL và kiểm thử thủ công qua Swagger UI cho chức
năng xóa các session đã hết hạn hoặc bị revoke quá thời gian lưu trữ.

> Chỉ thực hiện trên database development/test. Không chạy các câu lệnh tạo hoặc xóa dữ liệu
> mẫu trong production.

## 1. Điều kiện chuẩn bị

1. Khởi động PostgreSQL và chạy migration:

   ```bash
   pnpm migration:run
   ```

2. Cấu hình `.env` để dễ quan sát cleanup:

   ```env
   AUTH_SESSION_CLEANUP_ENABLED=true
   AUTH_SESSION_RETENTION_DAYS=7
   AUTH_SESSION_CLEANUP_BATCH_SIZE=2
   AUTH_SESSION_CLEANUP_MAX_BATCHES=100
   AUTH_SESSION_CLEANUP_CRON=0 * * * * *
   ```

   Biểu thức trên chạy ở giây `0` mỗi phút. Chỉ dùng lịch này khi test. Sau khi test, đổi lại:

   ```env
   AUTH_SESSION_CLEANUP_CRON=0 0 2 * * *
   ```

3. Khởi động lại backend sau mỗi lần thay đổi `.env`:

   ```bash
   pnpm start:dev
   ```

4. Mở Swagger UI:

   ```text
   http://localhost:3001/api/docs
   ```

5. Tạo một user test bằng `POST /api/v1/auth/register`:

   ```json
   {
     "email": "cleanup.test@example.com",
     "password": "StrongPassword123!"
   }
   ```

## 2. Kết nối database không cần UI

Nếu PostgreSQL chạy trong Docker, có thể mở `psql` bên trong container:

```bash
docker compose exec postgres psql -U admin -d toeic_path_ai_db
```

Tên service, username và database phải được thay bằng giá trị thực tế trong Compose và `.env`.
Nếu máy đã cài PostgreSQL client:

```bash
psql -h localhost -p 5400 -U admin -d toeic_path_ai_db
```

Không ghi password thật vào file tài liệu hoặc lịch sử lệnh.

## 3. SQL tạo dữ liệu mẫu

Script dùng user `cleanup.test@example.com` đã tạo qua Swagger. `refresh_token_hash` trong dữ liệu
mẫu chỉ là placeholder, không phải token hợp lệ và không dùng để đăng nhập/refresh.

Script xóa và tạo lại duy nhất các row có `user_agent` bắt đầu bằng `task4-cleanup-test:` để có thể
chạy lại nhiều lần:

```sql
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'cleanup.test@example.com'
  ) THEN
    RAISE EXCEPTION
      'User cleanup.test@example.com does not exist. Create it through Swagger first.';
  END IF;
END $$;

DELETE FROM auth_sessions
WHERE user_agent LIKE 'task4-cleanup-test:%';

INSERT INTO auth_sessions (
  id,
  user_id,
  refresh_token_hash,
  expires_at,
  revoked_at,
  replaced_by_session_id,
  user_agent,
  ip_address,
  created_at
)
SELECT
  sample.id,
  test_user.id,
  repeat('a', 64),
  sample.expires_at,
  sample.revoked_at,
  sample.replaced_by_session_id,
  'task4-cleanup-test:' || sample.case_name,
  '127.0.0.1',
  sample.created_at
FROM users AS test_user
CROSS JOIN (
  VALUES
    (
      '40000000-0000-4000-8000-000000000001'::uuid,
      'active',
      NOW() + INTERVAL '30 days',
      NULL::timestamptz,
      NULL::uuid,
      NOW() - INTERVAL '1 day'
    ),
    (
      '40000000-0000-4000-8000-000000000002'::uuid,
      'recent-expired',
      NOW() - INTERVAL '1 day',
      NULL::timestamptz,
      NULL::uuid,
      NOW() - INTERVAL '2 days'
    ),
    (
      '40000000-0000-4000-8000-000000000003'::uuid,
      'old-expired',
      NOW() - INTERVAL '8 days',
      NULL::timestamptz,
      NULL::uuid,
      NOW() - INTERVAL '10 days'
    ),
    (
      '40000000-0000-4000-8000-000000000004'::uuid,
      'recent-revoked',
      NOW() + INTERVAL '30 days',
      NOW() - INTERVAL '1 day',
      NULL::uuid,
      NOW() - INTERVAL '2 days'
    ),
    (
      '40000000-0000-4000-8000-000000000005'::uuid,
      'old-revoked-future-expiry',
      NOW() + INTERVAL '30 days',
      NOW() - INTERVAL '8 days',
      NULL::uuid,
      NOW() - INTERVAL '10 days'
    ),
    (
      '40000000-0000-4000-8000-000000000006'::uuid,
      'old-expired-not-revoked',
      NOW() - INTERVAL '8 days',
      NULL::timestamptz,
      NULL::uuid,
      NOW() - INTERVAL '10 days'
    ),
    (
      '40000000-0000-4000-8000-000000000007'::uuid,
      'rotation-target-old',
      NOW() - INTERVAL '8 days',
      NULL::timestamptz,
      NULL::uuid,
      NOW() - INTERVAL '10 days'
    ),
    (
      '40000000-0000-4000-8000-000000000008'::uuid,
      'rotation-reference-active',
      NOW() + INTERVAL '30 days',
      NULL::timestamptz,
      '40000000-0000-4000-8000-000000000007'::uuid,
      NOW() - INTERVAL '1 day'
    )
) AS sample(
  id,
  case_name,
  expires_at,
  revoked_at,
  replaced_by_session_id,
  created_at
)
WHERE test_user.email = 'cleanup.test@example.com';

COMMIT;
```

## 4. Kiểm tra dữ liệu trước cleanup

```sql
SELECT
  split_part(user_agent, ':', 2) AS test_case,
  expires_at,
  revoked_at,
  replaced_by_session_id,
  CASE
    WHEN revoked_at < NOW() - INTERVAL '7 days'
      OR expires_at < NOW() - INTERVAL '7 days'
    THEN 'DELETE'
    ELSE 'KEEP'
  END AS expected_result
FROM auth_sessions
WHERE user_agent LIKE 'task4-cleanup-test:%'
ORDER BY created_at, id;
```

Kết quả mong đợi:

| Test case | Kết quả |
| --- | --- |
| `active` | Giữ lại |
| `recent-expired` | Giữ lại |
| `old-expired` | Xóa |
| `recent-revoked` | Giữ lại |
| `old-revoked-future-expiry` | Xóa theo `revoked_at` |
| `old-expired-not-revoked` | Xóa theo `expires_at` |
| `rotation-target-old` | Xóa |
| `rotation-reference-active` | Giữ lại |

Với batch size bằng `2`, bốn row đủ điều kiện được xóa qua ba lần gọi batch: `2`, `2`, rồi `0`.

## 5. Chờ cron và kiểm tra sau cleanup

Chờ qua giây `0` của phút kế tiếp, sau đó kiểm tra log backend. Mong đợi log tương tự:

```text
Auth session cleanup completed: deletedCount=4 batchCount=3 durationMs=... cutoff=...
```

Chạy query:

```sql
SELECT
  split_part(user_agent, ':', 2) AS test_case,
  replaced_by_session_id
FROM auth_sessions
WHERE user_agent LIKE 'task4-cleanup-test:%'
ORDER BY test_case;
```

Mong đợi còn đúng bốn row:

```text
active
recent-expired
recent-revoked
rotation-reference-active
```

`rotation-reference-active.replaced_by_session_id` phải là `NULL`. Điều này chứng minh FK dùng
`ON DELETE SET NULL` và không chặn cleanup.

Kiểm tra số lượng:

```sql
SELECT COUNT(*) AS remaining_test_sessions
FROM auth_sessions
WHERE user_agent LIKE 'task4-cleanup-test:%';
```

Kết quả mong đợi: `4`.

## 6. Test giới hạn số batch

1. Chạy lại SQL tạo dữ liệu mẫu.
2. Đổi `.env` và restart backend:

   ```env
   AUTH_SESSION_CLEANUP_BATCH_SIZE=2
   AUTH_SESSION_CLEANUP_MAX_BATCHES=1
   ```

3. Chờ một lượt cron.
4. Log phải có `deletedCount=2 batchCount=1`.
5. Chờ lượt cron tiếp theo để hai row đủ điều kiện còn lại được xóa.
6. Khôi phục `AUTH_SESSION_CLEANUP_MAX_BATCHES=100`.

## 7. Test tắt scheduler

1. Chạy lại SQL tạo dữ liệu mẫu.
2. Đặt `AUTH_SESSION_CLEANUP_ENABLED=false` và restart backend.
3. Chờ ít nhất một lượt cron.
4. Xác nhận không có row mẫu nào bị xóa.
5. Khôi phục `AUTH_SESSION_CLEANUP_ENABLED=true` và restart backend.

## 8. Các test case qua Swagger UI

Cleanup không có public/admin endpoint thủ công. Swagger được dùng để xác nhận login, refresh,
logout và session active không bị ảnh hưởng; kết quả xóa vật lý được xác nhận bằng SQL và log.

### TC01 - Login vẫn tạo session mới

Gọi `POST /api/v1/auth/login`:

```json
{
  "email": "cleanup.test@example.com",
  "password": "StrongPassword123!"
}
```

Mong đợi:

- HTTP `200 OK`.
- Response có `accessToken`, không có refresh token trong JSON.
- Browser nhận cookie `toeic_refresh_token` có cờ `HttpOnly`.
- Database có thêm một session active của user.

### TC02 - Session active không bị cleanup

1. Login như TC01 và copy `accessToken` vào nút `Authorize`.
2. Chờ ít nhất một lượt cron.
3. Gọi `GET /api/v1/auth/me`.

Mong đợi HTTP `200 OK` và trả đúng user. Session vừa tạo không bị xóa vì chưa hết hạn/revoke.

### TC03 - Refresh rotation vẫn hoạt động

1. Login lại để có refresh cookie hợp lệ.
2. Gọi `POST /api/v1/auth/refresh`, không nhập request body.
3. Kiểm tra tab Network/Application của browser.

Mong đợi:

- HTTP `200 OK`.
- Access token mới được trả về.
- Refresh cookie được thay bằng cookie mới.
- Session cũ được revoke và trỏ tới session mới.
- Vì session cũ mới bị revoke nên lượt cleanup hiện tại chưa xóa nó.

### TC04 - Logout vẫn revoke session

1. Dùng access token mới nhất trong `Authorize`.
2. Gọi `POST /api/v1/auth/logout`.

Mong đợi:

- HTTP `204 No Content`.
- Refresh cookie bị xóa.
- Session có `revoked_at` gần thời điểm hiện tại và chưa bị cleanup với retention 7 ngày.

### TC05 - Session bị cleanup không refresh được

1. Login lại bằng Swagger và giữ nguyên refresh cookie.
2. Trong database, tìm session mới nhất của user rồi làm nó hết hạn quá retention:

   ```sql
   UPDATE auth_sessions
   SET expires_at = NOW() - INTERVAL '8 days',
       created_at = NOW() - INTERVAL '10 days'
   WHERE id = (
     SELECT session.id
     FROM auth_sessions AS session
     JOIN users AS app_user ON app_user.id = session.user_id
     WHERE app_user.email = 'cleanup.test@example.com'
       AND session.revoked_at IS NULL
     ORDER BY session.created_at DESC
     LIMIT 1
   );
   ```

3. Chờ cron xóa session.
4. Gọi `POST /api/v1/auth/refresh` bằng cookie đang giữ trong browser.

Mong đợi:

- HTTP `401 Unauthorized`.
- Refresh cookie bị xóa.
- Backend không crash.

### TC06 - Access JWT đã phát hành không bị xóa khỏi browser

Sau TC05, JWT string vẫn có thể còn trong Swagger `Authorize`, nhưng gọi `GET /api/v1/auth/me`
phải trả `401` vì session tương ứng không còn trong database. Cleanup chỉ xóa session record, không
thể thu hồi hoặc xóa chuỗi JWT đã phát hành trên client.

### TC07 - Cleanup không ảnh hưởng RBAC

1. Login Admin và nhập access token Admin vào `Authorize`.
2. Chờ một lượt cleanup.
3. Gọi `GET /api/v1/admin/users`.

Mong đợi HTTP `200 OK`. Với Student/Teacher vẫn mong đợi `403 Forbidden` như test RBAC hiện có.

## 9. Query kiểm tra index và foreign key

Kiểm tra hai index phục vụ cleanup:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'auth_sessions'
  AND indexname IN (
    'auth_sessions_expires_at_idx',
    'auth_sessions_revoked_at_idx'
  )
ORDER BY indexname;
```

Mong đợi có hai row; index `revoked_at` có điều kiện `WHERE (revoked_at IS NOT NULL)`.

Kiểm tra delete rule của self-reference:

```sql
SELECT
  constraint_name,
  delete_rule
FROM information_schema.referential_constraints
WHERE constraint_schema = 'public'
  AND constraint_name = 'FK_auth_sessions_replacement';
```

Mong đợi `delete_rule = SET NULL`.

## 10. Dọn dữ liệu mẫu

Chỉ xóa các row có marker của tài liệu này:

```sql
DELETE FROM auth_sessions
WHERE user_agent LIKE 'task4-cleanup-test:%';
```

Nếu không còn cần user test và chắc chắn đang ở database development/test:

```sql
DELETE FROM users
WHERE email = 'cleanup.test@example.com';
```

FK `auth_sessions.user_id ON DELETE CASCADE` sẽ xóa session còn lại của user đó.

## 11. Checklist hoàn tất

- [ ] Migration tạo đủ hai cleanup index.
- [ ] Active session được giữ lại.
- [ ] Session mới hết hạn được giữ lại trong retention.
- [ ] Session hết hạn quá retention bị xóa.
- [ ] Session mới revoke được giữ lại trong retention.
- [ ] Session revoke quá retention bị xóa dù `expires_at` còn xa.
- [ ] Xóa theo `expires_at` hoạt động khi `revoked_at` là `NULL`.
- [ ] Cleanup chạy theo batch và dừng đúng `maxBatches`.
- [ ] FK rotation chuyển reference về `NULL` khi target bị xóa.
- [ ] `enabled=false` không chạy cleanup.
- [ ] Login, refresh rotation và logout vẫn hoạt động.
- [ ] Session active và RBAC không bị ảnh hưởng.
- [ ] Session đã cleanup không refresh hoặc gọi API bảo vệ được.
- [ ] Không có token hoặc token hash xuất hiện trong log.
- [ ] Đã trả cron về `0 0 2 * * *` sau khi test.
