# 계층별 광고 요약 테이블 - 작업 내역

## 작업 일자
2026-02-05

## 작업 개요
계층별 광고 요약 테이블의 광고 탭 및 광고그룹 탭에 상위 계층 정보(캠페인명, 광고그룹명) 컬럼을 추가하여 데이터 가독성 향상

---

## 1. 프론트엔드 수정

### 파일: `src/views/admin/dataTables/components/HierarchicalAdSummary.js`

#### 1.1 테이블 헤더 수정
- **광고그룹 탭**: 캠페인명 컬럼 추가
- **광고 탭**: 캠페인명, 광고그룹명 컬럼 추가

```javascript
// 기존
{activeTab === "ad" && (
  <Th>캠페인명</Th>
  <Th>광고그룹명</Th>
)}

// 수정 후
{(activeTab === "adgroup" || activeTab === "ad") && (
  <Th>캠페인명</Th>
)}
{activeTab === "ad" && (
  <Th>광고그룹명</Th>
)}
```

#### 1.2 테이블 바디 수정
캠페인명, 광고그룹명 데이터 셀 추가

```javascript
{(activeTab === "adgroup" || activeTab === "ad") && (
  <Td>
    {row.campaignName ? (
      <Text>{row.campaignName}</Text>
    ) : null}
  </Td>
)}

{activeTab === "ad" && (
  <Td>
    {row.adGroupName ? (
      <Text>{row.adGroupName}</Text>
    ) : null}
  </Td>
)}
```

#### 1.3 비교 모드 데이터 병합 수정
`mergeAndCalculateDifferences` 함수에서 비교 기간 행과 증감 행에도 `campaignName`, `adGroupName` 포함

```javascript
// comparison 행
mergedData.push({
  ...comparison,
  rowType: 'comparison',
  media: '',
  key: '',
  campaignName: current.campaignName,  // 추가
  adGroupName: current.adGroupName,    // 추가
});

// difference 행
mergedData.push({
  media: '',
  key: '',
  rowType: 'difference',
  campaignName: current.campaignName,  // 추가
  adGroupName: current.adGroupName,    // 추가
  cost: current.cost - comparison.cost,
  // ...
});
```

#### 1.4 UI 개선
안내 메시지를 Alert에서 작은 회색 텍스트로 변경 (수평 스크롤 방지)

```javascript
// 기존
<Alert status="info">
  Google Ads와 Naver는 광고 단위 데이터를 제공하지 않습니다...
</Alert>

// 수정 후
<Text fontSize="xs" color="gray.500">
  * Google Ads와 Naver는 광고명을 제공하지 않아 "N/A"로 표시됩니다.
</Text>
```

---

## 2. 데이터베이스 함수 수정

### 파일: `database/migrations/add_aggregation_functions.sql`

#### 2.1 `get_ad_aggregated` 함수 수정

**문제점**:
- Google Ads는 `ad_name`이 없어서 모든 데이터가 하나의 행으로 합쳐짐
- `MAX(campaign_name)`, `MAX(ad_group_name)`이 임의의 값을 선택함

**기존 코드**:
```sql
SELECT
  ap.source,
  MAX(ap.campaign_name) as campaign_name,  -- ❌ 문제
  MAX(ap.ad_group_name) as ad_group_name,  -- ❌ 문제
  COALESCE(ap.ad_name, 'N/A') as ad_name,
  ...
FROM ad_performance ap
WHERE ...
GROUP BY ap.source, COALESCE(ap.ad_name, 'N/A');  -- ❌ 문제
```

**수정 후**:
```sql
SELECT
  ap.source,
  ap.campaign_name,                         -- ✅ 직접 SELECT
  ap.ad_group_name,                         -- ✅ 직접 SELECT
  COALESCE(ap.ad_name, 'N/A') as ad_name,
  ...
FROM ad_performance ap
WHERE ...
GROUP BY ap.source, ap.campaign_name, ap.ad_group_name, COALESCE(ap.ad_name, 'N/A');  -- ✅ 수정
```

#### 2.2 `get_ad_group_aggregated` 함수 수정

