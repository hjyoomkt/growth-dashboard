# CASCADE DELETE 설정 가이드

## 기본 원칙

모든 외래 키는 **ON DELETE CASCADE** 설정을 적용하여 상위 엔티티 삭제 시 하위 데이터가 자동 삭제되도록 합니다.

## 현재 적용된 CASCADE 규칙

### 1. organizations 삭제 시
```sql
organizations (삭제)
  ├─> advertisers (자동 삭제)
  │     ├─> users (자동 삭제)
  │     ├─> user_advertisers (자동 삭제)
  │     ├─> api_tokens (자동 삭제)
  │     ├─> ad_performance (자동 삭제)
  │     ├─> creatives (자동 삭제)
  │     ├─> invitation_codes (자동 삭제)
  │     └─> board_posts (자동 삭제)
  └─> users (자동 삭제)
```

### 2. advertisers (브랜드) 삭제 시
```sql
advertisers (삭제)
  ├─> users (자동 삭제)
  ├─> user_advertisers (자동 삭제)
  ├─> api_tokens (자동 삭제)
  ├─> ad_performance (자동 삭제)
  ├─> creatives (자동 삭제)
  ├─> invitation_codes (자동 삭제)
  └─> board_posts (자동 삭제)
```

### 3. users (사용자) 삭제 시
```sql
users (삭제)
  ├─> user_advertisers (자동 삭제)
  └─> invitation_codes (created_by FK만 CASCADE, used_by는 SET NULL)
```

**주의:** 사용자 삭제 시 브랜드는 삭제되지 않습니다.

## 새 테이블 추가 시 체크리스트

새로운 테이블을 추가할 때는 다음 규칙을 따라주세요:

### 1. 외래 키 정의 시 CASCADE 설정

```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  -- 다른 컬럼들...
);
```

### 2. CASCADE 대상 판단 기준

| 참조 대상 | CASCADE 설정 | 이유 |
|---------|------------|------|
| `organizations` | **ON DELETE CASCADE** | 조직 삭제 시 하위 데이터 모두 삭제 |
| `advertisers` | **ON DELETE CASCADE** | 브랜드 삭제 시 관련 데이터 모두 삭제 |
| `users` (작성자) | **ON DELETE CASCADE** 또는 **SET NULL** | 작성자 삭제 시 데이터 보존 여부에 따라 선택 |
| `users` (소유자) | **ON DELETE CASCADE** | 사용자 삭제 시 소유 데이터 삭제 |

### 3. 예외 케이스

다음 경우에는 **SET NULL** 또는 **RESTRICT** 사용:

- **작성자 정보**: 게시글/댓글 작성자는 삭제 후에도 기록 보존 → `SET NULL`
- **참조만 하는 경우**: 삭제를 막아야 하는 경우 → `RESTRICT`

### 4. 기존 테이블에 CASCADE 적용하는 방법

```sql
-- 1. 기존 제약 조건 삭제
ALTER TABLE new_table
DROP CONSTRAINT IF EXISTS new_table_advertiser_id_fkey;

-- 2. CASCADE가 적용된 새 제약 조건 추가
ALTER TABLE new_table
ADD CONSTRAINT new_table_advertiser_id_fkey
  FOREIGN KEY (advertiser_id)
  REFERENCES advertisers(id)
  ON DELETE CASCADE;
```

## 적용 방법

1. 새 테이블 생성 시 위 규칙에 따라 외래 키 정의
2. `database/enable_cascade_delete.sql` 파일에 해당 테이블의 CASCADE 설정 추가
3. 마이그레이션 실행

## 테스트 방법

```sql
-- 브랜드 삭제 테스트
SELECT COUNT(*) FROM users WHERE advertiser_id = 'test-brand-id';
SELECT COUNT(*) FROM ad_performance WHERE advertiser_id = 'test-brand-id';

DELETE FROM advertisers WHERE id = 'test-brand-id';

-- 연쇄 삭제 확인
SELECT COUNT(*) FROM users WHERE advertiser_id = 'test-brand-id'; -- 0
SELECT COUNT(*) FROM ad_performance WHERE advertiser_id = 'test-brand-id'; -- 0
```

## 주의사항

⚠️ **CASCADE DELETE는 복구 불가능합니다.**
- 삭제 전 반드시 확인 절차를 거쳐야 합니다
- 프론트엔드에서 이중 확인 (경고 메시지 + 브랜드명 입력)
- 중요 데이터는 백업 또는 soft delete 고려

## 관련 파일

- [enable_cascade_delete.sql](enable_cascade_delete.sql) - CASCADE 설정 마이그레이션
- [create_creatives_table.sql](create_creatives_table.sql) - creatives 테이블 예시
