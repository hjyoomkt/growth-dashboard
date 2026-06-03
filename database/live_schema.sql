--
-- PostgreSQL database dump
--

\restrict i4obTkl97PWAZquBQUcU5vTKPmupLdU57JcRVlO7TMsKfrM8TflKCc62kjt2x86

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: _internal_get_organization_gcp_credentials(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._internal_get_organization_gcp_credentials(org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
  org_record RECORD;
  client_id_decrypted TEXT;
  client_secret_decrypted TEXT;
  developer_token_decrypted TEXT;
  mcc_id_decrypted TEXT;
BEGIN
  -- 암호화 키 (기존 시스템과 동일)
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- organizations 레코드 조회
  SELECT * INTO org_record
  FROM organizations
  WHERE id = org_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 복호화
  IF org_record.google_client_id_encrypted IS NOT NULL THEN
    client_id_decrypted := pgp_sym_decrypt(decode(org_record.google_client_id_encrypted, 'base64'), encryption_key);
  END IF;

  IF org_record.google_client_secret_encrypted IS NOT NULL THEN
    client_secret_decrypted := pgp_sym_decrypt(decode(org_record.google_client_secret_encrypted, 'base64'), encryption_key);
  END IF;

  IF org_record.google_developer_token_encrypted IS NOT NULL THEN
    developer_token_decrypted := pgp_sym_decrypt(decode(org_record.google_developer_token_encrypted, 'base64'), encryption_key);
  END IF;

  IF org_record.google_mcc_id_encrypted IS NOT NULL THEN
    mcc_id_decrypted := pgp_sym_decrypt(decode(org_record.google_mcc_id_encrypted, 'base64'), encryption_key);
  END IF;

  RETURN jsonb_build_object(
    'client_id', client_id_decrypted,
    'client_secret', client_secret_decrypted,
    'developer_token', developer_token_decrypted,
    'mcc_id', mcc_id_decrypted
  );
END;
$$;


--
-- Name: check_and_finalize_job(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_finalize_job(p_job_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_job RECORD;
  v_integration_id UUID;
  v_final_status TEXT;
BEGIN
  -- Job 정보 조회
  SELECT
    chunks_total,
    chunks_completed,
    chunks_failed
  INTO v_job
  FROM collection_jobs
  WHERE id = p_job_id;

  -- 모든 청크가 처리되었는지 확인
  IF (v_job.chunks_completed + v_job.chunks_failed) >= v_job.chunks_total THEN
    -- 최종 상태 결정
    IF v_job.chunks_failed = v_job.chunks_total THEN
      v_final_status := 'failed';
    ELSIF v_job.chunks_failed > 0 THEN
      v_final_status := 'partial';
    ELSE
      v_final_status := 'completed';
    END IF;

    -- Job 완료 처리
    UPDATE collection_jobs
    SET
      status = v_final_status,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_job_id
    RETURNING (SELECT integration_id FROM integrations WHERE advertiser_id = collection_jobs.advertiser_id LIMIT 1)
    INTO v_integration_id;

    -- Integration 상태 업데이트
    IF v_integration_id IS NOT NULL THEN
      UPDATE integrations
      SET
        data_collection_status = CASE
          WHEN v_final_status = 'completed' THEN 'success'
          WHEN v_final_status = 'partial' THEN 'partial'
          ELSE 'error'
        END,
        last_collection_at = NOW(),
        updated_at = NOW()
      WHERE id = v_integration_id;
    END IF;

    RAISE NOTICE 'Job % finalized with status: %', p_job_id, v_final_status;
  END IF;
END;
$$;


--
-- Name: FUNCTION check_and_finalize_job(p_job_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_and_finalize_job(p_job_id uuid) IS 'Job의 모든 청크 처리 완료 시 최종 상태 업데이트 및 Integration 상태 업데이트';


--
-- Name: check_organization_gcp_credentials(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_organization_gcp_credentials(org_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  org_record RECORD;
BEGIN
  SELECT * INTO org_record
  FROM organizations
  WHERE id = org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_credentials', false,
      'has_developer_token', false,
      'has_mcc_id', false
    );
  END IF;

  RETURN jsonb_build_object(
    'has_credentials',
      org_record.google_client_id_encrypted IS NOT NULL AND
      org_record.google_client_secret_encrypted IS NOT NULL,
    'has_developer_token', org_record.google_developer_token_encrypted IS NOT NULL,
    'has_mcc_id', org_record.google_mcc_id_encrypted IS NOT NULL
  );
END;
$$;


--
-- Name: cleanup_expired_oauth_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_oauth_sessions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE oauth_authorization_sessions
  SET status = 'expired',
      error_message = 'Session expired after 15 minutes'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;


--
-- Name: FUNCTION cleanup_expired_oauth_sessions(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_oauth_sessions() IS '15분 만료된 OAuth 세션을 expired 상태로 변경';


--
-- Name: cleanup_old_access_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_access_logs() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- created_at 기준으로 30일 초과된 레코드 삭제
  DELETE FROM access_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % access log records older than 30 days', v_deleted_count;
  END IF;

  RETURN v_deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_old_access_logs(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_old_access_logs() IS 'access_logs 테이블에서 30일 초과된 레코드 자동 삭제';


--
-- Name: cleanup_old_changelogs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_changelogs() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- created_at 기준으로 5일 초과된 레코드 삭제
  DELETE FROM changelog
  WHERE created_at < NOW() - INTERVAL '5 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % changelog records older than 5 days', v_deleted_count;
  END IF;

  RETURN v_deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_old_changelogs(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_old_changelogs() IS 'changelog 테이블에서 5일 초과된 레코드 자동 삭제';


--
-- Name: cleanup_old_collection_jobs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_collection_jobs() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- created_at 기준으로 5일 초과된 레코드 삭제
  -- collection_queue는 CASCADE로 자동 삭제됨
  DELETE FROM collection_jobs
  WHERE created_at < NOW() - INTERVAL '5 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % collection_jobs older than 5 days', v_deleted_count;
  END IF;

  RETURN v_deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_old_collection_jobs(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_old_collection_jobs() IS 'collection_jobs 테이블에서 5일 초과된 레코드 자동 삭제 (collection_queue도 CASCADE 삭제)';


--
-- Name: create_integration_with_org_gcp(uuid, uuid, text, text, text, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_integration_with_org_gcp(p_organization_id uuid, p_advertiser_id uuid, p_platform text, p_customer_id text, p_mcc_id text, p_refresh_token text, p_conversion_action_ids text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
  v_integration_id UUID;
  v_gcp_creds RECORD;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- 조직의 GCP 설정 조회 (내부 함수 사용)
  SELECT * INTO v_gcp_creds FROM _internal_get_organization_gcp_credentials(p_organization_id);

  IF v_gcp_creds.client_id IS NULL OR v_gcp_creds.client_secret IS NULL THEN
    RAISE EXCEPTION 'Organization GCP credentials not found';
  END IF;

  -- integrations 테이블에 삽입
  INSERT INTO integrations (
    organization_id,
    advertiser_id,
    platform,
    customer_id,
    mcc_id,
    refresh_token_encrypted,
    client_secret_encrypted,
    developer_token_encrypted,
    conversion_action_ids,
    status
  ) VALUES (
    p_organization_id,
    p_advertiser_id,
    p_platform,
    p_customer_id,
    p_mcc_id,
    pgp_sym_encrypt(p_refresh_token, encryption_key),
    pgp_sym_encrypt(v_gcp_creds.client_secret, encryption_key),
    CASE
      WHEN v_gcp_creds.developer_token IS NOT NULL
      THEN pgp_sym_encrypt(v_gcp_creds.developer_token, encryption_key)
      ELSE NULL
    END,
    p_conversion_action_ids,
    'active'
  ) RETURNING id INTO v_integration_id;

  RETURN jsonb_build_object(
    'success', true,
    'integration_id', v_integration_id
  );
END;
$$;


--
-- Name: FUNCTION create_integration_with_org_gcp(p_organization_id uuid, p_advertiser_id uuid, p_platform text, p_customer_id text, p_mcc_id text, p_refresh_token text, p_conversion_action_ids text[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_integration_with_org_gcp(p_organization_id uuid, p_advertiser_id uuid, p_platform text, p_customer_id text, p_mcc_id text, p_refresh_token text, p_conversion_action_ids text[]) IS 'Organization GCP 설정을 사용하여 통합 생성 (서버측 처리)';


--
-- Name: encrypt_oauth_tokens(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.encrypt_oauth_tokens(p_access_token text, p_refresh_token text DEFAULT NULL::text, p_client_secret text DEFAULT NULL::text, p_encryption_key text DEFAULT 'your-encryption-key-change-this-in-production'::text) RETURNS TABLE(access_token_encrypted bytea, refresh_token_encrypted bytea, client_secret_encrypted bytea)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY SELECT
    pgp_sym_encrypt(p_access_token, p_encryption_key) as access_token_encrypted,
    CASE
      WHEN p_refresh_token IS NOT NULL
      THEN pgp_sym_encrypt(p_refresh_token, p_encryption_key)
      ELSE NULL
    END as refresh_token_encrypted,
    CASE
      WHEN p_client_secret IS NOT NULL
      THEN pgp_sym_encrypt(p_client_secret, p_encryption_key)
      ELSE NULL
    END as client_secret_encrypted;
END;
$$;


--
-- Name: FUNCTION encrypt_oauth_tokens(p_access_token text, p_refresh_token text, p_client_secret text, p_encryption_key text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.encrypt_oauth_tokens(p_access_token text, p_refresh_token text, p_client_secret text, p_encryption_key text) IS 'OAuth 토큰을 pgcrypto로 암호화 (access_token, refresh_token, client_secret)';


--
-- Name: generate_za_tracking_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_za_tracking_id() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION generate_za_tracking_id(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_za_tracking_id() IS 'ZA-XXXXXXXX 형식의 고유 추적 ID 생성';


--
-- Name: get_ad_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ad_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(source text, campaign_name text, ad_group_name text, ad_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
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
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
$$;


--
-- Name: get_ad_group_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ad_group_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(source text, campaign_name text, ad_group_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    MAX(ap.campaign_name) as campaign_name,
    ap.ad_group_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
  GROUP BY ap.source, ap.ad_group_name;
END;
$$;


--
-- Name: get_age_gender_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_age_gender_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(gender text, age text, conversions numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    apd.gender,
    apd.age,
    COALESCE(SUM(CASE
      WHEN apd.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((apd.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN apd.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN apd.complete_registrations
      ELSE apd.conversions
    END), 0)::numeric as conversions
  FROM ad_performance_demographics apd
  WHERE (p_advertiser_id IS NULL OR apd.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND apd.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR apd.date >= p_start_date)
    AND (p_end_date IS NULL OR apd.date <= p_end_date)
  GROUP BY apd.gender, apd.age;
END;
$$;


--
-- Name: get_campaign_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_campaign_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(source text, campaign_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    ap.campaign_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
  GROUP BY ap.source, ap.campaign_name;
END;
$$;


--
-- Name: get_creative_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_creative_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(ad_id text, source text, campaign_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.ad_id,
    ap.source,
    MAX(ap.campaign_name) as campaign_name,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
  GROUP BY ap.ad_id, ap.source;
END;
$$;


--
-- Name: get_daily_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(date date, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.date,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
  GROUP BY ap.date
  ORDER BY ap.date ASC;
END;
$$;


--
-- Name: get_decrypted_token(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_decrypted_token(p_api_token_id uuid, p_token_type text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
  encryption_key TEXT;
  encrypted_value BYTEA;
  decrypted_value TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- 1. integrations 테이블에서 조회
  EXECUTE format(
    'SELECT %I FROM integrations WHERE id = $1',
    p_token_type || '_encrypted'
  ) INTO encrypted_value USING p_api_token_id;

  -- 2. integrations에 없고 developer_token인 경우 organizations에서 조회
  IF encrypted_value IS NULL AND p_token_type = 'developer_token' THEN
    SELECT o.google_developer_token_encrypted::bytea
    INTO encrypted_value
    FROM integrations i
    JOIN advertisers a ON i.advertiser_id = a.id
    JOIN organizations o ON a.organization_id = o.id
    WHERE i.id = p_api_token_id;
  END IF;

  -- 3. api_tokens 테이블 (하위 호환성)
  IF encrypted_value IS NULL AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'api_tokens'
  ) THEN
    EXECUTE format(
      'SELECT %I FROM api_tokens WHERE id = $1',
      p_token_type || '_encrypted'
    ) INTO encrypted_value USING p_api_token_id;
  END IF;

  IF encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;

  -- 복호화
  decrypted_value := pgp_sym_decrypt(encrypted_value, encryption_key);
  RETURN decrypted_value;
END;
$_$;


--
-- Name: get_decrypted_token_debug(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_decrypted_token_debug(p_api_token_id uuid, p_token_type text) RETURNS TABLE(column_name text, encrypted_value bytea, decrypted_value text, error_msg text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
  encryption_key TEXT;
  v_encrypted_value BYTEA;
  v_decrypted_value TEXT;
  v_column_name TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';
  v_column_name := p_token_type || '_encrypted';

  -- integrations 테이블에서 조회
  BEGIN
    EXECUTE format(
      'SELECT %I FROM integrations WHERE id = $1',
      v_column_name
    ) INTO v_encrypted_value USING p_api_token_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT v_column_name, NULL::bytea, NULL::text, SQLERRM;
    RETURN;
  END;

  IF v_encrypted_value IS NOT NULL THEN
    v_decrypted_value := pgp_sym_decrypt(v_encrypted_value, encryption_key);
  END IF;

  RETURN QUERY SELECT v_column_name, v_encrypted_value, v_decrypted_value, 'success'::text;
END;
$_$;


--
-- Name: get_download_csv_data(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_download_csv_data(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(date date, source text, campaign_name text, ad_group_name text, ad_name text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric, add_to_cart integer, add_to_cart_value numeric, complete_registrations integer, complete_registrations_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.date,
    ap.source,
    ap.campaign_name,
    ap.ad_group_name,
    ap.ad_name,
    ap.cost,
    ap.impressions,
    ap.clicks,
    CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN COALESCE(ap.complete_registrations, 0)::numeric
      ELSE ap.conversions
    END as conversions,
    CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN COALESCE(ap.complete_registrations_value, 0)::numeric
      ELSE ap.conversion_value
    END as conversion_value,
    ap.add_to_cart,
    ap.add_to_cart_value,
    ap.complete_registrations,
    ap.complete_registrations_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NULL OR ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  ORDER BY ap.date ASC, ap.source, ap.campaign_name, ap.ad_group_name, ap.ad_name;
END;
$$;


--
-- Name: FUNCTION get_download_csv_data(p_advertiser_id uuid, p_advertiser_ids uuid[], p_start_date date, p_end_date date, p_meta_conversion_type text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_download_csv_data(p_advertiser_id uuid, p_advertiser_ids uuid[], p_start_date date, p_end_date date, p_meta_conversion_type text) IS 'CSV 다운로드용 광고 성과 데이터 조회 (Meta 전환 타입 반영)';


--
-- Name: get_gender_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_gender_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(gender text, conversions numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    apd.gender,
    COALESCE(SUM(CASE
      WHEN apd.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((apd.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN apd.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN apd.complete_registrations
      ELSE apd.conversions
    END), 0)::numeric as conversions
  FROM ad_performance_demographics apd
  WHERE (p_advertiser_id IS NULL OR apd.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND apd.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR apd.date >= p_start_date)
    AND (p_end_date IS NULL OR apd.date <= p_end_date)
  GROUP BY apd.gender;
END;
$$;


--
-- Name: get_kpi_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kpi_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations_value
      ELSE ap.conversion_value
    END), 0)::numeric as conversion_value
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date);
END;
$$;


--
-- Name: get_media_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_media_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(source text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.source,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
  GROUP BY ap.source;
END;
$$;


--
-- Name: get_monthly_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_monthly_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(month_date date, month_label text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', ap.date)::date as month_date,
    TO_CHAR(DATE_TRUNC('month', ap.date), 'YYYY년 MM월') as month_label,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
  GROUP BY DATE_TRUNC('month', ap.date)
  ORDER BY DATE_TRUNC('month', ap.date) ASC;
END;
$$;


--
-- Name: get_next_pending_chunk(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_pending_chunk() RETURNS TABLE(id uuid, job_id uuid, integration_id uuid, chunk_index integer, start_date date, end_date date, collection_type text, status text, retry_count integer, max_retries integer, error_message text, last_error_at timestamp with time zone, created_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_chunk_id UUID;
BEGIN
  -- pending 청크 1개 조회 및 잠금 (FOR UPDATE SKIP LOCKED로 동시성 제어)
  SELECT collection_queue.id INTO v_chunk_id
  FROM collection_queue
  WHERE collection_queue.status = 'pending'
  ORDER BY collection_queue.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- 청크가 없으면 종료
  IF v_chunk_id IS NULL THEN
    RETURN;
  END IF;

  -- status를 processing으로 업데이트
  UPDATE collection_queue
  SET
    status = 'processing',
    started_at = NOW(),
    updated_at = NOW()
  WHERE collection_queue.id = v_chunk_id;

  -- 업데이트된 청크 반환
  RETURN QUERY
  SELECT
    collection_queue.id,
    collection_queue.job_id,
    collection_queue.integration_id,
    collection_queue.chunk_index,
    collection_queue.start_date,
    collection_queue.end_date,
    collection_queue.collection_type,
    collection_queue.status,
    collection_queue.retry_count,
    collection_queue.max_retries,
    collection_queue.error_message,
    collection_queue.last_error_at,
    collection_queue.created_at,
    collection_queue.started_at,
    collection_queue.completed_at,
    collection_queue.updated_at
  FROM collection_queue
  WHERE collection_queue.id = v_chunk_id;
END;
$$;


--
-- Name: get_next_pending_chunks(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_pending_chunks(p_limit integer DEFAULT 5) RETURNS TABLE(id uuid, job_id uuid, integration_id uuid, chunk_index integer, start_date date, end_date date, collection_type text, status text, retry_count integer, max_retries integer, error_message text, last_error_at timestamp with time zone, created_at timestamp with time zone, started_at timestamp with time zone, completed_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_chunk_ids UUID[];
BEGIN
  -- 조건을 만족하는 청크 선택 (광고 계정별 1개씩, 최대 p_limit개)
  WITH eligible AS (
    SELECT DISTINCT ON (integrations.legacy_account_id)
      collection_queue.id AS cq_id,  -- ← 명확한 alias 추가
      integrations.legacy_account_id
    FROM collection_queue
    JOIN integrations ON collection_queue.integration_id = integrations.id
    WHERE collection_queue.status = 'pending'
      -- 의존성 확인: depends_on_job_id가 없거나 완료된 경우만
      AND (
        collection_queue.depends_on_job_id IS NULL
        OR EXISTS (
          SELECT 1 FROM collection_jobs
          WHERE collection_jobs.id = collection_queue.depends_on_job_id
          AND collection_jobs.status = 'completed'
        )
      )
      -- 같은 광고 계정의 processing 청크가 없는 경우만
      AND NOT EXISTS (
        SELECT 1 FROM collection_queue cq2
        JOIN integrations i2 ON cq2.integration_id = i2.id
        WHERE cq2.status = 'processing'
        AND i2.legacy_account_id = integrations.legacy_account_id
      )
    ORDER BY
      integrations.legacy_account_id,
      collection_queue.job_id ASC,
      collection_queue.chunk_index ASC
  )
  SELECT ARRAY(
    SELECT cq.id
    FROM collection_queue cq
    WHERE cq.id IN (SELECT cq_id FROM eligible LIMIT p_limit)
    FOR UPDATE SKIP LOCKED
  )
  INTO v_chunk_ids;

  -- 선택된 청크가 없으면 종료
  IF v_chunk_ids IS NULL OR array_length(v_chunk_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- 선택된 청크들을 processing으로 업데이트
  UPDATE collection_queue
  SET
    status = 'processing',
    started_at = NOW(),
    updated_at = NOW()
  WHERE collection_queue.id = ANY(v_chunk_ids);

  -- 업데이트된 청크들 반환
  RETURN QUERY
  SELECT
    collection_queue.id,
    collection_queue.job_id,
    collection_queue.integration_id,
    collection_queue.chunk_index,
    collection_queue.start_date,
    collection_queue.end_date,
    collection_queue.collection_type,
    collection_queue.status,
    collection_queue.retry_count,
    collection_queue.max_retries,
    collection_queue.error_message,
    collection_queue.last_error_at,
    collection_queue.created_at,
    collection_queue.started_at,
    collection_queue.completed_at,
    collection_queue.updated_at
  FROM collection_queue
  WHERE collection_queue.id = ANY(v_chunk_ids)
  ORDER BY collection_queue.created_at ASC;
END;
$$;


--
-- Name: FUNCTION get_next_pending_chunks(p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_next_pending_chunks(p_limit integer) IS '여러 청크 병렬 처리 (광고계정별 1개, 의존성+processing 확인) - ambiguous id 오류 수정';


--
-- Name: get_organization_gcp_credentials(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_organization_gcp_credentials(org_id uuid) RETURNS TABLE(client_id text, client_secret text, developer_token text, mcc_id text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- 복호화된 실제 값 반환
  RETURN QUERY
  SELECT
    CASE
      WHEN google_client_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_client_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END as client_id,
    CASE
      WHEN google_client_secret_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_client_secret_encrypted::bytea, encryption_key)
      ELSE NULL
    END as client_secret,
    CASE
      WHEN google_developer_token_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_developer_token_encrypted::bytea, encryption_key)
      ELSE NULL
    END as developer_token,
    CASE
      WHEN google_mcc_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_mcc_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END as mcc_id
  FROM organizations
  WHERE id = org_id;
END;
$$;


--
-- Name: FUNCTION get_organization_gcp_credentials(org_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_organization_gcp_credentials(org_id uuid) IS 'GCP 설정 조회 (복호화된 실제 값 반환, OAuth용)';


--
-- Name: get_organization_gcp_preview(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_organization_gcp_preview(org_id uuid) RETURNS TABLE(client_id_preview text, client_secret_preview text, developer_token_preview text, mcc_id_preview text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
  v_client_id TEXT;
  v_client_secret TEXT;
  v_developer_token TEXT;
  v_mcc_id TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- 복호화
  SELECT
    CASE
      WHEN google_client_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_client_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN google_client_secret_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_client_secret_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN google_developer_token_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_developer_token_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN google_mcc_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(google_mcc_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END
  INTO v_client_id, v_client_secret, v_developer_token, v_mcc_id
  FROM organizations
  WHERE id = org_id;

  -- 마스킹 처리
  RETURN QUERY SELECT
    CASE
      WHEN v_client_id IS NOT NULL AND length(v_client_id) > 8
      THEN substring(v_client_id from 1 for 4) || '••••••••' || substring(v_client_id from length(v_client_id) - 3)
      WHEN v_client_id IS NOT NULL
      THEN '••••••••'
      ELSE ''
    END as client_id_preview,
    CASE
      WHEN v_client_secret IS NOT NULL AND length(v_client_secret) > 12
      THEN substring(v_client_secret from 1 for 6) || '••••••••••••••••'
      WHEN v_client_secret IS NOT NULL
      THEN '••••••••••••••••'
      ELSE ''
    END as client_secret_preview,
    CASE
      WHEN v_developer_token IS NOT NULL AND length(v_developer_token) > 8
      THEN substring(v_developer_token from 1 for 4) || '••••••••'
      WHEN v_developer_token IS NOT NULL
      THEN '••••••••'
      ELSE ''
    END as developer_token_preview,
    CASE
      WHEN v_mcc_id IS NOT NULL AND length(v_mcc_id) > 6
      THEN substring(v_mcc_id from 1 for 3) || '•••' || substring(v_mcc_id from length(v_mcc_id) - 2)
      WHEN v_mcc_id IS NOT NULL
      THEN '•••'
      ELSE ''
    END as mcc_id_preview;
END;
$$;


--
-- Name: FUNCTION get_organization_gcp_preview(org_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_organization_gcp_preview(org_id uuid) IS 'GCP 설정 미리보기 (부분 마스킹, MCC ID 포함)';


--
-- Name: get_organization_google_tokens(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_organization_google_tokens(p_user_email text DEFAULT NULL::text) RETURNS TABLE(integration_id uuid, google_account_email text, created_by_user_email text, created_at timestamp with time zone, advertiser_name text, advertiser_id uuid, organization_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
#variable_conflict use_column
DECLARE
  v_user_email TEXT;
  v_user_id UUID;
  v_role TEXT;
  v_current_org_id UUID;
BEGIN
  v_user_email := COALESCE(p_user_email, auth.email());

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User email not found';
  END IF;

  SELECT id, role, organization_id INTO v_user_id, v_role, v_current_org_id
  FROM users
  WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', v_user_email;
  END IF;

  IF LOWER(v_role) = 'master' THEN
    RETURN QUERY
    SELECT
      i.id,
      i.google_account_email,
      u.email,
      i.created_at,
      a.name,
      a.id,
      a.organization_id
    FROM integrations i
    JOIN advertisers a ON i.advertiser_id = a.id
    LEFT JOIN users u ON i.created_by_user_id = u.id
    WHERE i.platform = 'Google Ads'
      AND i.oauth_refresh_token_encrypted IS NOT NULL
      AND i.deleted_at IS NULL
      AND a.deleted_at IS NULL
    ORDER BY i.created_at DESC;
    RETURN;
  END IF;

  IF v_role = 'agency_admin' THEN
    IF v_current_org_id IS NULL THEN
      RAISE EXCEPTION 'Agency admin must have organization_id';
    END IF;

    RETURN QUERY
    SELECT
      i.id,
      i.google_account_email,
      u.email,
      i.created_at,
      a.name,
      a.id,
      a.organization_id
    FROM integrations i
    JOIN advertisers a ON i.advertiser_id = a.id
    LEFT JOIN users u ON i.created_by_user_id = u.id
    WHERE i.platform = 'Google Ads'
      AND i.oauth_refresh_token_encrypted IS NOT NULL
      AND a.organization_id = v_current_org_id
      AND i.deleted_at IS NULL
      AND a.deleted_at IS NULL
    ORDER BY i.created_at DESC;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.google_account_email,
    u.email,
    i.created_at,
    a.name,
    a.id,
    a.organization_id
  FROM integrations i
  JOIN advertisers a ON i.advertiser_id = a.id
  LEFT JOIN users u ON i.created_by_user_id = u.id
  WHERE i.platform = 'Google Ads'
    AND i.oauth_refresh_token_encrypted IS NOT NULL
    AND a.id IN (
      SELECT ua.advertiser_id
      FROM user_advertisers ua
      WHERE ua.user_id = v_user_id
    )
    AND i.deleted_at IS NULL
    AND a.deleted_at IS NULL
  ORDER BY i.created_at DESC;
END;
$$;


--
-- Name: get_organization_meta_credentials(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_organization_meta_credentials(org_id uuid) RETURNS TABLE(app_id text, app_secret text, access_token text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  RETURN QUERY
  SELECT
    CASE
      WHEN meta_app_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_app_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END as app_id,
    CASE
      WHEN meta_app_secret_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_app_secret_encrypted::bytea, encryption_key)
      ELSE NULL
    END as app_secret,
    CASE
      WHEN meta_access_token_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_access_token_encrypted::bytea, encryption_key)
      ELSE NULL
    END as access_token
  FROM organizations
  WHERE id = org_id;
END;
$$;


--
-- Name: FUNCTION get_organization_meta_credentials(org_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_organization_meta_credentials(org_id uuid) IS 'Meta 설정 조회 (복호화된 실제 값 반환, API 호출용)';


--
-- Name: get_organization_meta_preview(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_organization_meta_preview(org_id uuid) RETURNS TABLE(app_id_preview text, app_secret_preview text, access_token_preview text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
  v_app_id TEXT;
  v_app_secret TEXT;
  v_access_token TEXT;
BEGIN
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- 복호화
  SELECT
    CASE
      WHEN meta_app_id_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_app_id_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN meta_app_secret_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_app_secret_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN meta_access_token_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(meta_access_token_encrypted::bytea, encryption_key)
      ELSE NULL
    END
  INTO v_app_id, v_app_secret, v_access_token
  FROM organizations
  WHERE id = org_id;

  -- 마스킹 처리
  RETURN QUERY SELECT
    -- App ID: 처음 4자 + 마스킹 + 마지막 4자
    CASE
      WHEN v_app_id IS NOT NULL AND length(v_app_id) > 8
      THEN substring(v_app_id from 1 for 4) || '••••••••' || substring(v_app_id from length(v_app_id) - 3)
      WHEN v_app_id IS NOT NULL
      THEN '••••••••'
      ELSE ''
    END as app_id_preview,

    -- App Secret: 처음 6자 + 마스킹
    CASE
      WHEN v_app_secret IS NOT NULL AND length(v_app_secret) > 12
      THEN substring(v_app_secret from 1 for 6) || '••••••••••••••••'
      WHEN v_app_secret IS NOT NULL
      THEN '••••••••••••••••'
      ELSE ''
    END as app_secret_preview,

    -- Access Token: 처음 10자 + 마스킹 + 마지막 10자
    CASE
      WHEN v_access_token IS NOT NULL AND length(v_access_token) > 20
      THEN substring(v_access_token from 1 for 10) || '••••••••••••••••••••' || substring(v_access_token from length(v_access_token) - 9)
      WHEN v_access_token IS NOT NULL
      THEN '••••••••••••••••••••'
      ELSE ''
    END as access_token_preview;
END;
$$;


--
-- Name: FUNCTION get_organization_meta_preview(org_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_organization_meta_preview(org_id uuid) IS 'Meta 설정 미리보기 (부분 마스킹)';


--
-- Name: get_organization_naver_credentials(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_organization_naver_credentials(org_id uuid) RETURNS TABLE(api_key text, secret_key text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN naver_api_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(naver_api_key_encrypted::bytea, encryption_key)
      ELSE NULL
    END AS api_key,
    CASE
      WHEN naver_secret_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(naver_secret_key_encrypted::bytea, encryption_key)
      ELSE NULL
    END AS secret_key
  FROM organizations
  WHERE id = org_id;
END;
$$;


--
-- Name: FUNCTION get_organization_naver_credentials(org_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_organization_naver_credentials(org_id uuid) IS '네이버 자격증명 복호화 조회 함수 (Edge Function 전용, 마스킹 없음)';


--
-- Name: get_organization_naver_preview(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_organization_naver_preview(org_id uuid) RETURNS TABLE(api_key_preview text, secret_key_preview text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
  decrypted_api_key TEXT;
  decrypted_secret_key TEXT;
BEGIN
  -- 암호화된 값 복호화
  SELECT
    CASE
      WHEN naver_api_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(naver_api_key_encrypted::bytea, encryption_key)
      ELSE NULL
    END,
    CASE
      WHEN naver_secret_key_encrypted IS NOT NULL
      THEN pgp_sym_decrypt(naver_secret_key_encrypted::bytea, encryption_key)
      ELSE NULL
    END
  INTO decrypted_api_key, decrypted_secret_key
  FROM organizations
  WHERE id = org_id;

  -- 마스킹 처리 후 반환
  RETURN QUERY
  SELECT
    -- API Key 마스킹 (앞 4자리 + ••••••••  + 뒤 4자리)
    CASE
      WHEN decrypted_api_key IS NOT NULL AND LENGTH(decrypted_api_key) > 8 THEN
        CONCAT(
          SUBSTRING(decrypted_api_key, 1, 4),
          '••••••••',
          SUBSTRING(decrypted_api_key, LENGTH(decrypted_api_key) - 3)
        )
      WHEN decrypted_api_key IS NOT NULL THEN
        '••••••••'
      ELSE NULL
    END AS api_key_preview,
    -- Secret Key 마스킹 (앞 4자리 + •••••••• + 뒤 4자리)
    CASE
      WHEN decrypted_secret_key IS NOT NULL AND LENGTH(decrypted_secret_key) > 8 THEN
        CONCAT(
          SUBSTRING(decrypted_secret_key, 1, 4),
          '••••••••',
          SUBSTRING(decrypted_secret_key, LENGTH(decrypted_secret_key) - 3)
        )
      WHEN decrypted_secret_key IS NOT NULL THEN
        '••••••••'
      ELSE NULL
    END AS secret_key_preview;
END;
$$;


--
-- Name: FUNCTION get_organization_naver_preview(org_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_organization_naver_preview(org_id uuid) IS '네이버 자격증명 미리보기 조회 함수 (마스킹 처리, 프론트엔드용)';


--
-- Name: get_user_advertiser_ids(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_advertiser_ids(user_email text) RETURNS TABLE(id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_org_id UUID;
  v_has_assignments BOOLEAN;
BEGIN
  -- 사용자 정보 조회
  SELECT u.id, u.role, u.organization_id 
  INTO v_user_id, v_role, v_org_id
  FROM users u
  WHERE u.email = user_email;

  -- Master/Specialist: 모든 브랜드
  IF LOWER(v_role) IN ('master', 'specialist') THEN
    RETURN QUERY 
    SELECT a.id FROM advertisers a WHERE a.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Agency Admin: 조직 전체
  IF v_role = 'agency_admin' THEN
    RETURN QUERY
    SELECT a.id FROM advertisers a
    WHERE a.organization_id = v_org_id AND a.deleted_at IS NULL;
    RETURN;
  END IF;

  -- Agency Manager/Staff: user_advertisers 확인 후 분기
  IF v_role IN ('agency_manager', 'agency_staff') THEN
    -- user_advertisers에 할당 있는지 체크
    SELECT EXISTS(
      SELECT 1 FROM user_advertisers WHERE user_id = v_user_id
    ) INTO v_has_assignments;

    -- 할당 없으면 조직 전체, 있으면 할당된 브랜드만
    IF NOT v_has_assignments AND v_org_id IS NOT NULL THEN
      RETURN QUERY
      SELECT a.id FROM advertisers a
      WHERE a.organization_id = v_org_id AND a.deleted_at IS NULL;
    ELSE
      RETURN QUERY
      SELECT ua.advertiser_id
      FROM user_advertisers ua
      INNER JOIN advertisers a ON ua.advertiser_id = a.id
      WHERE ua.user_id = v_user_id AND a.deleted_at IS NULL;
    END IF;
    RETURN;
  END IF;

  -- Advertiser 역할: user_advertisers만
  RETURN QUERY
  SELECT ua.advertiser_id
  FROM user_advertisers ua
  INNER JOIN advertisers a ON ua.advertiser_id = a.id
  WHERE ua.user_id = v_user_id AND a.deleted_at IS NULL;
END;
$$;


--
-- Name: get_user_advertiser_ids_by_uid(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_advertiser_ids_by_uid(user_uid uuid) RETURNS TABLE(advertiser_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_email TEXT;
  v_role TEXT;
  v_org_id UUID;
BEGIN
  -- auth.users에서 이메일 조회
  SELECT email INTO v_email FROM auth.users WHERE id = user_uid;
  
  -- public.users에서 역할과 organization 조회
  SELECT role, organization_id INTO v_role, v_org_id
  FROM users WHERE email = v_email;

  IF LOWER(v_role) = 'master' THEN
    RETURN QUERY SELECT id FROM advertisers WHERE deleted_at IS NULL;
    RETURN;
  END IF;

  IF v_role = 'agency_admin' THEN
    RETURN QUERY SELECT a.id FROM advertisers a WHERE a.organization_id = v_org_id AND a.deleted_at IS NULL;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ua.advertiser_id FROM user_advertisers ua
  INNER JOIN users u ON ua.user_id = u.id
  INNER JOIN advertisers a ON ua.advertiser_id = a.id
  WHERE u.email = v_email AND a.deleted_at IS NULL;
END;
$$;


--
-- Name: get_weekday_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_weekday_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(day_of_week integer, conversions numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM ap.date)::integer as day_of_week,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions
  FROM ad_performance ap
  WHERE ap.deleted_at IS NULL
    AND (p_advertiser_id IS NULL OR ap.advertiser_id = p_advertiser_id)
    AND (p_advertiser_ids IS NOT NULL AND ap.advertiser_id = ANY(p_advertiser_ids))
    AND (p_start_date IS NULL OR ap.date >= p_start_date)
    AND (p_end_date IS NULL OR ap.date <= p_end_date)
  GROUP BY EXTRACT(DOW FROM ap.date)
  ORDER BY EXTRACT(DOW FROM ap.date);
END;
$$;


--
-- Name: get_weekly_aggregated(uuid, uuid[], date, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_weekly_aggregated(p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_ids uuid[] DEFAULT NULL::uuid[], p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_meta_conversion_type text DEFAULT 'purchase'::text) RETURNS TABLE(week_start date, week_end date, week_label text, cost numeric, impressions bigint, clicks bigint, conversions numeric, conversion_value numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('week', ap.date)::date + 1 as week_start,
    (DATE_TRUNC('week', ap.date)::date + 7) as week_end,
    TO_CHAR(DATE_TRUNC('week', ap.date)::date + 1, 'MM/DD') || ' ~ ' ||
    TO_CHAR(DATE_TRUNC('week', ap.date)::date + 7, 'MM/DD') as week_label,
    COALESCE(SUM(ap.cost), 0)::numeric as cost,
    COALESCE(SUM(ap.impressions), 0)::bigint as impressions,
    COALESCE(SUM(ap.clicks), 0)::bigint as clicks,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'actions'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
      WHEN ap.source = 'Meta' AND p_meta_conversion_type = 'complete_registration'
        THEN ap.complete_registrations
      ELSE ap.conversions
    END), 0)::numeric as conversions,
    COALESCE(SUM(CASE
      WHEN ap.source = 'Meta' AND p_meta_conversion_type LIKE 'custom:%'
        THEN COALESCE((ap.additional_metrics->'action_values'->>substring(p_meta_conversion_type FROM 8))::numeric, 0)
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
  GROUP BY DATE_TRUNC('week', ap.date)
  ORDER BY DATE_TRUNC('week', ap.date) ASC;
END;
$$;


--
-- Name: has_organization_gcp_credentials(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_organization_gcp_credentials(org_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_has_credentials BOOLEAN;
BEGIN
  SELECT
    (google_client_id_encrypted IS NOT NULL AND google_client_secret_encrypted IS NOT NULL)
  INTO v_has_credentials
  FROM organizations
  WHERE id = org_id;

  RETURN COALESCE(v_has_credentials, false);
END;
$$;


--
-- Name: FUNCTION has_organization_gcp_credentials(org_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.has_organization_gcp_credentials(org_id uuid) IS '조직에 Google API 자격증명이 설정되어 있는지 확인';


--
-- Name: increment_chunks_completed(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_chunks_completed(p_job_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_total INT;
  v_completed INT;
BEGIN
  -- chunks_completed 증가
  UPDATE collection_jobs
  SET
    chunks_completed = chunks_completed + 1,
    updated_at = NOW()
  WHERE id = p_job_id
  RETURNING chunks_total, chunks_completed INTO v_total, v_completed;

  -- 모든 청크 완료 시 job status를 completed로 변경
  IF v_completed >= v_total THEN
    UPDATE collection_jobs
    SET
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_job_id;
  END IF;
END;
$$;


--
-- Name: FUNCTION increment_chunks_completed(p_job_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.increment_chunks_completed(p_job_id uuid) IS 'collection_jobs의 chunks_completed 카운터를 1 증가하고, 모든 청크 완료 시 status를 completed로 변경';


--
-- Name: increment_chunks_failed(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_chunks_failed(p_job_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE collection_jobs
  SET
    chunks_failed = chunks_failed + 1,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;


--
-- Name: FUNCTION increment_chunks_failed(p_job_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.increment_chunks_failed(p_job_id uuid) IS 'collection_jobs의 chunks_failed 카운터를 1 증가';


--
-- Name: invoke_collection_worker(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invoke_collection_worker() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  PERFORM net.http_get(
    url := 'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/collection-worker'
  );
END;
$$;


--
-- Name: FUNCTION invoke_collection_worker(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.invoke_collection_worker() IS 'collection-worker Edge Function 호출 (collection_queue 처리)';


--
-- Name: log_access(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_access(p_user_id uuid, p_action text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_user_role TEXT;
  v_organization_id UUID;
  v_organization_name TEXT;
  v_advertiser_id UUID;
  v_advertiser_name TEXT;
  v_log_id BIGINT;
BEGIN
  -- 사용자 정보 조회 (deleted_at 무시)
  SELECT
    u.email,
    u.name,
    u.role,
    u.organization_id,
    o.name as org_name,
    u.advertiser_id
  INTO
    v_user_email,
    v_user_name,
    v_user_role,
    v_organization_id,
    v_organization_name,
    v_advertiser_id
  FROM users u
  LEFT JOIN organizations o ON o.id = u.organization_id
  WHERE u.id = p_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- advertiser 이름 조회
  IF v_advertiser_id IS NOT NULL THEN
    SELECT name INTO v_advertiser_name
    FROM advertisers
    WHERE id = v_advertiser_id;
  END IF;

  -- access_logs 레코드 삽입
  INSERT INTO access_logs (
    user_id,
    user_email,
    user_name,
    user_role,
    organization_id,
    organization_name,
    advertiser_id,
    advertiser_name,
    action,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_user_id,
    v_user_email,
    COALESCE(v_user_name, 'Unknown'),
    v_user_role,
    v_organization_id,
    v_organization_name,
    v_advertiser_id,
    v_advertiser_name,
    p_action,
    p_ip_address::INET,
    p_user_agent,
    NOW()  -- TIMESTAMPTZ는 자동으로 UTC 저장, 조회 시 KST 변환
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


--
-- Name: FUNCTION log_access(p_user_id uuid, p_action text, p_ip_address text, p_user_agent text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_access(p_user_id uuid, p_action text, p_ip_address text, p_user_agent text) IS '사용자 액세스 로그를 기록하는 헬퍼 함수';


--
-- Name: log_changelog(text, uuid, text, text, text, uuid, text, uuid, text, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_changelog(p_target_type text, p_target_id uuid, p_target_name text, p_action_type text, p_action_detail text, p_advertiser_id uuid DEFAULT NULL::uuid, p_advertiser_name text DEFAULT NULL::text, p_organization_id uuid DEFAULT NULL::uuid, p_organization_name text DEFAULT NULL::text, p_old_value jsonb DEFAULT NULL::jsonb, p_new_value jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_role TEXT;
  v_changelog_id UUID;
BEGIN
  -- 현재 사용자 정보 조회
  SELECT id, name, email, role
  INTO v_user_id, v_user_name, v_user_email, v_user_role
  FROM users
  WHERE id = auth.uid()
  AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for auth.uid()';
  END IF;

  -- changelog 레코드 삽입
  INSERT INTO changelog (
    target_type,
    target_id,
    target_name,
    action_type,
    action_detail,
    advertiser_id,
    advertiser_name,
    organization_id,
    organization_name,
    changed_by_id,
    changed_by_name,
    changed_by_email,
    changed_by_role,
    old_value,
    new_value
  ) VALUES (
    p_target_type,
    p_target_id,
    p_target_name,
    p_action_type,
    p_action_detail,
    p_advertiser_id,
    p_advertiser_name,
    p_organization_id,
    p_organization_name,
    v_user_id,
    COALESCE(v_user_name, 'Unknown'),
    v_user_email,
    v_user_role,
    p_old_value,
    p_new_value
  )
  RETURNING id INTO v_changelog_id;

  RETURN v_changelog_id;
END;
$$;


--
-- Name: FUNCTION log_changelog(p_target_type text, p_target_id uuid, p_target_name text, p_action_type text, p_action_detail text, p_advertiser_id uuid, p_advertiser_name text, p_organization_id uuid, p_organization_name text, p_old_value jsonb, p_new_value jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_changelog(p_target_type text, p_target_id uuid, p_target_name text, p_action_type text, p_action_detail text, p_advertiser_id uuid, p_advertiser_name text, p_organization_id uuid, p_organization_name text, p_old_value jsonb, p_new_value jsonb) IS '변경 이력을 changelog 테이블에 기록하는 헬퍼 함수';


--
-- Name: reset_stuck_processing_chunks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_stuck_processing_chunks() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_reset_count INTEGER;
BEGIN
  UPDATE collection_queue
  SET
    status = 'pending',
    started_at = NULL,
    error_message = 'Auto-recovered: stuck in processing',
    last_error_at = NOW()
  WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  IF v_reset_count > 0 THEN
    RAISE NOTICE 'Auto-recovered % stuck processing chunks', v_reset_count;
  END IF;

  RETURN v_reset_count;
END;
$$;


--
-- Name: save_organization_gcp_credentials(uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_organization_gcp_credentials(org_id uuid, p_client_id text DEFAULT NULL::text, p_client_secret text DEFAULT NULL::text, p_developer_token text DEFAULT NULL::text, p_mcc_id text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- 암호화 키 (기존 시스템과 동일)
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- Client ID 저장 또는 삭제
  IF p_client_id IS NOT NULL THEN
    IF p_client_id = '' OR p_client_id = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET google_client_id_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET google_client_id_encrypted = pgp_sym_encrypt(p_client_id, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- Client Secret 저장 또는 삭제
  IF p_client_secret IS NOT NULL THEN
    IF p_client_secret = '' OR p_client_secret = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET google_client_secret_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET google_client_secret_encrypted = pgp_sym_encrypt(p_client_secret, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- Developer Token 저장 또는 삭제
  IF p_developer_token IS NOT NULL THEN
    IF p_developer_token = '' OR p_developer_token = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET google_developer_token_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET google_developer_token_encrypted = pgp_sym_encrypt(p_developer_token, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- MCC ID 저장 또는 삭제 (신규 추가)
  IF p_mcc_id IS NOT NULL THEN
    IF p_mcc_id = '' OR p_mcc_id = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET google_mcc_id_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET google_mcc_id_encrypted = pgp_sym_encrypt(p_mcc_id, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- updated_at 갱신
  UPDATE organizations
  SET updated_at = NOW()
  WHERE id = org_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'GCP credentials saved with PGP encryption'
  );
END;
$$;


--
-- Name: FUNCTION save_organization_gcp_credentials(org_id uuid, p_client_id text, p_client_secret text, p_developer_token text, p_mcc_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.save_organization_gcp_credentials(org_id uuid, p_client_id text, p_client_secret text, p_developer_token text, p_mcc_id text) IS '조직의 Google API 자격증명 저장/삭제 (PGP 암호화, MCC ID 포함)';


--
-- Name: save_organization_meta_credentials(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_organization_meta_credentials(org_id uuid, p_app_id text DEFAULT NULL::text, p_app_secret text DEFAULT NULL::text, p_access_token text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- 암호화 키 (기존 GCP 함수와 동일한 키 사용)
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- App ID 저장 또는 삭제
  IF p_app_id IS NOT NULL THEN
    IF p_app_id = '' OR p_app_id = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET meta_app_id_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET meta_app_id_encrypted = pgp_sym_encrypt(p_app_id, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- App Secret 저장 또는 삭제
  IF p_app_secret IS NOT NULL THEN
    IF p_app_secret = '' OR p_app_secret = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET meta_app_secret_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET meta_app_secret_encrypted = pgp_sym_encrypt(p_app_secret, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- Access Token 저장 또는 삭제
  IF p_access_token IS NOT NULL THEN
    IF p_access_token = '' OR p_access_token = 'EMPTY_STRING' THEN
      UPDATE organizations
      SET meta_access_token_encrypted = NULL
      WHERE id = org_id;
    ELSE
      UPDATE organizations
      SET meta_access_token_encrypted = pgp_sym_encrypt(p_access_token, encryption_key)
      WHERE id = org_id;
    END IF;
  END IF;

  -- updated_at 갱신
  UPDATE organizations
  SET updated_at = NOW()
  WHERE id = org_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Meta credentials saved with PGP encryption'
  );
END;
$$;


--
-- Name: FUNCTION save_organization_meta_credentials(org_id uuid, p_app_id text, p_app_secret text, p_access_token text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.save_organization_meta_credentials(org_id uuid, p_app_id text, p_app_secret text, p_access_token text) IS '조직의 Meta API 자격증명 저장/삭제 (PGP 암호화)';


--
-- Name: save_organization_naver_credentials(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_organization_naver_credentials(org_id uuid, p_api_key text DEFAULT NULL::text, p_secret_key text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT := 'your-encryption-key-change-this-in-production';
BEGIN
  -- API Key 처리
  IF p_api_key = 'EMPTY_STRING' THEN
    -- 삭제: EMPTY_STRING이 전달되면 NULL로 설정
    UPDATE organizations SET naver_api_key_encrypted = NULL WHERE id = org_id;
  ELSIF p_api_key IS NOT NULL THEN
    -- 저장: API Key 암호화 후 저장
    UPDATE organizations
    SET naver_api_key_encrypted = pgp_sym_encrypt(p_api_key, encryption_key)
    WHERE id = org_id;
  END IF;

  -- Secret Key 처리
  IF p_secret_key = 'EMPTY_STRING' THEN
    -- 삭제: EMPTY_STRING이 전달되면 NULL로 설정
    UPDATE organizations SET naver_secret_key_encrypted = NULL WHERE id = org_id;
  ELSIF p_secret_key IS NOT NULL THEN
    -- 저장: Secret Key 암호화 후 저장
    UPDATE organizations
    SET naver_secret_key_encrypted = pgp_sym_encrypt(p_secret_key, encryption_key)
    WHERE id = org_id;
  END IF;
END;
$$;


--
-- Name: FUNCTION save_organization_naver_credentials(org_id uuid, p_api_key text, p_secret_key text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.save_organization_naver_credentials(org_id uuid, p_api_key text, p_secret_key text) IS '네이버 광고 API 자격증명 저장/삭제 함수 (Service Role 전용)';


--
-- Name: set_platform_config_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_platform_config_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- platform_config_id가 NULL이면 platform 값으로 자동 매핑
  IF NEW.platform_config_id IS NULL THEN
    NEW.platform_config_id := (
      SELECT id
      FROM platform_configs
      WHERE platform = NEW.platform
      LIMIT 1
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION set_platform_config_id(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_platform_config_id() IS 'integrations 레코드 생성 시 platform_config_id 자동 설정';


--
-- Name: store_encrypted_token(uuid, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.store_encrypted_token(p_api_token_id uuid, p_access_token text DEFAULT NULL::text, p_refresh_token text DEFAULT NULL::text, p_developer_token text DEFAULT NULL::text, p_client_secret text DEFAULT NULL::text, p_secret_key text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
  v_access_token_id UUID;
  v_refresh_token_id UUID;
  v_developer_token_id UUID;
  v_client_secret_id UUID;
  v_secret_key_id UUID;
BEGIN
  -- 암호화 키 (환경변수에서 가져오는 것이 이상적)
  encryption_key := 'your-encryption-key-change-this-in-production';

  -- integrations 테이블에 암호화 저장
  UPDATE integrations SET
    access_token_encrypted = CASE
      WHEN p_access_token IS NOT NULL
      THEN pgp_sym_encrypt(p_access_token, encryption_key)
      ELSE access_token_encrypted
    END,
    refresh_token_encrypted = CASE
      WHEN p_refresh_token IS NOT NULL
      THEN pgp_sym_encrypt(p_refresh_token, encryption_key)
      ELSE refresh_token_encrypted
    END,
    developer_token_encrypted = CASE
      WHEN p_developer_token IS NOT NULL
      THEN pgp_sym_encrypt(p_developer_token, encryption_key)
      ELSE developer_token_encrypted
    END,
    client_secret_encrypted = CASE
      WHEN p_client_secret IS NOT NULL
      THEN pgp_sym_encrypt(p_client_secret, encryption_key)
      ELSE client_secret_encrypted
    END,
    secret_key_encrypted = CASE
      WHEN p_secret_key IS NOT NULL
      THEN pgp_sym_encrypt(p_secret_key, encryption_key)
      ELSE secret_key_encrypted
    END,
    updated_at = NOW()
  WHERE id = p_api_token_id;

  -- Vault ID 생성 및 업데이트 (기존 Vault 시스템과 호환성 유지)
  IF p_access_token IS NOT NULL THEN
    v_access_token_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_access_token_vault_id = v_access_token_id
    WHERE id = p_api_token_id;
  END IF;

  IF p_refresh_token IS NOT NULL THEN
    v_refresh_token_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_refresh_token_vault_id = v_refresh_token_id
    WHERE id = p_api_token_id;
  END IF;

  IF p_developer_token IS NOT NULL THEN
    v_developer_token_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_developer_token_vault_id = v_developer_token_id
    WHERE id = p_api_token_id;
  END IF;

  IF p_client_secret IS NOT NULL THEN
    v_client_secret_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_client_secret_vault_id = v_client_secret_id
    WHERE id = p_api_token_id;
  END IF;

  IF p_secret_key IS NOT NULL THEN
    v_secret_key_id := gen_random_uuid();
    UPDATE integrations
    SET legacy_secret_key_vault_id = v_secret_key_id
    WHERE id = p_api_token_id;
  END IF;

  -- 하위 호환성: api_tokens 테이블도 업데이트 (존재하는 경우)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_tokens') THEN
    UPDATE api_tokens SET
      access_token_encrypted = CASE
        WHEN p_access_token IS NOT NULL
        THEN pgp_sym_encrypt(p_access_token, encryption_key)
        ELSE access_token_encrypted
      END,
      refresh_token_encrypted = CASE
        WHEN p_refresh_token IS NOT NULL
        THEN pgp_sym_encrypt(p_refresh_token, encryption_key)
        ELSE refresh_token_encrypted
      END,
      developer_token_encrypted = CASE
        WHEN p_developer_token IS NOT NULL
        THEN pgp_sym_encrypt(p_developer_token, encryption_key)
        ELSE developer_token_encrypted
      END,
      client_secret_encrypted = CASE
        WHEN p_client_secret IS NOT NULL
        THEN pgp_sym_encrypt(p_client_secret, encryption_key)
        ELSE client_secret_encrypted
      END,
      secret_key_encrypted = CASE
        WHEN p_secret_key IS NOT NULL
        THEN pgp_sym_encrypt(p_secret_key, encryption_key)
        ELSE secret_key_encrypted
      END,
      updated_at = NOW()
    WHERE id = p_api_token_id;
  END IF;
END;
$$;


--
-- Name: FUNCTION store_encrypted_token(p_api_token_id uuid, p_access_token text, p_refresh_token text, p_developer_token text, p_client_secret text, p_secret_key text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.store_encrypted_token(p_api_token_id uuid, p_access_token text, p_refresh_token text, p_developer_token text, p_client_secret text, p_secret_key text) IS 'API 토큰 암호화 저장 (pgcrypto 사용)';


--
-- Name: trigger_daily_scheduler(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_daily_scheduler(target_platform text, target_collection_type text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  SELECT value INTO base_url
  FROM scheduler_config
  WHERE key = 'supabase_url';

  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key';

  PERFORM net.http_post(
    url := base_url || '/functions/v1/daily-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'platform', target_platform,
      'collection_type', target_collection_type
    )
  );

  RAISE NOTICE 'Triggered: % %', target_platform, target_collection_type;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Scheduler trigger failed: %', SQLERRM;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_advertisers_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_advertisers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_za_tracking_code_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_za_tracking_code_stats() RETURNS trigger
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


--
-- Name: FUNCTION update_za_tracking_code_stats(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_za_tracking_code_stats() IS '이벤트 추가 시 추적 코드 통계 자동 업데이트';


--
-- Name: update_za_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_za_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: vault_create_secret(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vault_create_secret(secret_value text, secret_description text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'vault', 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO vault.secrets (secret, description)
  VALUES (secret_value, secret_description)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;


--
-- Name: vault_delete_secret(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vault_delete_secret(secret_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'vault', 'public'
    AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;


--
-- Name: vault_insert_secret(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vault_insert_secret(p_name text, p_secret text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO vault.secrets (name, secret)
  VALUES (p_name, p_secret)
  ON CONFLICT (name) DO UPDATE SET
    secret = EXCLUDED.secret,
    updated_at = NOW();
END;
$$;


--
-- Name: FUNCTION vault_insert_secret(p_name text, p_secret text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.vault_insert_secret(p_name text, p_secret text) IS 'Vault에 secret 저장 (name 기반, UPSERT)';


--
-- Name: vault_update_secret(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vault_update_secret(secret_id uuid, new_secret text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'vault', 'public'
    AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = new_secret
  WHERE id = secret_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_logs (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    user_email text NOT NULL,
    user_name text,
    user_role text NOT NULL,
    organization_id uuid,
    organization_name text,
    advertiser_id uuid,
    advertiser_name text,
    action text NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT access_logs_action_check CHECK ((action = ANY (ARRAY['login'::text, 'logout'::text])))
);


--
-- Name: access_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.access_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: access_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.access_logs_id_seq OWNED BY public.access_logs.id;


--
-- Name: ad_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid NOT NULL,
    external_account_id text NOT NULL,
    account_name text NOT NULL,
    currency text,
    timezone text,
    account_status text,
    additional_metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ad_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ad_accounts IS 'OAuth 계정 메타데이터 (계정명, 통화, 타임존 등)';


--
-- Name: ad_creatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_creatives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    ad_id text NOT NULL,
    campaign_name text,
    ad_group_name text,
    ad_name text,
    ad_type text,
    creative_type text,
    url text,
    width integer DEFAULT 0,
    height integer DEFAULT 0,
    hash text,
    metadata jsonb DEFAULT '{}'::jsonb,
    collected_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    image_url text,
    video_id text,
    destination_url text
);


--
-- Name: COLUMN ad_creatives.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_creatives.image_url IS 'Meta 광고 이미지 URL';


--
-- Name: COLUMN ad_creatives.video_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_creatives.video_id IS 'Meta 광고 비디오 ID';


--
-- Name: COLUMN ad_creatives.destination_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_creatives.destination_url IS '광고 클릭 시 이동하는 최종 Destination URL (Meta object_story_spec.link_data.link)';


--
-- Name: ad_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    source text NOT NULL,
    ad_id text NOT NULL,
    date date NOT NULL,
    campaign_name text,
    ad_group_name text,
    ad_name text,
    cost numeric(20,2) DEFAULT 0,
    impressions bigint DEFAULT 0,
    clicks bigint DEFAULT 0,
    conversions numeric(10,2) DEFAULT 0,
    conversion_value numeric(20,2) DEFAULT 0,
    add_to_cart integer DEFAULT 0,
    add_to_cart_value numeric(20,2) DEFAULT 0,
    additional_metrics jsonb DEFAULT '{}'::jsonb,
    collected_at timestamp with time zone DEFAULT now(),
    issue_status text DEFAULT '정상'::text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    complete_registrations integer DEFAULT 0,
    complete_registrations_value numeric(20,2) DEFAULT 0,
    cpc numeric(10,2),
    avg_rank numeric(10,2)
);


--
-- Name: COLUMN ad_performance.complete_registrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_performance.complete_registrations IS 'Meta 회원가입 완료 액션 수';


--
-- Name: COLUMN ad_performance.complete_registrations_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_performance.complete_registrations_value IS 'Meta 회원가입 완료 액션 가치';


--
-- Name: COLUMN ad_performance.cpc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_performance.cpc IS '클릭당 비용 (Cost Per Click, 네이버 고유 지표)';


--
-- Name: COLUMN ad_performance.avg_rank; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_performance.avg_rank IS '평균 순위 (Average Rank, 네이버 고유 지표)';


--
-- Name: ad_performance_demographics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_performance_demographics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    source text NOT NULL,
    date date NOT NULL,
    gender text,
    age text,
    impressions bigint DEFAULT 0,
    clicks bigint DEFAULT 0,
    cost numeric(20,2) DEFAULT 0,
    conversions numeric(10,2) DEFAULT 0,
    conversion_value numeric(20,2) DEFAULT 0,
    add_to_cart integer DEFAULT 0,
    add_to_cart_value numeric(20,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    complete_registrations integer DEFAULT 0,
    complete_registrations_value numeric(20,2) DEFAULT 0,
    additional_metrics jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE ad_performance_demographics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ad_performance_demographics IS 'Meta Ads 계정 레벨 성별/연령대 집계 테이블';


--
-- Name: COLUMN ad_performance_demographics.gender; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_performance_demographics.gender IS '성별 (male, female, unknown)';


--
-- Name: COLUMN ad_performance_demographics.age; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_performance_demographics.age IS '연령대 (18-24, 25-34, 35-44, 45-54, 55-64, 65+)';


--
-- Name: COLUMN ad_performance_demographics.complete_registrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_performance_demographics.complete_registrations IS 'Meta 회원가입 완료 액션 수';


--
-- Name: COLUMN ad_performance_demographics.complete_registrations_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ad_performance_demographics.complete_registrations_value IS 'Meta 회원가입 완료 액션 가치';


--
-- Name: advertisers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advertisers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    organization_id uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    advertiser_group_id uuid,
    business_number character varying(20),
    website_url text,
    contact_email character varying(255),
    contact_phone character varying(20),
    meta_conversion_type text DEFAULT 'purchase'::text
);


--
-- Name: COLUMN advertisers.meta_conversion_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.advertisers.meta_conversion_type IS '메타 광고 전환 지표 타입 (purchase: 구매, complete_registration: 회원가입)';


--
-- Name: agency_deletion_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agency_deletion_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE agency_deletion_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.agency_deletion_codes IS '에이전시 삭제 이메일 확인 코드';


--
-- Name: COLUMN agency_deletion_codes.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agency_deletion_codes.id IS '고유 ID';


--
-- Name: COLUMN agency_deletion_codes.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agency_deletion_codes.organization_id IS '삭제 대상 조직 ID';


--
-- Name: COLUMN agency_deletion_codes.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agency_deletion_codes.user_id IS '코드 생성자 (agency_admin)';


--
-- Name: COLUMN agency_deletion_codes.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agency_deletion_codes.code IS '6자리 확인 코드 (VERIFY-XXXXXX)';


--
-- Name: COLUMN agency_deletion_codes.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agency_deletion_codes.expires_at IS '만료 시간 (생성 후 10분)';


--
-- Name: COLUMN agency_deletion_codes.used_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agency_deletion_codes.used_at IS '사용 시간 (NULL이면 미사용)';


--
-- Name: COLUMN agency_deletion_codes.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agency_deletion_codes.created_at IS '생성 시간';


--
-- Name: api_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid,
    platform text NOT NULL,
    customer_id text,
    manager_account_id text,
    developer_token text,
    target_conversion_action_id text[],
    refresh_token text,
    client_id text,
    client_secret text,
    account_id text,
    access_token text,
    secret_key text,
    additional_credentials jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active'::text,
    data_collection_status text DEFAULT 'pending'::text,
    last_checked timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    access_token_vault_id uuid,
    refresh_token_vault_id uuid,
    developer_token_vault_id uuid,
    client_secret_vault_id uuid,
    secret_key_vault_id uuid,
    access_token_encrypted bytea,
    refresh_token_encrypted bytea,
    developer_token_encrypted bytea,
    client_secret_encrypted bytea,
    secret_key_encrypted bytea,
    deleted_advertiser_name text
);


--
-- Name: board_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    board_type text NOT NULL,
    advertiser_id uuid,
    target_roles text[] DEFAULT ARRAY['모든 사용자'::text] NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    target_advertiser_ids text[],
    advertiser_group_id uuid,
    CONSTRAINT board_posts_board_type_check CHECK ((board_type = ANY (ARRAY['admin'::text, 'brand'::text])))
);


--
-- Name: COLUMN board_posts.target_advertiser_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.board_posts.target_advertiser_ids IS 'Array of advertiser IDs that this post targets';


--
-- Name: COLUMN board_posts.advertiser_group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.board_posts.advertiser_group_id IS '브랜드 그룹 ID - 같은 그룹의 모든 브랜드가 게시글 확인 가능';


--
-- Name: board_read_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_read_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: changelog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.changelog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_type text NOT NULL,
    target_id uuid,
    target_name text,
    action_type text NOT NULL,
    action_detail text NOT NULL,
    advertiser_id uuid,
    advertiser_name text,
    organization_id uuid,
    organization_name text,
    changed_by_id uuid NOT NULL,
    changed_by_name text NOT NULL,
    changed_by_email text NOT NULL,
    changed_by_role text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT changelog_action_type_check CHECK ((action_type = ANY (ARRAY['create'::text, 'delete'::text, 'update'::text, 'invite'::text]))),
    CONSTRAINT changelog_target_type_check CHECK ((target_type = ANY (ARRAY['user'::text, 'token'::text, 'brand'::text, 'access'::text, 'role'::text])))
);


--
-- Name: collection_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    platform text NOT NULL,
    collection_type text NOT NULL,
    collection_date date,
    start_date date,
    end_date date,
    mode text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    chunks_total integer DEFAULT 0,
    chunks_completed integer DEFAULT 0,
    chunks_failed integer DEFAULT 0,
    error_message text,
    error_details jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_collection_type CHECK ((collection_type = ANY (ARRAY['ads'::text, 'demographics'::text, 'creatives'::text, 'daily'::text]))),
    CONSTRAINT valid_mode CHECK ((mode = ANY (ARRAY['initial'::text, 'daily'::text]))),
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'partial'::text])))
);


--
-- Name: TABLE collection_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.collection_jobs IS '데이터 수집 작업 로그 및 진행 상황 추적 테이블';


--
-- Name: COLUMN collection_jobs.chunks_total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collection_jobs.chunks_total IS '전체 청크 수 (90일/30일 단위 분할)';


--
-- Name: COLUMN collection_jobs.chunks_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collection_jobs.chunks_completed IS '완료된 청크 수 (실시간 업데이트)';


--
-- Name: collection_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    chunk_index integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    collection_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    error_message text,
    last_error_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    depends_on_job_id uuid,
    CONSTRAINT valid_collection_type CHECK ((collection_type = ANY (ARRAY['ads'::text, 'demographics'::text, 'creatives'::text]))),
    CONSTRAINT valid_retry_count CHECK (((retry_count >= 0) AND (retry_count <= max_retries))),
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE collection_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.collection_queue IS 'initial-collection용 청크 큐 테이블 (pg_cron + collection-worker가 1분마다 처리)';


--
-- Name: COLUMN collection_queue.chunk_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collection_queue.chunk_index IS '청크 순서 (0부터 시작, job 내에서 unique)';


--
-- Name: COLUMN collection_queue.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collection_queue.status IS 'pending: 대기 중, processing: 처리 중, completed: 완료, failed: 최종 실패';


--
-- Name: COLUMN collection_queue.retry_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collection_queue.retry_count IS '현재 재시도 횟수 (0~max_retries)';


--
-- Name: COLUMN collection_queue.depends_on_job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.collection_queue.depends_on_job_id IS '이전 job이 완료되어야만 처리 가능 (광고 → 연령대 → 크리에이티브 순서 보장)';


--
-- Name: creatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creatives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    platform text NOT NULL,
    media_url text,
    thumbnail_url text,
    headline text,
    description text,
    call_to_action text,
    impressions bigint DEFAULT 0,
    clicks bigint DEFAULT 0,
    conversions numeric(10,2) DEFAULT 0,
    cost numeric(20,2) DEFAULT 0,
    status text DEFAULT 'active'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    platform text NOT NULL,
    integration_type text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    legacy_access_token_vault_id uuid,
    legacy_refresh_token_vault_id uuid,
    legacy_developer_token_vault_id uuid,
    legacy_client_id text,
    legacy_client_secret_vault_id uuid,
    legacy_customer_id text,
    legacy_manager_account_id text,
    legacy_account_id text,
    legacy_secret_key_vault_id uuid,
    legacy_target_conversion_action_id text[],
    oauth_state text,
    oauth_access_token_vault_id uuid,
    oauth_refresh_token_vault_id uuid,
    oauth_token_expires_at timestamp with time zone,
    data_collection_status text,
    last_collection_at timestamp with time zone,
    last_error text,
    additional_credentials jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    platform_config_id uuid,
    access_token_encrypted bytea,
    refresh_token_encrypted bytea,
    developer_token_encrypted bytea,
    client_secret_encrypted bytea,
    secret_key_encrypted bytea,
    account_description text,
    oauth_access_token_encrypted bytea,
    oauth_refresh_token_encrypted bytea,
    google_account_email text,
    created_by_user_id uuid,
    is_organization_shared boolean DEFAULT false,
    CONSTRAINT valid_data_collection_status CHECK ((data_collection_status = ANY (ARRAY['pending'::text, 'success'::text, 'error'::text, 'partial'::text]))),
    CONSTRAINT valid_integration_type CHECK ((integration_type = ANY (ARRAY['token'::text, 'oauth'::text]))),
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text])))
);


--
-- Name: TABLE integrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.integrations IS 'Token/OAuth 통합 테이블 (향후 api_tokens 대체)';


--
-- Name: COLUMN integrations.integration_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.integration_type IS 'token: 수동 토큰 입력, oauth: OAuth 2.0 연동';


--
-- Name: COLUMN integrations.oauth_token_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.oauth_token_expires_at IS 'OAuth 토큰 만료 시간 (5분 버퍼로 자동 갱신)';


--
-- Name: COLUMN integrations.platform_config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.platform_config_id IS 'platform_configs 테이블 참조 (PostgREST 자동 조인용)';


--
-- Name: COLUMN integrations.access_token_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.access_token_encrypted IS '암호화된 액세스 토큰 (pgcrypto)';


--
-- Name: COLUMN integrations.refresh_token_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.refresh_token_encrypted IS '암호화된 리프레시 토큰 (pgcrypto)';


--
-- Name: COLUMN integrations.developer_token_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.developer_token_encrypted IS '암호화된 개발자 토큰 (pgcrypto)';


--
-- Name: COLUMN integrations.client_secret_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.client_secret_encrypted IS '암호화된 클라이언트 시크릿 (pgcrypto)';


--
-- Name: COLUMN integrations.secret_key_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.secret_key_encrypted IS '암호화된 시크릿 키 (pgcrypto)';


--
-- Name: COLUMN integrations.account_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.account_description IS '광고 계정 설명/메모 (같은 광고주의 여러 계정 구분용)';


--
-- Name: COLUMN integrations.oauth_access_token_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.oauth_access_token_encrypted IS 'OAuth Access Token (pgcrypto 암호화, Google Ads용)';


--
-- Name: COLUMN integrations.oauth_refresh_token_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.oauth_refresh_token_encrypted IS 'OAuth Refresh Token (pgcrypto 암호화, Google Ads용)';


--
-- Name: COLUMN integrations.google_account_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.google_account_email IS 'OAuth 인증에 사용된 Google 계정 이메일';


--
-- Name: COLUMN integrations.created_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.created_by_user_id IS '토큰을 생성한 사용자 ID';


--
-- Name: COLUMN integrations.is_organization_shared; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integrations.is_organization_shared IS '조직 단위 공유 토큰 여부 (true: 조직 내 재사용 가능)';


--
-- Name: invitation_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitation_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    organization_id uuid,
    advertiser_id uuid,
    invited_email character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    created_by uuid,
    used_by uuid,
    used_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    invite_type text DEFAULT 'existing_member'::text,
    advertiser_ids uuid[],
    parent_advertiser_id uuid,
    advertiser_names jsonb
);


--
-- Name: COLUMN invitation_codes.advertiser_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invitation_codes.advertiser_ids IS 'Array of advertiser IDs that the invited user will have access to (supports multi-brand invitation)';


--
-- Name: COLUMN invitation_codes.parent_advertiser_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invitation_codes.parent_advertiser_id IS '하위 브랜드 초대 시 부모 브랜드 ID (advertiser_group_id 상속에 사용)';


--
-- Name: COLUMN invitation_codes.advertiser_names; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invitation_codes.advertiser_names IS 'Array of advertiser names corresponding to advertiser_ids (avoids RLS issues for unauthenticated signup page)';


--
-- Name: oauth_authorization_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_authorization_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    platform text NOT NULL,
    state_token text NOT NULL,
    code_verifier text,
    code_challenge text,
    redirect_uri text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    expires_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id text,
    client_secret_vault_id uuid,
    client_secret text,
    app_origin text,
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'expired'::text])))
);


--
-- Name: TABLE oauth_authorization_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.oauth_authorization_sessions IS 'OAuth 플로우 추적 테이블 (15분 만료, CSRF/PKCE 지원)';


--
-- Name: COLUMN oauth_authorization_sessions.state_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oauth_authorization_sessions.state_token IS 'CSRF 방지용 랜덤 토큰';


--
-- Name: COLUMN oauth_authorization_sessions.code_verifier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oauth_authorization_sessions.code_verifier IS 'PKCE용 Code Verifier (Google OAuth)';


--
-- Name: COLUMN oauth_authorization_sessions.client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oauth_authorization_sessions.client_id IS 'OAuth 요청 시 사용된 Client ID';


--
-- Name: COLUMN oauth_authorization_sessions.client_secret_vault_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oauth_authorization_sessions.client_secret_vault_id IS 'OAuth 요청 시 사용된 Client Secret (Vault 저장)';


--
-- Name: COLUMN oauth_authorization_sessions.client_secret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oauth_authorization_sessions.client_secret IS 'OAuth 요청 시 사용된 Client Secret (평문, 15분 후 자동 삭제)';


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    google_client_id_vault_id uuid,
    google_client_secret_vault_id uuid,
    google_developer_token_vault_id uuid,
    google_client_id text,
    google_client_secret text,
    google_developer_token text,
    google_client_id_encrypted text,
    google_client_secret_encrypted text,
    google_developer_token_encrypted text,
    google_mcc_id_encrypted text,
    google_mcc_id_vault_id uuid,
    meta_app_id_encrypted text,
    meta_app_secret_encrypted text,
    meta_access_token_encrypted text,
    naver_api_key_encrypted text,
    naver_secret_key_encrypted text
);


--
-- Name: COLUMN organizations.google_client_id_vault_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.google_client_id_vault_id IS 'Google OAuth Client ID (Vault 저장)';


--
-- Name: COLUMN organizations.google_client_secret_vault_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.google_client_secret_vault_id IS 'Google OAuth Client Secret (Vault 저장)';


--
-- Name: COLUMN organizations.google_developer_token_vault_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.google_developer_token_vault_id IS 'Google Ads Developer Token (Vault 저장)';


--
-- Name: COLUMN organizations.google_client_id_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.google_client_id_encrypted IS 'Google OAuth Client ID (PGP 암호화)';


--
-- Name: COLUMN organizations.google_client_secret_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.google_client_secret_encrypted IS 'Google OAuth Client Secret (PGP 암호화)';


--
-- Name: COLUMN organizations.google_developer_token_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.google_developer_token_encrypted IS 'Google Ads Developer Token (PGP 암호화)';


--
-- Name: COLUMN organizations.google_mcc_id_vault_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.google_mcc_id_vault_id IS 'Google Ads MCC ID (Vault 저장)';


--
-- Name: COLUMN organizations.meta_app_id_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.meta_app_id_encrypted IS 'Meta App ID (PGP 암호화, 선택사항)';


--
-- Name: COLUMN organizations.meta_app_secret_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.meta_app_secret_encrypted IS 'Meta App Secret (PGP 암호화, 선택사항)';


--
-- Name: COLUMN organizations.meta_access_token_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.meta_access_token_encrypted IS 'Meta Long-lived User Access Token (PGP 암호화, 필수)';


--
-- Name: COLUMN organizations.naver_api_key_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.naver_api_key_encrypted IS '네이버 광고 API Key (pgcrypto 암호화)';


--
-- Name: COLUMN organizations.naver_secret_key_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.naver_secret_key_encrypted IS '네이버 광고 Secret Key (pgcrypto 암호화)';


--
-- Name: platform_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text NOT NULL,
    api_version text NOT NULL,
    oauth_enabled boolean DEFAULT false NOT NULL,
    oauth_client_id_vault_id uuid,
    oauth_scopes text[],
    chunk_size_days integer NOT NULL,
    demographics_chunk_size_days integer,
    rate_limit_delay_ms integer DEFAULT 1000 NOT NULL,
    max_retry_attempts integer DEFAULT 3 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE platform_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_configs IS '플랫폼별 설정 중앙화 테이블 (API 버전, OAuth, 청크 크기)';


--
-- Name: COLUMN platform_configs.oauth_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_configs.oauth_enabled IS 'OAuth 활성화 여부 (기본값 false)';


--
-- Name: COLUMN platform_configs.chunk_size_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_configs.chunk_size_days IS '일반 데이터 호출 단위 (Meta/Google: 90일, Naver: 30일)';


--
-- Name: COLUMN platform_configs.demographics_chunk_size_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.platform_configs.demographics_chunk_size_days IS 'Meta Demographics 전용 청크 크기 (60일, 13개월 제한 회피)';


--
-- Name: scheduler_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduler_config (
    id integer NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE scheduler_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduler_config IS '스케줄러 설정 (URL만 저장, Key는 Edge Function 환경변수)';


--
-- Name: scheduler_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduler_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scheduler_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduler_config_id_seq OWNED BY public.scheduler_config.id;


--
-- Name: token_refresh_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_refresh_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_id uuid NOT NULL,
    platform text NOT NULL,
    event_type text NOT NULL,
    error_code text,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE token_refresh_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.token_refresh_logs IS 'OAuth 토큰 refresh 이벤트 추적용 로그 테이블';


--
-- Name: user_advertisers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_advertisers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    advertiser_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_deletion_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_deletion_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_user_id uuid NOT NULL,
    deleted_user_email text NOT NULL,
    deleted_user_name text,
    deleted_by_user_id uuid,
    advertiser_id uuid,
    organization_id uuid,
    new_advertiser_admin_id uuid,
    deletion_reason text,
    data_snapshot jsonb,
    deleted_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_deletion_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_deletion_log IS '회원 탈퇴 기록 테이블 - 감사 및 복구를 위한 로그';


--
-- Name: COLUMN user_deletion_log.new_advertiser_admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_deletion_log.new_advertiser_admin_id IS '브랜드 소유권이 이전된 경우 새 관리자 ID';


--
-- Name: COLUMN user_deletion_log.data_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_deletion_log.data_snapshot IS '삭제된 사용자의 전체 데이터 스냅샷 (JSONB)';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    organization_id uuid,
    advertiser_id uuid,
    organization_type text,
    name text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'active'::character varying,
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: COLUMN users.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.status IS 'User access status: active (can login), inactive (cannot login)';


--
-- Name: users_backup_20260127; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_backup_20260127 (
    id uuid,
    email text,
    role text,
    organization_id uuid,
    advertiser_id uuid,
    organization_type text,
    name text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    status character varying(20)
);


--
-- Name: vault_migration_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vault_migration_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    api_token_id uuid NOT NULL,
    platform text NOT NULL,
    migration_status text NOT NULL,
    error_message text,
    migrated_fields text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: za_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.za_events (
    id bigint NOT NULL,
    tracking_id text NOT NULL,
    advertiser_id uuid NOT NULL,
    event_type text NOT NULL,
    event_name text,
    value numeric(20,2),
    currency text DEFAULT 'KRW'::text,
    order_id text,
    clicked_at timestamp with time zone,
    days_since_click integer,
    attribution_window integer,
    is_attributed boolean DEFAULT true,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    page_url text,
    page_referrer text,
    device_type text,
    browser text,
    os text,
    ip_address inet,
    country text,
    city text,
    session_id text,
    custom_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE za_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.za_events IS 'Zest Analytics 이벤트 저장 (무제한 보관)';


--
-- Name: COLUMN za_events.clicked_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.za_events.clicked_at IS '광고 클릭 시점 (어트리뷰션 계산용)';


--
-- Name: COLUMN za_events.days_since_click; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.za_events.days_since_click IS '클릭 후 경과 일수';


--
-- Name: COLUMN za_events.attribution_window; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.za_events.attribution_window IS '어트리뷰션 윈도우 (1, 7, 28일)';


--
-- Name: COLUMN za_events.is_attributed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.za_events.is_attributed IS '28일 이내 전환 여부';


--
-- Name: za_attribution_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.za_attribution_stats AS
 SELECT advertiser_id,
    date(created_at) AS date,
    attribution_window,
    event_type,
    count(*) AS conversion_count,
    sum(value) AS total_value,
    avg(days_since_click) AS avg_days_since_click
   FROM public.za_events
  WHERE ((is_attributed = true) AND (event_type = ANY (ARRAY['purchase'::text, 'signup'::text, 'lead'::text, 'add_to_cart'::text])))
  GROUP BY advertiser_id, (date(created_at)), attribution_window, event_type;


--
-- Name: VIEW za_attribution_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.za_attribution_stats IS '어트리뷰션 윈도우별 전환 통계 (읽기 전용 뷰)';


--
-- Name: za_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.za_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: za_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.za_events_id_seq OWNED BY public.za_events.id;


--
-- Name: za_tracking_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.za_tracking_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tracking_id text NOT NULL,
    advertiser_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    total_events bigint DEFAULT 0,
    last_event_at timestamp with time zone,
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT za_tracking_codes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: TABLE za_tracking_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.za_tracking_codes IS 'Zest Analytics 추적 코드 관리';


--
-- Name: COLUMN za_tracking_codes.tracking_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.za_tracking_codes.tracking_id IS 'ZA-XXXXXXXX 형식의 고유 추적 ID';


--
-- Name: COLUMN za_tracking_codes.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.za_tracking_codes.status IS 'active: 활성, inactive: 비활성';


--
-- Name: access_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs ALTER COLUMN id SET DEFAULT nextval('public.access_logs_id_seq'::regclass);


--
-- Name: scheduler_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_config ALTER COLUMN id SET DEFAULT nextval('public.scheduler_config_id_seq'::regclass);


--
-- Name: za_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.za_events ALTER COLUMN id SET DEFAULT nextval('public.za_events_id_seq'::regclass);


--
-- Name: access_logs access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_logs
    ADD CONSTRAINT access_logs_pkey PRIMARY KEY (id);


--
-- Name: ad_accounts ad_accounts_integration_id_external_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_accounts
    ADD CONSTRAINT ad_accounts_integration_id_external_account_id_key UNIQUE (integration_id, external_account_id);


--
-- Name: ad_accounts ad_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_accounts
    ADD CONSTRAINT ad_accounts_pkey PRIMARY KEY (id);


--
-- Name: ad_creatives ad_creatives_advertiser_ad_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_creatives
    ADD CONSTRAINT ad_creatives_advertiser_ad_unique UNIQUE (advertiser_id, ad_id);


--
-- Name: ad_creatives ad_creatives_advertiser_id_ad_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_creatives
    ADD CONSTRAINT ad_creatives_advertiser_id_ad_id_key UNIQUE (advertiser_id, ad_id);


--
-- Name: ad_creatives ad_creatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_creatives
    ADD CONSTRAINT ad_creatives_pkey PRIMARY KEY (id);


--
-- Name: ad_performance ad_performance_advertiser_id_source_ad_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_performance
    ADD CONSTRAINT ad_performance_advertiser_id_source_ad_id_date_key UNIQUE (advertiser_id, source, ad_id, date);


--
-- Name: ad_performance_demographics ad_performance_demographics_advertiser_id_source_date_gende_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_performance_demographics
    ADD CONSTRAINT ad_performance_demographics_advertiser_id_source_date_gende_key UNIQUE (advertiser_id, source, date, gender, age);


--
-- Name: ad_performance_demographics ad_performance_demographics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_performance_demographics
    ADD CONSTRAINT ad_performance_demographics_pkey PRIMARY KEY (id);


--
-- Name: ad_performance ad_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_performance
    ADD CONSTRAINT ad_performance_pkey PRIMARY KEY (id);


--
-- Name: advertisers advertisers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advertisers
    ADD CONSTRAINT advertisers_pkey PRIMARY KEY (id);


--
-- Name: agency_deletion_codes agency_deletion_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_deletion_codes
    ADD CONSTRAINT agency_deletion_codes_code_key UNIQUE (code);


--
-- Name: agency_deletion_codes agency_deletion_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_deletion_codes
    ADD CONSTRAINT agency_deletion_codes_pkey PRIMARY KEY (id);


--
-- Name: api_tokens api_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_pkey PRIMARY KEY (id);


--
-- Name: board_posts board_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_posts
    ADD CONSTRAINT board_posts_pkey PRIMARY KEY (id);


--
-- Name: board_read_status board_read_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_read_status
    ADD CONSTRAINT board_read_status_pkey PRIMARY KEY (id);


--
-- Name: board_read_status board_read_status_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_read_status
    ADD CONSTRAINT board_read_status_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: changelog changelog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_pkey PRIMARY KEY (id);


--
-- Name: collection_jobs collection_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_jobs
    ADD CONSTRAINT collection_jobs_pkey PRIMARY KEY (id);


--
-- Name: collection_queue collection_queue_job_id_chunk_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_queue
    ADD CONSTRAINT collection_queue_job_id_chunk_index_key UNIQUE (job_id, chunk_index);


--
-- Name: collection_queue collection_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_queue
    ADD CONSTRAINT collection_queue_pkey PRIMARY KEY (id);


--
-- Name: creatives creatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creatives
    ADD CONSTRAINT creatives_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: invitation_codes invitation_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_code_key UNIQUE (code);


--
-- Name: invitation_codes invitation_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorization_sessions oauth_authorization_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_authorization_sessions
    ADD CONSTRAINT oauth_authorization_sessions_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorization_sessions oauth_authorization_sessions_state_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_authorization_sessions
    ADD CONSTRAINT oauth_authorization_sessions_state_token_key UNIQUE (state_token);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: platform_configs platform_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_configs
    ADD CONSTRAINT platform_configs_pkey PRIMARY KEY (id);


--
-- Name: platform_configs platform_configs_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_configs
    ADD CONSTRAINT platform_configs_platform_key UNIQUE (platform);


--
-- Name: scheduler_config scheduler_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_config
    ADD CONSTRAINT scheduler_config_key_key UNIQUE (key);


--
-- Name: scheduler_config scheduler_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_config
    ADD CONSTRAINT scheduler_config_pkey PRIMARY KEY (id);


--
-- Name: token_refresh_logs token_refresh_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_refresh_logs
    ADD CONSTRAINT token_refresh_logs_pkey PRIMARY KEY (id);


--
-- Name: user_advertisers user_advertisers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_advertisers
    ADD CONSTRAINT user_advertisers_pkey PRIMARY KEY (id);


--
-- Name: user_advertisers user_advertisers_user_id_advertiser_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_advertisers
    ADD CONSTRAINT user_advertisers_user_id_advertiser_id_key UNIQUE (user_id, advertiser_id);


--
-- Name: user_deletion_log user_deletion_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_deletion_log
    ADD CONSTRAINT user_deletion_log_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vault_migration_log vault_migration_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vault_migration_log
    ADD CONSTRAINT vault_migration_log_pkey PRIMARY KEY (id);


--
-- Name: za_events za_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.za_events
    ADD CONSTRAINT za_events_pkey PRIMARY KEY (id);


--
-- Name: za_tracking_codes za_tracking_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.za_tracking_codes
    ADD CONSTRAINT za_tracking_codes_pkey PRIMARY KEY (id);


--
-- Name: za_tracking_codes za_tracking_codes_tracking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.za_tracking_codes
    ADD CONSTRAINT za_tracking_codes_tracking_id_key UNIQUE (tracking_id);


--
-- Name: idx_access_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_action ON public.access_logs USING btree (action, created_at DESC);


--
-- Name: idx_access_logs_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_advertiser ON public.access_logs USING btree (advertiser_id, created_at DESC);


--
-- Name: idx_access_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_created_at ON public.access_logs USING btree (created_at DESC);


--
-- Name: idx_access_logs_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_organization ON public.access_logs USING btree (organization_id, created_at DESC);


--
-- Name: idx_access_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_user ON public.access_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_ad_accounts_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_accounts_external_id ON public.ad_accounts USING btree (external_account_id);


--
-- Name: idx_ad_accounts_integration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_accounts_integration ON public.ad_accounts USING btree (integration_id);


--
-- Name: idx_ad_creatives_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_creatives_advertiser ON public.ad_creatives USING btree (advertiser_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_ad_creatives_destination_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_creatives_destination_url ON public.ad_creatives USING btree (destination_url) WHERE (destination_url IS NOT NULL);


--
-- Name: idx_ad_performance_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_performance_lookup ON public.ad_performance USING btree (advertiser_id, date DESC, source) WHERE (deleted_at IS NULL);


--
-- Name: idx_ad_performance_metrics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_performance_metrics ON public.ad_performance USING gin (additional_metrics);


--
-- Name: idx_advertisers_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advertisers_group_id ON public.advertisers USING btree (advertiser_group_id);


--
-- Name: idx_agency_deletion_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_deletion_codes_code ON public.agency_deletion_codes USING btree (code) WHERE (used_at IS NULL);


--
-- Name: idx_agency_deletion_codes_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_deletion_codes_expires ON public.agency_deletion_codes USING btree (expires_at) WHERE (used_at IS NULL);


--
-- Name: idx_agency_deletion_codes_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agency_deletion_codes_org ON public.agency_deletion_codes USING btree (organization_id);


--
-- Name: idx_api_tokens_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_tokens_advertiser ON public.api_tokens USING btree (advertiser_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_board_posts_advertiser_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_posts_advertiser_id ON public.board_posts USING btree (advertiser_id);


--
-- Name: idx_board_posts_board_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_posts_board_type ON public.board_posts USING btree (board_type);


--
-- Name: idx_board_posts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_posts_created_at ON public.board_posts USING btree (created_at DESC);


--
-- Name: idx_board_posts_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_posts_created_by ON public.board_posts USING btree (created_by);


--
-- Name: idx_board_posts_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_posts_deleted_at ON public.board_posts USING btree (deleted_at);


--
-- Name: idx_board_posts_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_posts_group_id ON public.board_posts USING btree (advertiser_group_id);


--
-- Name: idx_board_read_status_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_read_status_post_id ON public.board_read_status USING btree (post_id);


--
-- Name: idx_board_read_status_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_board_read_status_user_id ON public.board_read_status USING btree (user_id);


--
-- Name: idx_changelog_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_changelog_advertiser ON public.changelog USING btree (advertiser_id, created_at DESC);


--
-- Name: idx_changelog_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_changelog_changed_by ON public.changelog USING btree (changed_by_id, created_at DESC);


--
-- Name: idx_changelog_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_changelog_created_at ON public.changelog USING btree (created_at DESC);


--
-- Name: idx_changelog_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_changelog_organization ON public.changelog USING btree (organization_id, created_at DESC);


--
-- Name: idx_changelog_target_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_changelog_target_type ON public.changelog USING btree (target_type, created_at DESC);


--
-- Name: idx_collection_jobs_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_jobs_advertiser ON public.collection_jobs USING btree (advertiser_id, created_at DESC);


--
-- Name: idx_collection_jobs_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_jobs_platform ON public.collection_jobs USING btree (platform, created_at DESC);


--
-- Name: idx_collection_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_jobs_status ON public.collection_jobs USING btree (status, created_at DESC);


--
-- Name: idx_collection_queue_depends_on_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_queue_depends_on_job ON public.collection_queue USING btree (depends_on_job_id) WHERE (depends_on_job_id IS NOT NULL);


--
-- Name: idx_collection_queue_depends_on_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_queue_depends_on_job_id ON public.collection_queue USING btree (depends_on_job_id);


--
-- Name: idx_collection_queue_integration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_queue_integration ON public.collection_queue USING btree (integration_id);


--
-- Name: idx_collection_queue_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_queue_job_id ON public.collection_queue USING btree (job_id, status);


--
-- Name: idx_collection_queue_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_queue_status_created ON public.collection_queue USING btree (status, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));


--
-- Name: idx_creatives_advertiser_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creatives_advertiser_id ON public.creatives USING btree (advertiser_id);


--
-- Name: idx_creatives_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creatives_created_at ON public.creatives USING btree (created_at DESC);


--
-- Name: idx_creatives_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creatives_platform ON public.creatives USING btree (platform);


--
-- Name: idx_creatives_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creatives_status ON public.creatives USING btree (status);


--
-- Name: idx_demographics_gender_age; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demographics_gender_age ON public.ad_performance_demographics USING btree (gender, age) WHERE ((gender IS NOT NULL) AND (age IS NOT NULL));


--
-- Name: idx_demographics_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demographics_lookup ON public.ad_performance_demographics USING btree (advertiser_id, date DESC, source);


--
-- Name: idx_integrations_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_advertiser ON public.integrations USING btree (advertiser_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_integrations_created_by_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_created_by_user ON public.integrations USING btree (created_by_user_id) WHERE (created_by_user_id IS NOT NULL);


--
-- Name: idx_integrations_google_account_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_google_account_email ON public.integrations USING btree (google_account_email) WHERE (google_account_email IS NOT NULL);


--
-- Name: idx_integrations_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_platform ON public.integrations USING btree (platform) WHERE (deleted_at IS NULL);


--
-- Name: idx_integrations_platform_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_platform_config ON public.integrations USING btree (platform_config_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_integrations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_status ON public.integrations USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_integrations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integrations_type ON public.integrations USING btree (integration_type) WHERE (deleted_at IS NULL);


--
-- Name: idx_invitation_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitation_codes_code ON public.invitation_codes USING btree (code);


--
-- Name: idx_invitation_codes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitation_codes_email ON public.invitation_codes USING btree (invited_email);


--
-- Name: idx_invitation_codes_parent_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitation_codes_parent_advertiser ON public.invitation_codes USING btree (parent_advertiser_id);


--
-- Name: idx_oauth_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_sessions_expires_at ON public.oauth_authorization_sessions USING btree (expires_at) WHERE (status = 'pending'::text);


--
-- Name: idx_oauth_sessions_state_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_sessions_state_origin ON public.oauth_authorization_sessions USING btree (state_token, app_origin);


--
-- Name: idx_oauth_sessions_state_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_sessions_state_token ON public.oauth_authorization_sessions USING btree (state_token) WHERE (status = 'pending'::text);


--
-- Name: idx_platform_configs_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_configs_platform ON public.platform_configs USING btree (platform);


--
-- Name: idx_token_refresh_logs_integration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_refresh_logs_integration ON public.token_refresh_logs USING btree (integration_id, created_at DESC);


--
-- Name: idx_user_advertisers_advertiser_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_advertisers_advertiser_id ON public.user_advertisers USING btree (advertiser_id);


--
-- Name: idx_user_advertisers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_advertisers_user_id ON public.user_advertisers USING btree (user_id);


--
-- Name: idx_user_deletion_log_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deletion_log_deleted_at ON public.user_deletion_log USING btree (deleted_at DESC);


--
-- Name: idx_user_deletion_log_deleted_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_deletion_log_deleted_user ON public.user_deletion_log USING btree (deleted_user_id);


--
-- Name: idx_users_email_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_status ON public.users USING btree (email, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_vault_migration_log_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vault_migration_log_token ON public.vault_migration_log USING btree (api_token_id);


--
-- Name: idx_za_events_advertiser_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_events_advertiser_created ON public.za_events USING btree (advertiser_id, created_at DESC);


--
-- Name: idx_za_events_attribution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_events_attribution ON public.za_events USING btree (advertiser_id, is_attributed, attribution_window, created_at DESC) WHERE (is_attributed = true);


--
-- Name: idx_za_events_campaign_analysis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_events_campaign_analysis ON public.za_events USING btree (advertiser_id, utm_source, utm_campaign, created_at DESC) WHERE (utm_source IS NOT NULL);


--
-- Name: idx_za_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_events_event_type ON public.za_events USING btree (event_type, created_at DESC);


--
-- Name: idx_za_events_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_events_order_id ON public.za_events USING btree (order_id) WHERE (order_id IS NOT NULL);


--
-- Name: idx_za_events_tracking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_events_tracking_id ON public.za_events USING btree (tracking_id, created_at DESC);


--
-- Name: idx_za_events_utm_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_events_utm_campaign ON public.za_events USING btree (utm_campaign, created_at DESC) WHERE (utm_campaign IS NOT NULL);


--
-- Name: idx_za_events_utm_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_events_utm_source ON public.za_events USING btree (utm_source, created_at DESC) WHERE (utm_source IS NOT NULL);


--
-- Name: idx_za_tracking_codes_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_tracking_codes_advertiser ON public.za_tracking_codes USING btree (advertiser_id);


--
-- Name: idx_za_tracking_codes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_tracking_codes_status ON public.za_tracking_codes USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_za_tracking_codes_tracking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_za_tracking_codes_tracking_id ON public.za_tracking_codes USING btree (tracking_id) WHERE (deleted_at IS NULL);


--
-- Name: integrations trigger_set_platform_config_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_platform_config_id BEFORE INSERT ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.set_platform_config_id();


--
-- Name: za_events trigger_update_za_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_za_stats AFTER INSERT ON public.za_events FOR EACH ROW EXECUTE FUNCTION public.update_za_tracking_code_stats();


--
-- Name: za_tracking_codes trigger_za_tracking_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_za_tracking_codes_updated_at BEFORE UPDATE ON public.za_tracking_codes FOR EACH ROW EXECUTE FUNCTION public.update_za_updated_at();


--
-- Name: ad_accounts update_ad_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON public.ad_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_performance_demographics update_ad_performance_demographics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ad_performance_demographics_updated_at BEFORE UPDATE ON public.ad_performance_demographics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: board_posts update_board_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_board_posts_updated_at BEFORE UPDATE ON public.board_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: collection_jobs update_collection_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_collection_jobs_updated_at BEFORE UPDATE ON public.collection_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: collection_queue update_collection_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_collection_queue_updated_at BEFORE UPDATE ON public.collection_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: integrations update_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_configs update_platform_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_configs_updated_at BEFORE UPDATE ON public.platform_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_advertisers user_advertisers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_advertisers_updated_at BEFORE UPDATE ON public.user_advertisers FOR EACH ROW EXECUTE FUNCTION public.update_user_advertisers_updated_at();


--
-- Name: ad_accounts ad_accounts_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_accounts
    ADD CONSTRAINT ad_accounts_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;


--
-- Name: ad_creatives ad_creatives_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_creatives
    ADD CONSTRAINT ad_creatives_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: ad_performance ad_performance_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_performance
    ADD CONSTRAINT ad_performance_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: ad_performance_demographics ad_performance_demographics_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_performance_demographics
    ADD CONSTRAINT ad_performance_demographics_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: advertisers advertisers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advertisers
    ADD CONSTRAINT advertisers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: agency_deletion_codes agency_deletion_codes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_deletion_codes
    ADD CONSTRAINT agency_deletion_codes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: agency_deletion_codes agency_deletion_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agency_deletion_codes
    ADD CONSTRAINT agency_deletion_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: api_tokens api_tokens_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE SET NULL;


--
-- Name: board_posts board_posts_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_posts
    ADD CONSTRAINT board_posts_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: board_posts board_posts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_posts
    ADD CONSTRAINT board_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: board_read_status board_read_status_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_read_status
    ADD CONSTRAINT board_read_status_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.board_posts(id) ON DELETE CASCADE;


--
-- Name: board_read_status board_read_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_read_status
    ADD CONSTRAINT board_read_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: changelog changelog_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: collection_jobs collection_jobs_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_jobs
    ADD CONSTRAINT collection_jobs_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: collection_queue collection_queue_depends_on_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_queue
    ADD CONSTRAINT collection_queue_depends_on_job_id_fkey FOREIGN KEY (depends_on_job_id) REFERENCES public.collection_jobs(id) ON DELETE CASCADE;


--
-- Name: collection_queue collection_queue_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_queue
    ADD CONSTRAINT collection_queue_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;


--
-- Name: collection_queue collection_queue_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_queue
    ADD CONSTRAINT collection_queue_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.collection_jobs(id) ON DELETE CASCADE;


--
-- Name: creatives creatives_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creatives
    ADD CONSTRAINT creatives_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: integrations integrations_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: integrations integrations_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: integrations integrations_platform_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_platform_config_id_fkey FOREIGN KEY (platform_config_id) REFERENCES public.platform_configs(id);


--
-- Name: invitation_codes invitation_codes_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: invitation_codes invitation_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: invitation_codes invitation_codes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invitation_codes invitation_codes_parent_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_parent_advertiser_id_fkey FOREIGN KEY (parent_advertiser_id) REFERENCES public.advertisers(id);


--
-- Name: invitation_codes invitation_codes_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: oauth_authorization_sessions oauth_authorization_sessions_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_authorization_sessions
    ADD CONSTRAINT oauth_authorization_sessions_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: token_refresh_logs token_refresh_logs_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_refresh_logs
    ADD CONSTRAINT token_refresh_logs_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;


--
-- Name: user_advertisers user_advertisers_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_advertisers
    ADD CONSTRAINT user_advertisers_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: user_advertisers user_advertisers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_advertisers
    ADD CONSTRAINT user_advertisers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE SET NULL;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: vault_migration_log vault_migration_log_api_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vault_migration_log
    ADD CONSTRAINT vault_migration_log_api_token_id_fkey FOREIGN KEY (api_token_id) REFERENCES public.api_tokens(id) ON DELETE CASCADE;


--
-- Name: za_events za_events_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.za_events
    ADD CONSTRAINT za_events_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: za_tracking_codes za_tracking_codes_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.za_tracking_codes
    ADD CONSTRAINT za_tracking_codes_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id) ON DELETE CASCADE;


--
-- Name: za_tracking_codes za_tracking_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.za_tracking_codes
    ADD CONSTRAINT za_tracking_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: za_tracking_codes Advertiser can manage own tracking codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Advertiser can manage own tracking codes" ON public.za_tracking_codes TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.users
     JOIN public.user_advertisers ON ((user_advertisers.user_id = users.id)))
  WHERE ((users.id = auth.uid()) AND (user_advertisers.advertiser_id = za_tracking_codes.advertiser_id) AND (users.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.users
     JOIN public.user_advertisers ON ((user_advertisers.user_id = users.id)))
  WHERE ((users.id = auth.uid()) AND (user_advertisers.advertiser_id = za_tracking_codes.advertiser_id) AND (users.deleted_at IS NULL)))));


--
-- Name: access_logs Advertiser can view brand access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Advertiser can view brand access logs" ON public.access_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.users
     JOIN public.user_advertisers ON ((user_advertisers.user_id = users.id)))
  WHERE ((users.id = auth.uid()) AND (users.role = 'advertiser_admin'::text) AND (user_advertisers.advertiser_id = access_logs.advertiser_id) AND (users.deleted_at IS NULL)))));


--
-- Name: changelog Advertiser can view brand changelogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Advertiser can view brand changelogs" ON public.changelog FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.users
     JOIN public.user_advertisers ON ((user_advertisers.user_id = users.id)))
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['advertiser_admin'::text, 'advertiser_staff'::text])) AND (user_advertisers.advertiser_id = changelog.advertiser_id) AND (users.deleted_at IS NULL)))));


--
-- Name: za_events Advertiser can view own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Advertiser can view own events" ON public.za_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.users
     JOIN public.user_advertisers ON ((user_advertisers.user_id = users.id)))
  WHERE ((users.id = auth.uid()) AND (user_advertisers.advertiser_id = za_events.advertiser_id) AND (users.deleted_at IS NULL)))));


--
-- Name: za_tracking_codes Agency can manage organization tracking codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agency can manage organization tracking codes" ON public.za_tracking_codes TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.users
     JOIN public.advertisers ON ((advertisers.organization_id = users.organization_id)))
  WHERE ((users.id = auth.uid()) AND (users.role = 'agency_admin'::text) AND (advertisers.id = za_tracking_codes.advertiser_id) AND (users.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.users
     JOIN public.advertisers ON ((advertisers.organization_id = users.organization_id)))
  WHERE ((users.id = auth.uid()) AND (users.role = 'agency_admin'::text) AND (advertisers.id = za_tracking_codes.advertiser_id) AND (users.deleted_at IS NULL)))));


--
-- Name: access_logs Agency can view organization access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agency can view organization access logs" ON public.access_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['agency_admin'::text, 'agency_manager'::text])) AND (users.organization_id = access_logs.organization_id) AND (users.deleted_at IS NULL)))));


--
-- Name: changelog Agency can view organization changelogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agency can view organization changelogs" ON public.changelog FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['agency_admin'::text, 'agency_manager'::text, 'agency_staff'::text])) AND (users.organization_id = changelog.organization_id) AND (users.deleted_at IS NULL)))));


--
-- Name: za_events Agency can view organization events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agency can view organization events" ON public.za_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.users
     JOIN public.advertisers ON ((advertisers.organization_id = users.organization_id)))
  WHERE ((users.id = auth.uid()) AND (users.role = 'agency_admin'::text) AND (advertisers.id = za_events.advertiser_id) AND (users.deleted_at IS NULL)))));


--
-- Name: za_events Allow public event insertion; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public event insertion" ON public.za_events FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: POLICY "Allow public event insertion" ON za_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Allow public event insertion" ON public.za_events IS '익명 사용자도 이벤트 삽입 가능 (Edge Function에서 검증)';


--
-- Name: za_tracking_codes Master can manage all tracking codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can manage all tracking codes" ON public.za_tracking_codes TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'master'::text) AND (users.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'master'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: access_logs Master can view all access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all access logs" ON public.access_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'master'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: changelog Master can view all changelogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all changelogs" ON public.changelog FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'master'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: za_events Master can view all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master can view all events" ON public.za_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'master'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: access_logs Only system can insert access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only system can insert access logs" ON public.access_logs FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: organizations Service role can read encrypted GCP credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read encrypted GCP credentials" ON public.organizations FOR SELECT TO service_role USING (true);


--
-- Name: organizations Service role can update encrypted GCP credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update encrypted GCP credentials" ON public.organizations FOR UPDATE TO service_role USING (true);


--
-- Name: agency_deletion_codes Users can create own deletion codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own deletion codes" ON public.agency_deletion_codes FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: board_read_status Users can insert their read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their read status" ON public.board_read_status FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: agency_deletion_codes Users can view own deletion codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own deletion codes" ON public.agency_deletion_codes FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: board_read_status Users can view their read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their read status" ON public.board_read_status FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: access_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_performance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_performance ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_performance_demographics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_performance_demographics ENABLE ROW LEVEL SECURITY;

--
-- Name: advertisers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;

--
-- Name: agency_deletion_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agency_deletion_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: invitation_codes anon_select_valid_invitation_codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_select_valid_invitation_codes ON public.invitation_codes FOR SELECT TO anon USING (((used_by IS NULL) AND (expires_at > now())));


--
-- Name: api_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_configs authenticated_select_platform_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_select_platform_configs ON public.platform_configs FOR SELECT TO authenticated USING (true);


--
-- Name: ad_performance authenticated_users_delete_ad_performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_ad_performance ON public.ad_performance FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: advertisers authenticated_users_delete_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_advertisers ON public.advertisers FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: api_tokens authenticated_users_delete_api_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_api_tokens ON public.api_tokens FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: board_posts authenticated_users_delete_board_posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_board_posts ON public.board_posts FOR DELETE TO authenticated USING (true);


--
-- Name: creatives authenticated_users_delete_creatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_creatives ON public.creatives FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: invitation_codes authenticated_users_delete_invitation_codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_invitation_codes ON public.invitation_codes FOR DELETE TO authenticated USING (true);


--
-- Name: organizations authenticated_users_delete_organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_organizations ON public.organizations FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: user_advertisers authenticated_users_delete_user_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_user_advertisers ON public.user_advertisers FOR DELETE TO authenticated USING (true);


--
-- Name: users authenticated_users_delete_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_delete_users ON public.users FOR DELETE TO authenticated USING (true);


--
-- Name: ad_performance authenticated_users_insert_ad_performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_ad_performance ON public.ad_performance FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: advertisers authenticated_users_insert_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_advertisers ON public.advertisers FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: api_tokens authenticated_users_insert_api_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_api_tokens ON public.api_tokens FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: board_posts authenticated_users_insert_board_posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_board_posts ON public.board_posts FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: creatives authenticated_users_insert_creatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_creatives ON public.creatives FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: invitation_codes authenticated_users_insert_invitation_codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_invitation_codes ON public.invitation_codes FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: organizations authenticated_users_insert_organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_organizations ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: user_advertisers authenticated_users_insert_user_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_user_advertisers ON public.user_advertisers FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: users authenticated_users_insert_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_insert_users ON public.users FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: ad_performance authenticated_users_select_ad_performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_ad_performance ON public.ad_performance FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: advertisers authenticated_users_select_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_advertisers ON public.advertisers FOR SELECT TO authenticated USING (true);


--
-- Name: api_tokens authenticated_users_select_api_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_api_tokens ON public.api_tokens FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: board_posts authenticated_users_select_board_posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_board_posts ON public.board_posts FOR SELECT TO authenticated USING (true);


--
-- Name: creatives authenticated_users_select_creatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_creatives ON public.creatives FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: invitation_codes authenticated_users_select_invitation_codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_invitation_codes ON public.invitation_codes FOR SELECT TO authenticated USING (true);


--
-- Name: organizations authenticated_users_select_organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_organizations ON public.organizations FOR SELECT TO authenticated USING (true);


--
-- Name: user_advertisers authenticated_users_select_user_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_user_advertisers ON public.user_advertisers FOR SELECT TO authenticated USING (true);


--
-- Name: users authenticated_users_select_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_select_users ON public.users FOR SELECT TO authenticated USING (true);


--
-- Name: ad_performance authenticated_users_update_ad_performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_ad_performance ON public.ad_performance FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: advertisers authenticated_users_update_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_advertisers ON public.advertisers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: api_tokens authenticated_users_update_api_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_api_tokens ON public.api_tokens FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: board_posts authenticated_users_update_board_posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_board_posts ON public.board_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: creatives authenticated_users_update_creatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_creatives ON public.creatives FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: invitation_codes authenticated_users_update_invitation_codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_invitation_codes ON public.invitation_codes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: organizations authenticated_users_update_organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_organizations ON public.organizations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.status)::text = 'active'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: user_advertisers authenticated_users_update_user_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_user_advertisers ON public.user_advertisers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: users authenticated_users_update_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_users_update_users ON public.users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: board_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: board_read_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_read_status ENABLE ROW LEVEL SECURITY;

--
-- Name: changelog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

--
-- Name: collection_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collection_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: collection_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collection_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: creatives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

--
-- Name: integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: invitation_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_configs master_update_platform_configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY master_update_platform_configs ON public.platform_configs FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'master'::text) AND (users.deleted_at IS NULL)))));


--
-- Name: oauth_authorization_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_authorization_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_accounts service_role_all_ad_accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_ad_accounts ON public.ad_accounts TO service_role USING (true) WITH CHECK (true);


--
-- Name: ad_creatives service_role_all_ad_creatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_ad_creatives ON public.ad_creatives TO service_role USING (true) WITH CHECK (true);


--
-- Name: ad_performance service_role_all_ad_performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_ad_performance ON public.ad_performance TO service_role USING (true) WITH CHECK (true);


--
-- Name: api_tokens service_role_all_api_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_api_tokens ON public.api_tokens TO service_role USING (true) WITH CHECK (true);


--
-- Name: collection_jobs service_role_all_collection_jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_collection_jobs ON public.collection_jobs TO service_role USING (true) WITH CHECK (true);


--
-- Name: collection_queue service_role_all_collection_queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_collection_queue ON public.collection_queue TO service_role USING (true) WITH CHECK (true);


--
-- Name: ad_performance_demographics service_role_all_demographics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_demographics ON public.ad_performance_demographics TO service_role USING (true) WITH CHECK (true);


--
-- Name: integrations service_role_all_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_integrations ON public.integrations TO service_role USING (true) WITH CHECK (true);


--
-- Name: oauth_authorization_sessions service_role_all_oauth_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_oauth_sessions ON public.oauth_authorization_sessions TO service_role USING (true) WITH CHECK (true);


--
-- Name: vault_migration_log service_role_all_vault_migration_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_vault_migration_log ON public.vault_migration_log TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_advertisers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_advertisers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: integrations users_delete_own_brand_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_delete_own_brand_integrations ON public.integrations FOR DELETE TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid)));


--
-- Name: api_tokens users_delete_own_brand_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_delete_own_brand_tokens ON public.api_tokens FOR DELETE TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid)));


--
-- Name: integrations users_insert_own_brand_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own_brand_integrations ON public.integrations FOR INSERT TO authenticated WITH CHECK ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid)));


--
-- Name: api_tokens users_insert_own_brand_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own_brand_tokens ON public.api_tokens FOR INSERT TO authenticated WITH CHECK ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid)));


--
-- Name: ad_accounts users_select_own_brand_ad_accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_brand_ad_accounts ON public.ad_accounts FOR SELECT TO authenticated USING ((integration_id IN ( SELECT integrations.id
   FROM public.integrations
  WHERE ((integrations.advertiser_id IN ( SELECT public.get_user_advertiser_ids(auth.email()) AS get_user_advertiser_ids)) AND (integrations.deleted_at IS NULL)))));


--
-- Name: collection_jobs users_select_own_brand_collection_jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_brand_collection_jobs ON public.collection_jobs FOR SELECT TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids(auth.email()) AS get_user_advertiser_ids)));


--
-- Name: ad_creatives users_select_own_brand_creatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_brand_creatives ON public.ad_creatives FOR SELECT TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids(auth.email()) AS get_user_advertiser_ids)));


--
-- Name: ad_performance_demographics users_select_own_brand_demographics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_brand_demographics ON public.ad_performance_demographics FOR SELECT TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids(auth.email()) AS get_user_advertiser_ids)));


--
-- Name: integrations users_select_own_brand_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_brand_integrations ON public.integrations FOR SELECT TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid)));


--
-- Name: oauth_authorization_sessions users_select_own_brand_oauth_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_brand_oauth_sessions ON public.oauth_authorization_sessions FOR SELECT TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids(auth.email()) AS get_user_advertiser_ids)));


--
-- Name: ad_performance users_select_own_brand_performance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_brand_performance ON public.ad_performance FOR SELECT TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids(auth.email()) AS get_user_advertiser_ids)));


--
-- Name: api_tokens users_select_own_brand_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_brand_tokens ON public.api_tokens FOR SELECT TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid)));


--
-- Name: user_advertisers users_select_own_user_advertisers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_user_advertisers ON public.user_advertisers FOR SELECT TO authenticated USING (((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.email = auth.email()))) OR (advertiser_id IN ( SELECT public.get_user_advertiser_ids(auth.email()) AS get_user_advertiser_ids))));


--
-- Name: integrations users_update_own_brand_integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_brand_integrations ON public.integrations FOR UPDATE TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid))) WITH CHECK ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid)));


--
-- Name: api_tokens users_update_own_brand_tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_brand_tokens ON public.api_tokens FOR UPDATE TO authenticated USING ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid))) WITH CHECK ((advertiser_id IN ( SELECT public.get_user_advertiser_ids_by_uid(auth.uid()) AS get_user_advertiser_ids_by_uid)));


--
-- Name: vault_migration_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vault_migration_log ENABLE ROW LEVEL SECURITY;

--
-- Name: za_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.za_events ENABLE ROW LEVEL SECURITY;

--
-- Name: za_tracking_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.za_tracking_codes ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict i4obTkl97PWAZquBQUcU5vTKPmupLdU57JcRVlO7TMsKfrM8TflKCc62kjt2x86

