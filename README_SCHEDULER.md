# 자동 스케줄러 배포 가이드

## 1단계: SQL 실행 (Supabase Dashboard)

1. Supabase Dashboard 접속: https://supabase.com/dashboard/project/qdzdyoqtzkfpcogecyar
2. 왼쪽 메뉴에서 **SQL Editor** 클릭
3. **DEPLOY_SCHEDULER.sql** 파일 내용 전체 복사
4. SQL Editor에 붙여넣기 후 **Run** 버튼 클릭

### 예상 결과
```
✅ 환경 설정 완료
✅ pg_cron 확장 활성화됨
✅ trigger_daily_collection 함수 생성 완료
✅ 기존 작업 정리 완료
✅ cron 작업 등록 완료
✅ 모든 스케줄러 작업이 정상적으로 등록되었습니다!

📅 스케줄:
   - 04:00 KST: Meta 광고 데이터
   - 04:30 KST: Meta 성별/연령대
   - 05:00 KST: Meta 크리에이티브
   - 05:30 KST: Google Ads
   - 06:00 KST: Naver Ads
```

---

## 2단계: 스케줄러 확인

SQL Editor에서 다음 쿼리 실행:

```sql
-- 등록된 cron 작업 확인
SELECT * FROM cron.job ORDER BY jobname;
```

**예상 결과**: 5개 작업이 표시되어야 함
- daily-ad-data-collection-meta
- daily-ad-data-collection-meta-demographics
- daily-ad-data-collection-meta-creatives
- daily-ad-data-collection-google
- daily-ad-data-collection-naver

---

## 3단계: 수동 테스트 (선택사항)

### 방법 1: 함수 직접 호출
```sql
-- trigger_daily_collection 함수 수동 실행
SELECT trigger_daily_collection();

-- 결과 확인
SELECT * FROM collection_jobs ORDER BY created_at DESC LIMIT 5;
```

### 방법 2: Edge Function 직접 호출
```bash
curl -X POST \
  'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collect-ad-data' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0' \
  -H 'Content-Type: application/json' \
  -d '{
    "integration_id": "YOUR_INTEGRATION_ID",
    "start_date": "2026-01-11",
    "end_date": "2026-01-11",
    "mode": "daily",
    "collection_type": "ads"
  }'
```

---

## 4단계: Frontend에서 모니터링

1. 대시보드 접속: http://localhost:3000/admin/api-management
2. 하단 **"데이터 수집 현황"** 카드 확인
3. 실시간으로 진행 상황 업데이트됨

---

## 문제 해결

### 스케줄러가 실행되지 않는 경우

```sql
-- 1. 설정값 확인
SELECT current_setting('app.settings.supabase_url', true);
SELECT current_setting('app.settings.supabase_service_role_key', true);

-- 2. pg_cron 확장 확인
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 3. cron 실행 이력 확인
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### Edge Function 배포 확인

Supabase Dashboard → Edge Functions → 다음 함수들이 배포되어 있어야 함:
- collect-ad-data
- initial-collection
- resolve-access-token

---

## 스케줄러 일시 정지/재개

```sql
-- 모든 작업 일시 정지
SELECT cron.unschedule('daily-ad-data-collection-meta');
SELECT cron.unschedule('daily-ad-data-collection-meta-demographics');
SELECT cron.unschedule('daily-ad-data-collection-meta-creatives');
SELECT cron.unschedule('daily-ad-data-collection-google');
SELECT cron.unschedule('daily-ad-data-collection-naver');

-- 재개하려면 DEPLOY_SCHEDULER.sql 다시 실행
```

---

## 주요 파일 위치

- **배포 스크립트**: [DEPLOY_SCHEDULER.sql](DEPLOY_SCHEDULER.sql)
- **마이그레이션**: [supabase/migrations/004_scheduler.sql](supabase/migrations/004_scheduler.sql)
- **Edge Functions**:
  - [collect-ad-data](supabase/functions/collect-ad-data/index.ts)
  - [initial-collection](supabase/functions/initial-collection/index.ts)
- **Frontend 모니터링**: [CollectionMonitor.jsx](src/views/superadmin/api-management/components/CollectionMonitor.jsx)

---

## 다음 단계

1. ✅ DEPLOY_SCHEDULER.sql 실행
2. ✅ 스케줄러 확인 쿼리 실행
3. ⏳ 내일 새벽 4시부터 자동 수집 시작
4. 📊 Frontend에서 실시간 모니터링

자동 스케줄러가 정상적으로 배포되었습니다!
