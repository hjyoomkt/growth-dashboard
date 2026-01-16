-- ===================================
-- Performance Optimization Indexes
-- Date: 2025-12-31
-- ===================================

-- ad_performance 조회 최적화
CREATE INDEX idx_ad_performance_lookup
ON ad_performance(advertiser_id, date DESC, source)
WHERE deleted_at IS NULL;

-- JSONB 필드 검색 최적화
CREATE INDEX idx_ad_performance_metrics
ON ad_performance USING GIN (additional_metrics);

-- api_tokens 조회 최적화
CREATE INDEX idx_api_tokens_advertiser
ON api_tokens(advertiser_id)
WHERE deleted_at IS NULL;

-- ad_creatives 조회 최적화
CREATE INDEX idx_ad_creatives_advertiser
ON ad_creatives(advertiser_id)
WHERE deleted_at IS NULL;
