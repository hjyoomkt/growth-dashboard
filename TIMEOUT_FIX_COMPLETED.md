# 타임아웃 해결 작업 완료 보고서

## 작업 일시
2026-01-17

## 문제 상황
- Meta 광고 데이터 2년치 수집 시 계속 shutdown 발생
- 원인: 5분 타임아웃 제한에 걸림 (180일 청크가 12페이지 이상 수집 시 5분 초과)

## 적용한 해결책
**타임아웃 시간만 10분으로 증가** (청크 크기는 일단 90일로 변경했으나 되돌릴 예정)

### 변경 내용

#### 1. DB 설정 변경
- 파일: `supabase/migrations/030_optimize_chunk_sizes.sql`
- 변경: chunk_size_days = 180 → 90, demographics_chunk_size_days = 90 → 90
- 실행 완료: ✓

```sql
UPDATE platform_configs
SET
  chunk_size_days = 90,
  demographics_chunk_size_days = 90,
  updated_at = NOW()
WHERE platform = 'Meta Ads';
```

#### 2. Edge Function 타임아웃 증가
- 파일: `supabase/functions/collection-worker/index.ts`
- 변경 내용:
  - Line 67: `setTimeout(() => controller.abort(), 300000)` → `setTimeout(() => controller.abort(), 600000)`
  - 주석: "타임아웃 설정 (5분)" → "타임아웃 설정 (10분)"
  - Line 167: 에러 메시지 "5 minutes" → "10 minutes"
  - Line 177, 187: 에러 메시지 "5 minutes" → "10 minutes" (2곳)
- 배포 완료: ✓

## 추가 논의 사항

### 청크 크기를 180일로 되돌려야 하는지?

**근거:**
- 현재 로그: 180일 청크에서 12페이지까지 수집
- 예상 시간: 12페이지 = 약 6-7분
- 10분 타임아웃이면 충분히 완료 가능
- 90일로 줄이면 청크 수만 2배 증가 (5개 → 9개)

**결론:** 180일로 되돌리는 것이 효율적

### 되돌리려면 실행할 작업

```javascript
// run-migration.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qdzdyoqtzkfpcogecyar.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzExMDk1MywiZXhwIjoyMDgyNjg2OTUzfQ.Y-a9F6IbUqlt51IvA--R6Gq8ZmP-XUCpO1zzFy1ud-0'
);

async function revertChunkSize() {
  const { error: updateError } = await supabase
    .from('platform_configs')
    .update({
      chunk_size_days: 180,
      demographics_chunk_size_days: 90,
      updated_at: new Date().toISOString()
    })
    .eq('platform', 'Meta Ads');

  if (updateError) {
    console.error('Update error:', updateError);
    return;
  }

  console.log('✓ Reverted to 180 days successfully');

  const { data, error } = await supabase
    .from('platform_configs')
    .select('platform, chunk_size_days, demographics_chunk_size_days')
    .eq('platform', 'Meta Ads')
    .single();

  if (error) {
    console.error('Select error:', error);
    return;
  }

  console.log('Current settings:', data);
}

revertChunkSize();
```

실행 방법:
```bash
cd /Users/reon/Desktop/개발/growth-dashboard
node run-migration.js
rm run-migration.js
```

## 적용된 파일 목록
1. `/Users/reon/Desktop/개발/growth-dashboard/supabase/migrations/030_optimize_chunk_sizes.sql` - 생성
2. `/Users/reon/Desktop/개발/growth-dashboard/supabase/functions/collection-worker/index.ts` - 수정 및 배포 완료

## 검증 방법
1. 2년치 데이터 수집 재시도
2. 로그 확인: 12페이지 이상 수집 시 타임아웃 없이 완료되는지 확인
3. collection_queue 테이블에서 status='completed' 확인

## 주요 대화 내용

**Q: 병렬 처리를 5개에서 3개로 줄여야 하나?**
A: 아니다. 5개는 서로 다른 광고 계정을 동시 처리하는 것이므로 Meta API 제한과 무관. 유지해야 함.

**Q: 타임아웃 10분으로 늘리면 작업이 3분에 끝나도 10분 대기하나?**
A: 아니다. 10분은 최대 제한 시간일 뿐, 작업이 끝나면 즉시 완료됨.

**Q: 청크 크기를 90일로 줄이지 않고 타임아웃만 늘려도 되나?**
A: 맞다. 로그 분석 결과 180일 청크도 10분이면 충분히 완료 가능. 청크 크기는 180일 유지하는 것이 효율적.

## 추가 발견 사항 (2026-01-17 20:00)

### 문제: 90일 청크로 변경 후에도 2분만에 shutdown 발생
- 로그: 34페이지까지 수집 후 shutdown (19:56 시작 → 19:58 종료)
- 기존 5분 타임아웃인데 2분만에 중단됨 = **타임아웃이 원인이 아님**

