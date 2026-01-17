# 데이터 수집 타임아웃 문제 해결 완료 보고서

## 문제 상황

### 1. 발생한 문제
- 2년치 데이터 수집 시 Edge Function이 타임아웃으로 중단됨
- CollectionMonitor에 job이 중복 생성됨 (청크마다 job 생성)
- 백그라운드 실행이 Edge Function 종료와 함께 강제 중단됨

### 2. 원인 분석
**Edge Function 타임아웃:**
- Supabase Edge Function은 최대 실행 시간 제한 있음
- 2년 데이터 = 8개 청크 × 각 처리 시간 → 타임아웃 확정
- 백그라운드 실행(await 없이)도 함수 종료 시 중단됨

**Job 중복 생성:**
- `initial-collection`이 job 생성
- `collect-ad-data`도 매번 job 생성
- → CollectionMonitor에 불필요한 job 다수 표시

## 완료된 작업

### 1. Job 중복 생성 해결 ✅
**결과:**
- CollectionMonitor에 1개 job만 표시 (Meta: 3개 - 광고/연령대/크리에이티브)
- 진행률은 `chunks_completed/chunks_total`로 추적

### 2. 데이터 중복 방지 확인 ✅
**DB 제약조건:**
- `ad_performance`: UNIQUE(`advertiser_id`, `source`, `campaign_ad_id`, `date`)
- `ad_creatives`: UNIQUE(`advertiser_id`, `ad_id`)
- `ad_performance_demographics`: UNIQUE(`advertiser_id`, `source`, `date`, `gender`, `age`)

### 3. 타임아웃 해결 ✅
**해결 방안: Queue + Cron Job 시스템**

## 최종 해결 방안: Queue + Cron Job

### 아키텍처

```
사용자 요청 → initial-collection
    ↓
청크 정보를 collection_queue에 저장 (job 생성 + 청크 INSERT)
    ↓
즉시 202 응답 반환
    ↓
pg_cron (1분마다 실행)
    ↓
collection-worker Edge Function
    ↓
pending 청크 1개 조회 → collect-ad-data 호출 → 상태 업데이트
```

### 기존 시스템과의 차별점
| 구분 | scheduler-worker (daily) | collection-worker (initial) |
|------|-------------------------|---------------------------|
| 테이블 | collection_jobs (pending) | collection_queue (pending) |
| 처리 단위 | 1개 Job (1일치) | 1개 청크 (90/60/30일 분할) |
| Job 생성 | trigger_scheduled_collection() | initial-collection |
| 재시도 | 없음 | 최대 3회 |
| 함수 이름 | invoke_scheduler_worker() | invoke_collection_worker() |

## 구현 상세

### 1. DB 테이블 추가

**파일:** `supabase/migrations/019_collection_queue.sql`

```sql
-- collection_queue 테이블 생성
CREATE TABLE IF NOT EXISTS collection_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES collection_jobs(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- 청크 정보
  chunk_index INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  collection_type TEXT NOT NULL,

  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- 에러 정보
  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_collection_type CHECK (collection_type IN ('ads', 'demographics', 'creatives')),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries),

  -- 중복 방지
  UNIQUE(job_id, chunk_index)
);

-- 인덱스
CREATE INDEX idx_collection_queue_status_created
ON collection_queue(status, created_at ASC)
WHERE status IN ('pending', 'processing');

CREATE INDEX idx_collection_queue_job_id
ON collection_queue(job_id, status);

CREATE INDEX idx_collection_queue_integration
ON collection_queue(integration_id);

-- RPC 함수 3개
CREATE FUNCTION increment_chunks_completed(p_job_id UUID) ...
CREATE FUNCTION increment_chunks_failed(p_job_id UUID) ...
CREATE FUNCTION check_and_finalize_job(p_job_id UUID) ...
```

### 2. initial-collection 수정

**파일:** `supabase/functions/initial-collection/index.ts`

**변경 내용:**
```typescript
// 1개 Job 생성 (status: 'pending'으로 변경)
const { data: job } = await supabase
  .from('collection_jobs')
  .insert({
    status: 'pending',  // 기존: 'running'
    chunks_total: chunks.length,
    // ...
  })

// 청크를 collection_queue에 INSERT
const queueInserts = chunks.map((chunk, index) => ({
  job_id: job.id,
  integration_id: integrationId,
  chunk_index: index,
  start_date: chunk.start,
  end_date: chunk.end,
  collection_type: collectionType,
  status: 'pending'
}))

await supabase.from('collection_queue').insert(queueInserts)
```

### 3. collection-worker 생성

**파일:** `supabase/functions/collection-worker/index.ts` (신규)

**핵심 로직:**
1. pending 청크 1개 조회 (LIMIT 1, ORDER BY created_at ASC)
2. status를 'processing'으로 변경 (동시성 제어)
3. `collect-ad-data` 호출 (job_id 전달)
4. 성공 시:
   - 청크 status를 'completed'
   - `increment_chunks_completed(job_id)` 호출
   - `check_and_finalize_job(job_id)` 호출
