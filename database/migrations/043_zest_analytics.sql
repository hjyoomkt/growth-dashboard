-- ============================================================================
-- Zest Analytics 추적 시스템
-- Growth Dashboard 독립 모듈
-- 생성일: 2026-01-30
--
-- 기능:
-- - 광고주 웹사이트 전환 이벤트 추적 (구매, 회원가입, 리드 등)
-- - 어트리뷰션 윈도우 (클릭 후 1일/7일/28일)
-- - 라스트 클릭 기준 어트리뷰션
-- - UTM/ZA 파라미터 지원
-- ============================================================================

-- ============================================================================
-- 1. 추적 코드 관리 테이블
-- ============================================================================

CREATE TABLE za_tracking_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 추적 ID (ZA-XXXXXXXX 형식)
  tracking_id TEXT UNIQUE NOT NULL,

  -- 광고주 연결
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,

  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- 사용 통계
  total_events BIGINT DEFAULT 0,
  last_event_at TIMESTAMPTZ,

  -- 메타데이터
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,

  -- 시간 정보
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_za_tracking_codes_advertiser ON za_tracking_codes(advertiser_id);
CREATE INDEX idx_za_tracking_codes_tracking_id ON za_tracking_codes(tracking_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_za_tracking_codes_status ON za_tracking_codes(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE za_tracking_codes IS 'Zest Analytics 추적 코드 관리';
COMMENT ON COLUMN za_tracking_codes.tracking_id IS 'ZA-XXXXXXXX 형식의 고유 추적 ID';
COMMENT ON COLUMN za_tracking_codes.status IS 'active: 활성, inactive: 비활성';

-- ============================================================================
-- 2. 이벤트 저장 테이블
-- ============================================================================

CREATE TABLE za_events (
  id BIGSERIAL PRIMARY KEY,

  -- 추적 정보
  tracking_id TEXT NOT NULL,
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,

  -- 이벤트 정보
  event_type TEXT NOT NULL, -- 'purchase', 'signup', 'lead', 'add_to_cart', 'custom', 'pageview'
  event_name TEXT, -- 커스텀 이벤트명 (event_type이 'custom'일 때 필수)

  -- 전환 데이터
  value NUMERIC(20, 2), -- 전환 금액
  currency TEXT DEFAULT 'KRW',
  order_id TEXT, -- 주문 ID (중복 방지용)

  -- 어트리뷰션 정보 (중요!)
  clicked_at TIMESTAMPTZ, -- 광고 클릭 시점
  days_since_click INTEGER, -- 클릭 후 경과 일수 (0, 1, 2, ... 28)
  attribution_window INTEGER, -- 어트리뷰션 윈도우 (1, 7, 28)
  is_attributed BOOLEAN DEFAULT TRUE, -- 28일 이내 여부

  -- UTM/ZA 파라미터 (전환 이벤트에서만 수집)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- 페이지 정보 (전환 이벤트에서만 수집)
  page_url TEXT,
  page_referrer TEXT,

  -- 디바이스 정보 (전환 이벤트에서만 수집)
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,

  -- IP 및 위치 (선택적)
  ip_address INET,
  country TEXT,
  city TEXT,

  -- 세션 정보 (향후 확장)
  session_id TEXT,

  -- 커스텀 데이터
  custom_data JSONB DEFAULT '{}'::jsonb,

  -- 시간 정보
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 조회 최적화 인덱스
CREATE INDEX idx_za_events_advertiser_created ON za_events(advertiser_id, created_at DESC);
CREATE INDEX idx_za_events_tracking_id ON za_events(tracking_id, created_at DESC);
CREATE INDEX idx_za_events_event_type ON za_events(event_type, created_at DESC);
CREATE INDEX idx_za_events_order_id ON za_events(order_id) WHERE order_id IS NOT NULL;

-- 어트리뷰션 분석 인덱스
CREATE INDEX idx_za_events_attribution ON za_events(
  advertiser_id,
  is_attributed,
  attribution_window,
  created_at DESC
) WHERE is_attributed = TRUE;

-- UTM 파라미터 조회 최적화
CREATE INDEX idx_za_events_utm_source ON za_events(utm_source, created_at DESC)
  WHERE utm_source IS NOT NULL;
CREATE INDEX idx_za_events_utm_campaign ON za_events(utm_campaign, created_at DESC)
  WHERE utm_campaign IS NOT NULL;

-- 복합 인덱스 (캠페인별 성과 분석용)
CREATE INDEX idx_za_events_campaign_analysis ON za_events(
  advertiser_id,
  utm_source,
  utm_campaign,
  created_at DESC
) WHERE utm_source IS NOT NULL;

COMMENT ON TABLE za_events IS 'Zest Analytics 이벤트 저장 (무제한 보관)';
COMMENT ON COLUMN za_events.clicked_at IS '광고 클릭 시점 (어트리뷰션 계산용)';
COMMENT ON COLUMN za_events.days_since_click IS '클릭 후 경과 일수';
COMMENT ON COLUMN za_events.attribution_window IS '어트리뷰션 윈도우 (1, 7, 28일)';
COMMENT ON COLUMN za_events.is_attributed IS '28일 이내 전환 여부';

-- ============================================================================
-- 3. RLS 정책
-- ============================================================================

-- za_tracking_codes RLS
ALTER TABLE za_tracking_codes ENABLE ROW LEVEL SECURITY;

-- Master: 모든 추적 코드 조회/관리
CREATE POLICY "Master can manage all tracking codes"
  ON za_tracking_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master'
      AND users.deleted_at IS NULL
    )
  );

-- Agency 관리자: 자신의 조직 브랜드만 조회/관리
CREATE POLICY "Agency can manage organization tracking codes"
  ON za_tracking_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN advertisers ON advertisers.organization_id = users.organization_id
      WHERE users.id = auth.uid()
      AND users.role IN ('org_admin', 'org_manager', 'org_staff')
      AND advertisers.id = za_tracking_codes.advertiser_id
      AND users.deleted_at IS NULL
    )
  );

