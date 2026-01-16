# 멀티 브랜드 지원 구현 완료

## 📋 개요

사용자가 여러 브랜드에 접근할 수 있도록 다대다(many-to-many) 관계를 지원하는 시스템을 구축했습니다.

## 🎯 주요 기능

### 1. 브랜드 그룹핑
- **advertiser_group_id**: 같은 회사 소유의 여러 브랜드를 그룹화
- 예: 온누리스토어, 페퍼툭스, 테라브레스, 멀티비타민을 하나의 그룹으로 관리

### 2. 다중 브랜드 접근
- **user_advertisers** 중간 테이블로 사용자 ↔ 브랜드 다대다 관계 구현
- 한 명의 사용자가 여러 브랜드에 동시 접근 가능
- EditUserModal에서 복수 브랜드 선택 UI 제공

### 3. 사용자 조회 확장
- **슈퍼어드민**: 에이전시가 소유한 모든 브랜드의 사용자 조회 가능
- **에이전시**: organization 소속 직원 + 소유 브랜드의 사용자 조회
- **브랜드**: user_advertisers를 통해 같은 브랜드에 접근하는 모든 사용자 조회

## 📁 변경된 파일

### 1. 데이터베이스 마이그레이션
**파일**: `database/multi_brand_support.sql`

```sql
-- advertiser_group_id 컬럼 추가
ALTER TABLE advertisers ADD COLUMN advertiser_group_id UUID;

-- user_advertisers 중간 테이블 생성
CREATE TABLE user_advertisers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
  UNIQUE(user_id, advertiser_id)
);

-- 기존 users.advertiser_id 데이터 마이그레이션
INSERT INTO user_advertisers (user_id, advertiser_id)
SELECT id, advertiser_id FROM users WHERE advertiser_id IS NOT NULL;
```

### 2. Supabase 서비스 함수 업데이트
**파일**: `src/services/supabaseService.js`

#### 2.1 getUserMetadata (라인 71-101)
- user_advertisers 조인하여 접근 가능한 모든 브랜드 조회
- `accessible_advertisers` 배열 반환

#### 2.2 getAvailableAdvertisers (라인 108-160)
- Master: 모든 브랜드 조회
- Agency: organization_id 기반 조회
- Advertiser: user_advertisers를 통해 접근 가능한 브랜드 조회

#### 2.3 getUsers (라인 171-366)
- Master: 모든 사용자 + 각 사용자의 accessible_advertisers 포함
- Agency: organization 사용자 + 소유 브랜드의 사용자 병합
- Advertiser: user_advertisers 기반 같은 브랜드 접근자 조회
- 중복 제거 및 accessible_advertisers 배열 추가

#### 2.4 updateUserRoleAndAdvertisers (라인 403-497) **NEW**
```javascript
/**
 * 사용자 역할 및 브랜드 접근 권한 동시 변경
 * @param userId - 대상 사용자 ID
 * @param newRole - 새 역할
 * @param advertiserIds - 접근 가능한 브랜드 ID 배열
 * @param currentUser - 현재 사용자 (권한 검증)
 */
```

**작동 방식:**
1. 권한 검증 (자신보다 높은 권한 수정 차단)
2. 대표운영자 중복 체크
3. users.role 업데이트
4. user_advertisers 기존 데이터 삭제
5. 새 브랜드 관계 삽입
6. 업데이트된 사용자 정보 반환

### 3. EditUserModal 컴포넌트
**파일**: `src/views/admin/users/components/EditUserModal.jsx`

#### 주요 변경사항
- **라인 26**: `updateUserRoleAndAdvertisers` import 추가
- **라인 29**: `currentUser`, `toast` 추가
- **라인 30**: `advertiserIds` 배열로 변경 (단일 → 복수)
- **라인 123-167**: handleSubmit Supabase 연동
  - `updateUserRoleAndAdvertisers` 호출
  - 성공/실패 toast 알림
  - onUpdate 콜백으로 UI 갱신

#### UI 개선
- **브랜드 선택 섹션 (라인 417-501)**
  - "전체 브랜드" 옵션 (advertiserIds = [])
  - 각 브랜드별 체크박스 스타일
  - 복수 선택 가능
  - 선택된 브랜드 개수 표시

### 4. UserTable 컴포넌트
**파일**: `src/views/admin/users/components/UserTable.js`

#### fetchUsers 데이터 변환 (라인 72-83)
```javascript
const transformedUsers = users.map(u => ({
  ...u,
  clients: u.accessible_advertisers?.map(adv => adv.name) || [],
  advertiserIds: u.accessible_advertisers?.map(adv => adv.id) || [],
  client: u.accessible_advertisers?.[0]?.name || u.advertisers?.name || null,
  joinDate: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : '',
}));
```

#### 테이블 컬럼 표시 (라인 265-297)
- `clients` 배열이 있으면 쉼표로 연결하여 표시
- 없으면 "전체" 표시
- "담당 브랜드" (에이전시) / "접근 가능한 브랜드" (브랜드)

## 🔄 데이터 흐름

### 사용자 초대 시나리오

#### 시나리오 1: 신규 브랜드 대표 초대
1. 에이전시가 초대 코드 생성
2. 브랜드 대표가 가입 (브랜드명, 사업자등록번호, 홈페이지 입력)
3. `advertisers` 테이블에 새 브랜드 생성
4. `user_advertisers`에 관계 생성
5. 사용자는 해당 브랜드만 접근 가능

#### 시나리오 2: 기존 브랜드 추가
1. 온누리스토어 대표가 추가 브랜드 등록 요청
2. 에이전시가 페퍼툭스, 테라브레스 등록
3. `advertisers` 테이블에 새 브랜드들 생성 (같은 advertiser_group_id)
4. `user_advertisers`에 온누리스토어 대표 ↔ 각 브랜드 관계 추가
5. 대표는 4개 브랜드 모두 접근 가능