5. 실패 시:
   - retry_count < max_retries: status를 'pending', retry_count++
   - 초과 시: status를 'failed', `increment_chunks_failed(job_id)` 호출

### 4. Cron Job 등록

**파일:** `supabase/migrations/020_collection_worker_cron.sql`

```sql
-- Edge Function 호출 함수
CREATE OR REPLACE FUNCTION invoke_collection_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_get(
    url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collection-worker'
  );
END;
$$;

-- Cron Job 등록 (매 분마다)
SELECT cron.schedule(
  'collection-worker',
  '* * * * *',
  $$SELECT invoke_collection_worker()$$
);
```

**중요:** Supabase Dashboard → Edge Functions → collection-worker → Settings에서 **"Verify JWT" 옵션을 OFF**로 설정해야 합니다.

### 5. collect-ad-data는 변경 없음 ✅
- job_id 받으면 단일 청크만 처리 (Line 92-119)
- 기존 로직 그대로 유지

## 데이터 흐름

```
1. User → initial-collection 호출
2. Job 생성 (status='pending', chunks_total=8)
3. collection_queue에 8개 청크 INSERT (status='pending')
4. HTTP 202 응답 즉시 반환
   ---
5. 1분 후: pg_cron → collection-worker 실행
6. pending 청크 1개 조회 (chunk_index=0)
7. status='processing' 변경
8. collect-ad-data 호출 (job_id 전달)
9. 성공 → status='completed', chunks_completed++
10. check_and_finalize_job() 호출 → Job 아직 진행 중
   ---
11. 2분 후: 다음 청크 처리 (chunk_index=1)
   ...
   ---
12. 8분 후: 마지막 청크 처리 (chunk_index=7)
13. check_and_finalize_job() 호출
14. chunks_completed=8 → Job status='completed'
15. Integration status='success'로 업데이트
```

## 배포된 파일

### 생성된 파일
1. `supabase/migrations/019_collection_queue.sql` - 테이블 + RPC 함수
2. `supabase/migrations/020_collection_worker_cron.sql` - Cron Job 등록
3. `supabase/functions/collection-worker/index.ts` - Worker 함수

### 수정된 파일
1. `supabase/functions/initial-collection/index.ts`
   - Line 203: status: 'pending'
   - Line 216-235: collection_queue INSERT로 교체

### 변경 없는 파일
1. `supabase/functions/collect-ad-data/index.ts` - 기존 로직 유지

## 장점

1. **타임아웃 없음**: 1분마다 청크 1개씩 처리
2. **기존 로직 보존**: collect-ad-data 변경 없음
3. **재시도 보장**: 실패 시 자동 재시도 (최대 3회)
4. **진행 추적**: CollectionMonitor에서 실시간 확인
5. **부분 실패 허용**: 일부 청크 실패해도 나머지 계속 진행
6. **scheduler-worker와 분리**: 함수 이름, 테이블 완전히 분리되어 충돌 없음

## 단점

- **처리 속도**: 8개 청크 = 최소 8분 소요 (기존: 타임아웃으로 완료 불가)

## 테스트 방법

1. 2년치 데이터 수집 요청 → 202 응답 즉시 확인
2. `collection_queue` 테이블에서 8개 pending 청크 확인
3. CollectionMonitor에서 job 1개 확인 (Meta는 3개)
4. 1분마다 `chunks_completed` 증가 확인
5. 8분 후 Job status='completed' 확인
6. Integration status='success' 확인

## 복원 방법 (문제 발생 시)

### 1. Cron Job 삭제
```sql
SELECT cron.unschedule('collection-worker');
DROP FUNCTION IF EXISTS invoke_collection_worker();
```

### 2. RPC 함수 삭제
```sql
DROP FUNCTION IF EXISTS increment_chunks_completed(UUID);
DROP FUNCTION IF EXISTS increment_chunks_failed(UUID);
DROP FUNCTION IF EXISTS check_and_finalize_job(UUID);
```

### 3. 테이블 삭제
```sql
DROP TABLE IF EXISTS collection_queue CASCADE;
```

### 4. Edge Function 제거
```bash
rm -rf supabase/functions/collection-worker
```

### 5. initial-collection 원복
```bash
git log  # 커밋 해시 확인
git revert [커밋 해시]
git push
```

또는 GitHub에서 이전 버전으로 복구

## 주의사항

1. **Edge Function 설정**: collection-worker의 "Verify JWT" 옵션을 OFF로 설정해야 Cron에서 호출 가능
2. **Supabase Dashboard에서 SQL 수동 실행**: 마이그레이션 파일이 자동으로 실행되지 않을 수 있으므로 Dashboard에서 수동 실행 필요
3. **pg_cron 확인**: Cron Job이 정상적으로 등록되었는지 확인
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'collection-worker';
   ```

## 문의사항

다른 클로드와 작업 시 이 문서를 참고하여:
1. 시스템 아키텍처 이해
2. 문제 발생 시 복원 방법 확인
3. 추가 기능 구현 시 기존 로직과 충돌하지 않도록 주의
