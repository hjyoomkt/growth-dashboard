# 마스터 계정 대행사 전환 기능 구현

## 개요

마스터 계정으로 `/superadmin` 접근 시 상단 네비게이션 바에서 대행사를 선택하면 모든 superadmin 페이지가 해당 대행사의 데이터만 필터링하여 표시합니다.

## 주요 변경 파일

### 1. AuthContext (src/contexts/AuthContext.js)

**추가된 상태:**
```javascript
const [availableOrganizations, setAvailableOrganizations] = useState([]);
const [currentOrganizationId, setCurrentOrganizationId] = useState(null);
```

**대행사 목록 로딩 (fetchUserMetadata 내):**
- Master인 경우 모든 대행사 목록 조회
- localStorage에서 이전 선택 복원

**대행사 전환 함수:**
```javascript
const switchOrganization = (organizationId) => {
  setCurrentOrganizationId(organizationId);
  if (organizationId) {
    localStorage.setItem('selectedOrganizationId', organizationId);
  } else {
    localStorage.removeItem('selectedOrganizationId');
  }
};
```

### 2. NavbarLinksAdmin (src/components/navbar/NavbarLinksAdmin.js)

**대행사 드롭다운 UI 추가:**
- Master 계정만 표시
- 브랜드 드롭다운 앞에 배치
- URL 쿼리 파라미터 업데이트

### 3. SuperAdminDashboard (src/views/superadmin/default/index.jsx)

**effectiveOrganizationId 패턴:**
```javascript
const effectiveOrganizationId = role === 'master' && currentOrganizationId
  ? currentOrganizationId
  : userOrgId;
```

**적용 위치:**
- GCP 설정 조회/저장
- Meta 설정 조회/저장
- Naver 설정 조회/저장
- 통계 카드 필터링

### 4. 광고주 관리 (src/views/superadmin/advertisers/index.jsx)

Master가 대행사 선택 시 해당 대행사만 조회:
```javascript
if (role === 'master' && currentOrganizationId) {
  query = query.eq('id', currentOrganizationId);
}
```

### 5. 권한 관리 (src/views/admin/users/components/UserTable.js)

currentOrganizationId를 currentUser 객체에 전달하여 supabaseService의 getUsers 함수에서 필터링 적용

### 6. API 관리 (src/views/superadmin/api-management)

**APITokenTable.js:**
- fetchTokens: advertiser_id 기준 필터링
- useMemo: Master 계정 처리 추가로 데이터 표시

**CollectionMonitor.jsx:**
- collection_jobs 테이블의 advertiser_id로 직접 필터링

### 7. 변경 이력 (src/views/superadmin/changelog/index.jsx)

currentOrganizationId를 getChangelogs 함수에 전달하여 필터링

### 8. supabaseService.js

**getUsers:**
- Master가 대행사 선택 시 해당 조직 사용자만 조회

**getChangelogs:**
- organizationId 파라미터 추가하여 조직별 필터링

**getAvailableAdvertisers:**
- Master가 대행사 선택 시 해당 대행사의 브랜드만 반환

## 필터링 로직 패턴

모든 페이지에서 동일한 패턴 사용:

```javascript
if (isMaster && isMaster()) {
  if (currentOrganizationId) {
    // 선택된 대행사 데이터만
    const { data: advertiserIds } = await supabase
      .from('advertisers')
      .select('id')
      .eq('organization_id', currentOrganizationId)
      .is('deleted_at', null);

    query = query.in('advertiser_id', advertiserIds.map(a => a.id));
  }
  // else: 대행사 미선택 시 필터링 없음 (모든 데이터)
} else if (isAgency && isAgency()) {
  // Agency: 필터링 없음
} else {
  // Client: 자신의 advertiser_id만
  if (advertiserId) {
    query = query.eq('advertiser_id', advertiserId);
  }
}
```

## 동작 방식

1. Master 로그인 → 모든 대행사 목록 조회
2. Navbar에 대행사 드롭다운 표시
3. 대행사 선택 → `currentOrganizationId` 설정 및 localStorage 저장
4. 모든 페이지에서 `effectiveOrganizationId` 또는 `currentOrganizationId` 사용
5. 페이지 새로고침 시 localStorage에서 선택 복원

## 적용 페이지

- ✅ /superadmin/default (API 설정, 통계)
- ✅ /superadmin/advertisers (광고주 관리)
- ✅ /superadmin/users (권한 관리)
- ✅ /superadmin/api-management (API 토큰, 데이터 수집 현황)
- ✅ /superadmin/changelog (변경 이력)
- ⚠️ /superadmin/board (브랜드 단위 필터링만 사용, 대행사 필터 불필요)

## 테스트

**Master 계정:**
- 대행사 미선택 → 모든 데이터 표시
- 대행사 A 선택 → 대행사 A 데이터만 표시
- 대행사 B로 전환 → 대행사 B 데이터만 표시, 이전 설정 초기화

**Agency 계정:**
- 기존 동작 유지 (모든 데이터 접근)

**Client 계정:**
- 기존 동작 유지 (자신의 브랜드만 접근)
