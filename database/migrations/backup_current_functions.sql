-- ==========================================
-- 현재 SQL 함수 백업
-- fix_data_access_security.sql 적용 전에 먼저 실행하여 백업
-- ==========================================

-- 현재 정의된 모든 집계 함수 목록 조회
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_kpi_aggregated',
    'get_daily_aggregated',
    'get_media_aggregated',
    'get_weekly_aggregated',
    'get_monthly_aggregated',
    'get_weekday_aggregated',
    'get_creative_aggregated',
    'get_gender_aggregated',
    'get_age_gender_aggregated',
    'get_campaign_aggregated',
    'get_ad_group_aggregated',
    'get_ad_aggregated'
  )
ORDER BY p.proname;

-- ==========================================
-- 실행 후 결과를 파일로 저장하세요:
-- 1. Supabase SQL Editor에서 이 쿼리 실행
-- 2. 결과를 복사하여 backup_results.txt로 저장
-- 3. 문제 발생 시 이 결과를 사용하여 복원
-- ==========================================