#### 시나리오 3: 팀원 초대
1. 브랜드 대표가 팀원 초대 (접근 가능한 브랜드 선택)
2. 팀원 가입 (브랜드 정보 입력 불필요)
3. `user_advertisers`에 선택된 브랜드들과 관계 생성
4. 팀원은 선택된 브랜드들만 접근 가능

### 권한 변경 흐름
1. UserTable에서 "권한 변경" 클릭
2. EditUserModal 열림 (현재 권한 및 브랜드 표시)
3. 새 권한 선택 + 브랜드 복수 선택
4. "저장" 클릭
5. `updateUserRoleAndAdvertisers` 호출
   - 권한 검증
   - users.role 업데이트
   - user_advertisers 관계 재생성
6. UserTable 새로고침
7. 변경된 정보 표시 (복수 브랜드 쉼표로 연결)

## 🔍 주요 개선사항

### 이전 방식 (단일 브랜드)
```
users.advertiser_id → advertisers.id (1:1)
```
- 한 사용자는 하나의 브랜드만 접근
- 브랜드 변경 시 advertiser_id 덮어쓰기

### 개선된 방식 (다중 브랜드)
```
users ↔ user_advertisers ↔ advertisers (N:M)
```
- 한 사용자가 여러 브랜드 동시 접근
- advertiser_group_id로 같은 회사 브랜드 그룹화
- 유연한 권한 관리

## ⚙️ 실행 방법

### 1. 데이터베이스 마이그레이션 실행
```bash
# Supabase CLI 사용
psql -h [SUPABASE_HOST] -U [USER] -d [DATABASE] -f database/multi_brand_support.sql

# 또는 Supabase Dashboard에서 SQL Editor로 실행
```

### 2. 애플리케이션 재시작
```bash
npm start
```

### 3. 테스트 시나리오
1. **마스터 계정으로 로그인**
   - 슈퍼어드민 → 팀원 관리 접속
   - 모든 사용자 목록 확인
   - 각 사용자의 접근 가능한 브랜드 확인

2. **권한 변경 테스트**
   - 특정 사용자 "권한 변경" 클릭
   - 새 권한 선택
   - 복수 브랜드 선택
   - 저장 후 목록에서 변경 확인

3. **브랜드 계정으로 로그인**
   - 브랜드어드민 → 팀원 관리 접속
   - 같은 브랜드 접근자만 표시되는지 확인

## 🚨 주의사항

### 1. 하위 호환성
- `users.advertiser_id` 컬럼은 유지 (삭제하지 않음)
- 기존 데이터는 user_advertisers로 마이그레이션됨
- 레거시 코드와의 호환성 보장

### 2. 권한 검증
- 자신과 동급 또는 상위 권한 사용자는 수정 불가
- 대표운영자 중복 체크 (한 브랜드당 한 명)
- Master만 모든 사용자 수정 가능

### 3. 성능 고려사항
- getUsers에서 각 사용자의 브랜드 목록 조회 시 N+1 쿼리 발생
- 대규모 사용자 환경에서는 쿼리 최적화 필요
- 가능하다면 Supabase의 nested select 활용 권장

## 📊 데이터베이스 스키마

### advertisers 테이블
```
- id (UUID, PK)
- name (TEXT)
- organization_id (UUID, FK → organizations)
- advertiser_group_id (UUID) ← NEW
- ...
```

### user_advertisers 테이블 (NEW)
```
- id (UUID, PK)
- user_id (UUID, FK → users)
- advertiser_id (UUID, FK → advertisers)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- UNIQUE(user_id, advertiser_id)
```

### 인덱스
```sql
CREATE INDEX idx_advertisers_group_id ON advertisers(advertiser_group_id);
CREATE INDEX idx_user_advertisers_user_id ON user_advertisers(user_id);
CREATE INDEX idx_user_advertisers_advertiser_id ON user_advertisers(advertiser_id);
```

## ✅ 완료된 작업

1. ✅ 데이터베이스 스키마 설계 및 마이그레이션 SQL 작성
2. ✅ getUserMetadata - user_advertisers 조인
3. ✅ getAvailableAdvertisers - 다중 브랜드 조회
4. ✅ getUsers - 에이전시 소유 브랜드 사용자 포함
5. ✅ updateUserRoleAndAdvertisers - 새 함수 생성
6. ✅ EditUserModal - Supabase 연동 및 복수 브랜드 선택 UI
7. ✅ UserTable - 복수 브랜드 표시

## 🔜 다음 단계 (선택사항)

1. **초대 시스템 구현**
   - 브랜드 대표 초대 시 브랜드 정보 입력
   - 팀원 초대 시 접근 가능한 브랜드 선택
   - advertiser_group_id 자동 생성 로직

2. **브랜드 그룹 관리 UI**
   - 같은 그룹 브랜드 목록 표시
   - 그룹 내 브랜드 추가/제거
   - 그룹명 설정

3. **쿼리 최적화**
   - getUsers의 N+1 쿼리 해결
   - Supabase nested select 활용
   - 캐싱 전략 수립

4. **브랜드 전환 드롭다운**
   - 메인 대시보드에서 브랜드 전환 시 user_advertisers 기반 필터링
   - AuthContext에서 availableAdvertisers 연동 확인

## 📝 참고사항

- users.advertiser_id는 레거시 호환을 위해 유지하지만, 신규 기능은 user_advertisers 사용
- 브랜드 그룹핑은 선택사항이며, null 허용
- 동일 회사 소유가 아닌 브랜드는 advertiser_group_id를 다르게 설정
