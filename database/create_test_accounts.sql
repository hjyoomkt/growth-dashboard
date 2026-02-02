-- ===================================
-- 테스트용 계정 생성 스크립트
-- Date: 2026-02-02
-- ===================================
--
-- 생성 항목:
-- 1. 테스트 에이전시 조직
-- 2. 에이전시 관리자 계정
-- 3. 클라이언트 브랜드
-- 4. 브랜드 대표운영자 계정
-- 5. 이메일 인증 완료 처리
--
-- ===================================

-- 변수 선언 (UUID는 직접 생성)
DO $$
DECLARE
  v_agency_org_id UUID := gen_random_uuid();
  v_agency_admin_id UUID := gen_random_uuid();
  v_brand_id UUID := gen_random_uuid();
  v_brand_admin_id UUID := gen_random_uuid();

  -- 테스트 계정 정보
  v_agency_name TEXT := '테스트 에이전시';
  v_agency_admin_email TEXT := 'agency.admin@test.com';
  v_agency_admin_password TEXT := 'qwas123'; -- 비밀번호는 해시화됨
  v_agency_admin_name TEXT := '에이전시 관리자';

  v_brand_name TEXT := '테스트 브랜드';
  v_brand_admin_email TEXT := 'brand.admin@test.com';
  v_brand_admin_password TEXT := 'qwas123'; -- 비밀번호는 해시화됨
  v_brand_admin_name TEXT := '브랜드 대표운영자';
