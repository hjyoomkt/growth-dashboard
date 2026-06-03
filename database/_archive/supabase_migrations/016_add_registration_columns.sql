-- 회원가입(complete_registration) 데이터 수집을 위한 컬럼 추가

-- ad_performance 테이블에 회원가입 컬럼 추가
ALTER TABLE ad_performance
  ADD COLUMN IF NOT EXISTS complete_registrations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS complete_registrations_value NUMERIC(20,2) DEFAULT 0;

-- ad_performance_demographics 테이블에 회원가입 컬럼 추가
ALTER TABLE ad_performance_demographics
  ADD COLUMN IF NOT EXISTS complete_registrations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS complete_registrations_value NUMERIC(20,2) DEFAULT 0;

COMMENT ON COLUMN ad_performance.complete_registrations IS 'Meta 회원가입 완료 액션 수';
COMMENT ON COLUMN ad_performance.complete_registrations_value IS 'Meta 회원가입 완료 액션 가치';
COMMENT ON COLUMN ad_performance_demographics.complete_registrations IS 'Meta 회원가입 완료 액션 수';
COMMENT ON COLUMN ad_performance_demographics.complete_registrations_value IS 'Meta 회원가입 완료 액션 가치';