### 실제 원인: Supabase Edge Function 기본 실행 시간 제한
- Supabase Edge Function 기본 제한: **150초 (2.5분)**
- 코드 내 타임아웃(5분, 10분)과는 별개로 **Supabase 플랫폼 자체의 제한**
- 무료 플랜: 150초 제한
- 유료 플랜: 최대 900초(15분) 가능

### 해결 방법
**Supabase Dashboard에서 Edge Function Timeout 설정 변경 필요**

1. Supabase Dashboard 로그인
2. Project Settings > Edge Functions
3. Function timeout을 600초(10분) 또는 900초(15분)으로 설정
4. 유료 플랜 필요할 수 있음

### config.toml 설정 시도 결과
- `timeout_sec` 키는 지원되지 않음 (에러 발생)
- Dashboard에서만 설정 가능

### 현재 상태
- ✓ 코드 내 타임아웃: 10분으로 변경 완료 (의미 없음, 플랫폼 제한이 더 짧음)
- ✓ 청크 크기: 90일로 변경 완료
- ✗ **Supabase 플랫폼 타임아웃: 150초(기본값) → 400초로 변경 필요** ← 아직 미완료
  - 유료 플랜 최대: 400초 (6분 40초)
  - 무료 플랜: 150초 (2.5분)

## 시스템 구조 정리 (2026-01-17 21:00)

### 현재 설정
1. **pg_cron 스케줄**: 매 1분마다 Edge Function 자동 실행
2. **병렬 처리**: 한 번 실행 시 최대 5개 청크 동시 처리 (광고계정별 1개씩)
3. **같은 광고계정 보호**: processing 상태 청크가 있으면 같은 계정의 다음 청크 시작 안 함
4. **Supabase 플랫폼 제한**: Edge Function 최대 실행 시간 150초(2.5분) - 현재 문제의 실제 원인
   - 유료 플랜 최대: 400초 (6분 40초)
5. **코드 타임아웃**: 600초(10분)로 설정되어 있으나 플랫폼 제한보다 길어서 의미 없음

### 추가 발견된 문제: Meta API 호출 제한 위험

**문제 시나리오:**
- 청크1: 12시 00분 시작 → 01분 50초 완료 (110초 동안 Meta API 계속 호출)
- 청크2: 12시 02분 시작 (10초 후 바로 Meta API 또 호출 시작)
- **결과**: 10초 간격으로 API 연속 호출 → Meta API 분당 호출 제한 위험

**원인:**
- pg_cron이 1분 주기로 실행
- 청크1 완료 직후 다음 1분 주기(10초 후)에 청크2 즉시 시작
- 같은 광고계정에서 API 호출 간격이 충분하지 않음

## 추가 발견 (2026-01-17 21:15)

### Supabase 제한 재확인
- 유료 플랜 최대: 400초 (6분 40초)
- 현재 로그: 90일 청크 = 39페이지 = 약 150초
- **문제**: 데이터가 많은 경우 39페이지 이상 가능 → 400초 초과 가능

### 청크 크기 재조정 필요
- 현재: 90일
- 400초 = 약 105페이지 처리 가능
- 안전 마진 고려 시: 60-70일 청크 권장
- 또는 페이지 수 제한 로직 추가

## 해결 방안 정리

### A. Supabase 제한 내에서 해결 (400초 제한)
- [ ] **Supabase Dashboard에서 Edge Function Timeout 400초로 설정** (필수)
- [ ] **청크 크기 조정 여부 결정** (필수)
  - 옵션1: 90일 유지 (데이터 많으면 400초 초과 위험)
  - 옵션2: 60일로 축소 (안전하지만 청크 수 증가)
  - 옵션3: 페이지 수 제한 추가 (예: 최대 100페이지)
- [ ] **Meta API 호출 제한 회피 방법 선택** (필수)
  - 방법1: 청크 완료 후 대기 시간 추가 (next_run_at 컬럼 추가)
    - collection_queue 테이블에 next_run_at 컬럼 추가
    - 청크 완료 시 해당 계정의 next_run_at을 현재시각 + 1~2분으로 설정
    - get_next_pending_chunks 함수에서 next_run_at이 지난 청크만 가져오도록 수정
  - 방법2: pg_cron 주기를 1분 → 2분으로 변경
    - 간단하지만 전체 처리 속도 느려짐

### B. 완전히 다른 방안 (검토 필요)
- **Next.js API Route로 이전**
  - Vercel/다른 호스팅: 타임아웃 제한 더 긴 환경
  - Supabase는 DB만 사용
  - Edge Function 대신 Next.js API에서 데이터 수집
  - 장점: 타임아웃 제한 해소
  - 단점: 아키텍처 전면 변경 필요

## 다음 작업
- [ ] 해결 방안 선택 (A or B)
- [ ] 선택한 방안 실행
- [ ] 2년치 데이터 수집 재시도
- [ ] 결과 모니터링