-- Advertiser: 자신의 브랜드만 조회 (생성/재생성 가능)
CREATE POLICY "Advertiser can manage own tracking codes"
  ON za_tracking_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN user_advertisers ON user_advertisers.user_id = users.id
      WHERE users.id = auth.uid()
      AND user_advertisers.advertiser_id = za_tracking_codes.advertiser_id
      AND users.deleted_at IS NULL
    )
  );

-- za_events RLS
ALTER TABLE za_events ENABLE ROW LEVEL SECURITY;

-- 공개 이벤트 수집 (익명 사용자도 INSERT 가능)
CREATE POLICY "Allow public event insertion"
  ON za_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true); -- Edge Function에서 검증 수행

-- Master: 모든 이벤트 조회
CREATE POLICY "Master can view all events"
  ON za_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'master'
      AND users.deleted_at IS NULL
    )
  );

-- Agency 관리자: 자신의 조직 브랜드 이벤트만 조회
CREATE POLICY "Agency can view organization events"
  ON za_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN advertisers ON advertisers.organization_id = users.organization_id
      WHERE users.id = auth.uid()
      AND users.role IN ('org_admin', 'org_manager', 'org_staff')
      AND advertisers.id = za_events.advertiser_id
      AND users.deleted_at IS NULL
    )
  );

-- Advertiser: 자신의 브랜드 이벤트만 조회
CREATE POLICY "Advertiser can view own events"
  ON za_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      JOIN user_advertisers ON user_advertisers.user_id = users.id
      WHERE users.id = auth.uid()
      AND user_advertisers.advertiser_id = za_events.advertiser_id
      AND users.deleted_at IS NULL
    )
  );

COMMENT ON POLICY "Allow public event insertion" ON za_events IS '익명 사용자도 이벤트 삽입 가능 (Edge Function에서 검증)';

-- ============================================================================
-- 4. 트리거 및 헬퍼 함수
-- ============================================================================

-- 추적 ID 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_za_tracking_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tracking_id TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- ZA-XXXXXXXX 형식 (8자리 숫자)
    v_tracking_id := 'ZA-' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');

    -- 중복 체크
    SELECT EXISTS(
      SELECT 1 FROM za_tracking_codes WHERE tracking_id = v_tracking_id
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_tracking_id;
END;
$$;

COMMENT ON FUNCTION generate_za_tracking_id IS 'ZA-XXXXXXXX 형식의 고유 추적 ID 생성';

-- 추적 코드 통계 업데이트 트리거
CREATE OR REPLACE FUNCTION update_za_tracking_code_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 이벤트가 추가될 때마다 추적 코드 통계 업데이트
  UPDATE za_tracking_codes
  SET
    total_events = total_events + 1,
    last_event_at = NEW.created_at,
    updated_at = NOW()
  WHERE tracking_id = NEW.tracking_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_za_stats
AFTER INSERT ON za_events
FOR EACH ROW
EXECUTE FUNCTION update_za_tracking_code_stats();

COMMENT ON FUNCTION update_za_tracking_code_stats IS '이벤트 추가 시 추적 코드 통계 자동 업데이트';

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_za_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_za_tracking_codes_updated_at
BEFORE UPDATE ON za_tracking_codes
FOR EACH ROW
EXECUTE FUNCTION update_za_updated_at();

-- ============================================================================
-- 5. 유틸리티 뷰 (선택적)
-- ============================================================================

-- 어트리뷰션 윈도우별 전환 통계 (선택적, 향후 성능 최적화용)
CREATE OR REPLACE VIEW za_attribution_stats AS
SELECT
  advertiser_id,
  DATE(created_at) as date,
  attribution_window,
  event_type,
  COUNT(*) as conversion_count,
  SUM(value) as total_value,
  AVG(days_since_click) as avg_days_since_click
FROM za_events
WHERE is_attributed = TRUE
  AND event_type IN ('purchase', 'signup', 'lead', 'add_to_cart')
GROUP BY advertiser_id, DATE(created_at), attribution_window, event_type;

COMMENT ON VIEW za_attribution_stats IS '어트리뷰션 윈도우별 전환 통계 (읽기 전용 뷰)';

-- ============================================================================
-- 완료
-- ============================================================================

-- 마이그레이션 완료 확인
DO $$
BEGIN
  RAISE NOTICE 'Zest Analytics 마이그레이션 완료';
  RAISE NOTICE '- za_tracking_codes 테이블 생성 완료';
  RAISE NOTICE '- za_events 테이블 생성 완료 (어트리뷰션 필드 포함)';
  RAISE NOTICE '- RLS 정책 적용 완료';
  RAISE NOTICE '- 트리거 및 함수 생성 완료';
  RAISE NOTICE '- 인덱스 최적화 완료';
END $$;