BEGIN

  -- ===================================
  -- 1. 에이전시 조직 생성
  -- ===================================
  RAISE NOTICE '1. 에이전시 조직 생성 중...';

  INSERT INTO public.organizations (id, name, type, created_at, updated_at)
  VALUES (
    v_agency_org_id,
    v_agency_name,
    'agency',
    NOW(),
    NOW()
  );

  RAISE NOTICE '   ✓ 에이전시 조직 생성 완료: % (ID: %)', v_agency_name, v_agency_org_id;

  -- ===================================
  -- 2. 에이전시 관리자 계정 생성
  -- ===================================
  RAISE NOTICE '2. 에이전시 관리자 계정 생성 중...';

  -- 2-1. auth.users에 사용자 생성
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_agency_admin_id,
    '00000000-0000-0000-0000-000000000000',
    v_agency_admin_email,
    crypt(v_agency_admin_password, gen_salt('bf')), -- Blowfish 해시
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('name', v_agency_admin_name)::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  );

  RAISE NOTICE '   ✓ auth.users 레코드 생성 완료: %', v_agency_admin_email;

  -- 2-2. auth.identities에 identity 생성
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_agency_admin_id,
    v_agency_admin_id::text,
    v_agency_admin_id,
    json_build_object(
      'sub', v_agency_admin_id::text,
      'email', v_agency_admin_email,
      'email_verified', true,
      'name', v_agency_admin_name
    )::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE '   ✓ auth.identities 레코드 생성 완료';

  -- 2-3. public.users에 사용자 정보 생성
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    organization_id,
    organization_type,
    advertiser_id,
    created_at,
    updated_at
  ) VALUES (
    v_agency_admin_id,
    v_agency_admin_email,
    v_agency_admin_name,
    'agency_admin',
    v_agency_org_id,
    'agency',
    NULL,
    NOW(),
    NOW()
  );

  RAISE NOTICE '   ✓ public.users 레코드 생성 완료';
  RAISE NOTICE '   ✓ 에이전시 관리자 계정 생성 완료';
  RAISE NOTICE '     - 이메일: %', v_agency_admin_email;
  RAISE NOTICE '     - 비밀번호: %', v_agency_admin_password;
  RAISE NOTICE '     - 역할: agency_admin';

  -- ===================================
  -- 3. 클라이언트 브랜드 생성
  -- ===================================
  RAISE NOTICE '3. 클라이언트 브랜드 생성 중...';

  INSERT INTO public.advertisers (
    id,
    name,
    organization_id,
    created_at,
    updated_at
  ) VALUES (
    v_brand_id,
    v_brand_name,
    v_agency_org_id,
    NOW(),
    NOW()
  );

  RAISE NOTICE '   ✓ 브랜드 생성 완료: % (ID: %)', v_brand_name, v_brand_id;

  -- ===================================
  -- 4. 브랜드 대표운영자 계정 생성
  -- ===================================
  RAISE NOTICE '4. 브랜드 대표운영자 계정 생성 중...';

  -- 4-1. auth.users에 사용자 생성
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_brand_admin_id,
    '00000000-0000-0000-0000-000000000000',
    v_brand_admin_email,
    crypt(v_brand_admin_password, gen_salt('bf')), -- Blowfish 해시
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('name', v_brand_admin_name)::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  );

  RAISE NOTICE '   ✓ auth.users 레코드 생성 완료: %', v_brand_admin_email;

  -- 4-2. auth.identities에 identity 생성
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_brand_admin_id,
    v_brand_admin_id::text,
    v_brand_admin_id,
    json_build_object(
      'sub', v_brand_admin_id::text,
      'email', v_brand_admin_email,
      'email_verified', true,
      'name', v_brand_admin_name
    )::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE '   ✓ auth.identities 레코드 생성 완료';

  -- 4-3. public.users에 사용자 정보 생성
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    organization_id,
    organization_type,
    advertiser_id,
    created_at,
    updated_at
  ) VALUES (
    v_brand_admin_id,
    v_brand_admin_email,
    v_brand_admin_name,
    'advertiser_admin',
    v_agency_org_id,
    'agency',
    v_brand_id,
    NOW(),
    NOW()
  );

  RAISE NOTICE '   ✓ public.users 레코드 생성 완료';
  RAISE NOTICE '   ✓ 브랜드 대표운영자 계정 생성 완료';
  RAISE NOTICE '     - 이메일: %', v_brand_admin_email;
  RAISE NOTICE '     - 비밀번호: %', v_brand_admin_password;
  RAISE NOTICE '     - 역할: advertiser_admin';
  RAISE NOTICE '     - 소속 브랜드: %', v_brand_name;

  -- ===================================
  -- 완료 메시지
  -- ===================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ 테스트 계정 생성 완료!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. 에이전시 조직';
  RAISE NOTICE '   - 조직명: %', v_agency_name;
  RAISE NOTICE '   - 조직 ID: %', v_agency_org_id;
  RAISE NOTICE '';
  RAISE NOTICE '2. 에이전시 관리자 계정';
  RAISE NOTICE '   - 이메일: %', v_agency_admin_email;
  RAISE NOTICE '   - 비밀번호: %', v_agency_admin_password;
  RAISE NOTICE '   - 역할: agency_admin';
  RAISE NOTICE '   - User ID: %', v_agency_admin_id;
  RAISE NOTICE '';
  RAISE NOTICE '3. 클라이언트 브랜드';
  RAISE NOTICE '   - 브랜드명: %', v_brand_name;
  RAISE NOTICE '   - 브랜드 ID: %', v_brand_id;
  RAISE NOTICE '';
  RAISE NOTICE '4. 브랜드 대표운영자 계정';
  RAISE NOTICE '   - 이메일: %', v_brand_admin_email;
  RAISE NOTICE '   - 비밀번호: %', v_brand_admin_password;
  RAISE NOTICE '   - 역할: advertiser_admin';
  RAISE NOTICE '   - 소속 브랜드: %', v_brand_name;
  RAISE NOTICE '   - User ID: %', v_brand_admin_id;
  RAISE NOTICE '';
  RAISE NOTICE '✓ 모든 계정의 이메일 인증이 완료되었습니다.';
  RAISE NOTICE '  로그인하여 사용할 수 있습니다.';
  RAISE NOTICE '========================================';

END $$;

-- ===================================
-- 생성된 계정 확인
-- ===================================
SELECT
  '에이전시 조직' as 구분,
  o.id,
  o.name as 이름,
  o.type as 타입,
  o.created_at as 생성일
FROM public.organizations o
WHERE o.name = '테스트 에이전시'

UNION ALL

SELECT
  '사용자' as 구분,
  u.id,
  u.email as 이름,
  u.role as 타입,
  u.created_at as 생성일
FROM public.users u
WHERE u.email IN ('agency.admin@test.com', 'brand.admin@test.com')

UNION ALL

SELECT
  '브랜드' as 구분,
  a.id,
  a.name as 이름,
  'advertiser' as 타입,
  a.created_at as 생성일
FROM public.advertisers a
WHERE a.name = '테스트 브랜드'

ORDER BY 구분, 생성일;

-- ===================================
-- 인증 상태 확인
-- ===================================
SELECT
  email,
  email_confirmed_at,
  confirmed_at,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN '✓ 인증완료'
    ELSE '✗ 미인증'
  END as 인증상태,
  created_at
FROM auth.users
WHERE email IN ('agency.admin@test.com', 'brand.admin@test.com')
ORDER BY created_at;