**기존 코드**:
```sql
SELECT
  ap.source,
  MAX(ap.campaign_name) as campaign_name,  -- ❌ MAX 사용
  ap.ad_group_name,
  ...
FROM ad_performance ap
WHERE ...
GROUP BY ap.source, ap.ad_group_name;
```

**수정 후**:
```sql
SELECT
  ap.source,
  ap.campaign_name,                         -- ✅ 직접 SELECT
  ap.ad_group_name,
  ...
FROM ad_performance ap
WHERE ...
GROUP BY ap.source, ap.campaign_name, ap.ad_group_name;  -- ✅ campaign_name 추가
```

---

## 3. Supabase 적용 SQL

### 3.1 `get_ad_aggregated` 업데이트

```sql
-- 1단계: 기존 함수 삭제
DROP FUNCTION IF EXISTS public.get_ad_aggregated(uuid,uuid[],date,date,text);

-- 2단계: 새 함수 생성
CREATE OR REPLACE FUNCTION public.get_ad_aggregated(
  p_advertiser_id uuid DEFAULT NULL::uuid,
  p_advertiser_ids uuid[] DEFAULT NULL::uuid[],
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date,
  p_meta_conversion_type text DEFAULT 'purchase'::text
)
RETURNS TABLE(
  source text,
  campaign_name text,
  ad_group_name text,
  ad_name text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
)
LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    ap.campaign_name,
    ap.ad_group_name,
    COALESCE(ap.ad_name, 'N/A') as ad_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY ap.source, ap.campaign_name, ap.ad_group_name, COALESCE(ap.ad_name, 'N/A');
END;
$function$;
```

### 3.2 `get_ad_group_aggregated` 업데이트

```sql
-- 1단계: 기존 함수 삭제
DROP FUNCTION IF EXISTS public.get_ad_group_aggregated(uuid,uuid[],date,date,text);

-- 2단계: 새 함수 생성
CREATE OR REPLACE FUNCTION public.get_ad_group_aggregated(
  p_advertiser_id uuid DEFAULT NULL::uuid,
  p_advertiser_ids uuid[] DEFAULT NULL::uuid[],
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date,
  p_meta_conversion_type text DEFAULT 'purchase'::text
)
RETURNS TABLE(
  source text,
  campaign_name text,
  ad_group_name text,
  cost numeric,
  impressions bigint,
  clicks bigint,
  conversions numeric,
  conversion_value numeric
)
LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    ap.campaign_name,
    ap.ad_group_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY ap.source, ap.campaign_name, ap.ad_group_name;
END;
$function$;
```

---

## 4. 롤백 계획

### 4.1 데이터베이스 롤백 SQL

기존 함수로 복원하려면 `database/migrations/rollback_to_original.sql` 또는 `fix_data_access_security.sql`의 함수 정의를 사용

### 4.2 프론트엔드 롤백

Git으로 이전 커밋으로 복원:
```bash
cd growth-dashboard
git checkout HEAD -- src/views/admin/dataTables/components/HierarchicalAdSummary.js
```

---

## 5. 최종 결과

### 테이블 구조

#### 캠페인 탭
| 매체 | 캠페인명 | 지출액 | 노출수 | ... |

#### 광고그룹 탭
| 매체 | **캠페인명** | 광고그룹명 | 지출액 | 노출수 | ... |

#### 광고 탭
| 매체 | **캠페인명** | **광고그룹명** | 광고명 | 지출액 | 노출수 | ... |

### 개선 사항
1. ✅ 광고그룹 탭에서 상위 캠페인 정보 확인 가능
2. ✅ 광고 탭에서 전체 계층 구조 확인 가능
3. ✅ Google Ads 데이터가 올바르게 광고그룹별로 분리됨
4. ✅ 수평 스크롤 최소화 (Alert → 작은 텍스트)
5. ✅ 비교 모드에서도 계층 정보 유지

---

## 6. 주의사항

- Google Ads와 Naver는 광고명(`ad_name`)을 제공하지 않아 "N/A"로 표시됨
- 데이터베이스 함수 변경 시 반드시 순서대로 실행 (DROP → CREATE)
- 프론트엔드는 이미 API 데이터 구조를 지원하고 있었음 (supabaseService.js에서 이미 `campaignName`, `adGroupName` 매핑)
