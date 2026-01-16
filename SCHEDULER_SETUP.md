# 자동 스케줄러 설정 가이드

## 1. DB 설정값 등록

Supabase SQL Editor에서 다음 쿼리를 실행하세요:

```sql
-- Supabase URL 설정
ALTER DATABASE postgres 
SET app.settings.supabase_url = 'https://qdzdyoqtzkfpcogecyar.supabase.co';

-- Service Role Key 설정 (실제 키로 교체 필요)
ALTER DATABASE postgres 
SET app.settings.supabase_service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
```

**주의**: `YOUR_SERVICE_ROLE_KEY_HERE`를 실제 Service Role Key로 교체하세요.
- Supabase Dashboard → Settings → API → service_role key (secret)

## 2. 마이그레이션 실행

```bash
cd /Users/reon/Desktop/개발/growth-dashboard
npx supabase db push
```

또는 Supabase Dashboard SQL Editor에서 직접 실행:
- `supabase/migrations/004_scheduler.sql` 파일 내용 복사 후 실행

## 3. pg_cron 확장 확인

```sql
-- pg_cron 확장이 활성화되었는지 확인
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 등록된 cron 작업 확인
SELECT * FROM cron.job ORDER BY jobname;
```

예상 결과: 5개 작업 등록됨
- `daily-ad-data-collection-meta` (04:00 KST)
- `daily-ad-data-collection-meta-demographics` (04:30 KST)
- `daily-ad-data-collection-meta-creatives` (05:00 KST)
- `daily-ad-data-collection-google` (05:30 KST)
- `daily-ad-data-collection-naver` (06:00 KST)

## 4. 스케줄러 수동 테스트

```sql
-- 설정값 확인
SELECT current_setting('app.settings.supabase_url', true);
SELECT current_setting('app.settings.supabase_service_role_key', true);

-- 수동으로 trigger_daily_collection 함수 실행
SELECT trigger_daily_collection();

-- 실행 결과 확인 (collection_jobs 테이블)
SELECT * FROM collection_jobs ORDER BY created_at DESC LIMIT 10;

-- cron 실행 이력 확인
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```

## 5. 스케줄러 일시 정지/재개

```sql
-- 특정 작업 일시 정지
SELECT cron.unschedule('daily-ad-data-collection-meta');

-- 작업 재등록 (004_scheduler.sql 참조)
SELECT cron.schedule(
  'daily-ad-data-collection-meta',
  '0 19 * * *',
  $$ ... $$
);

-- 모든 작업 확인
SELECT jobname, schedule, active FROM cron.job;
```

## 6. 문제 해결

### 스케줄러가 실행되지 않는 경우

1. **pg_cron 확장 확인**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
   없으면: `CREATE EXTENSION pg_cron;`

2. **설정값 확인**
   ```sql
   SELECT current_setting('app.settings.supabase_url', true);
   SELECT current_setting('app.settings.supabase_service_role_key', true);
   ```
   NULL이면 1번 단계 재실행

3. **Edge Function 상태 확인**
   - Supabase Dashboard → Edge Functions
   - `collect-ad-data` 함수가 배포되었는지 확인

4. **net.http_post 권한 확인**
   ```sql
   -- http 확장 활성화 확인
   SELECT * FROM pg_extension WHERE extname = 'http';
   ```

### 특정 시간에만 실행하고 싶은 경우

cron 표현식 수정:
- `0 19 * * *` → 매일 19:00 UTC (04:00 KST)
- `0 19 * * 1` → 매주 월요일 19:00 UTC
- `0 19 1 * *` → 매월 1일 19:00 UTC

## 7. 모니터링

Frontend에서 실시간 확인:
1. API 관리 페이지 접속
2. 하단 "데이터 수집 현황" 카드 확인
3. 진행 중인 작업, 완료/실패 상태 실시간 업데이트

## 8. 롤백

```sql
-- 모든 스케줄러 작업 삭제
SELECT cron.unschedule('daily-ad-data-collection-meta');
SELECT cron.unschedule('daily-ad-data-collection-meta-demographics');
SELECT cron.unschedule('daily-ad-data-collection-meta-creatives');
SELECT cron.unschedule('daily-ad-data-collection-google');
SELECT cron.unschedule('daily-ad-data-collection-naver');

-- 함수 삭제
DROP FUNCTION IF EXISTS trigger_daily_collection();

-- pg_cron 확장 제거 (선택적)
DROP EXTENSION IF EXISTS pg_cron;
```
