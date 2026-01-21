import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface OAuthInitiateRequest {
  advertiser_id: string;
  platform: 'Google Ads' | 'Meta Ads';
  // 조직 GCP 사용 여부 (true면 조직 GCP, false면 직접 입력)
  use_organization_gcp?: boolean;
  // 직접 입력 시 사용
  client_id?: string;
  client_secret?: string;
}

interface OAuthInitiateResponse {
  authorization_url: string;
  state_token: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PKCE Code Verifier 생성 (Google OAuth용)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// PKCE Code Challenge 생성
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Origin 추출 (로컬/프로덕션 자동 감지)
function extractOriginFromRequest(req: Request): string {
  const referer = req.headers.get('referer');
  const configuredUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const origin = `${refererUrl.protocol}//${refererUrl.host}`;
      console.log('[OAuth Initiate] Origin detected from Referer:', origin);
      return origin;
    } catch (e) {
      console.warn('[OAuth Initiate] Failed to parse referer, using configured URL:', e);
    }
  }

  console.log('[OAuth Initiate] No referer, using configured APP_URL:', configuredUrl);
  return configuredUrl;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[OAuth] Authorization header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('[OAuth] Supabase URL:', supabaseUrl);
    console.log('[OAuth] Anon Key exists:', !!supabaseAnonKey);

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    console.log('[OAuth] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      error: authError?.message
    });

    if (authError || !user) {
      console.error('[OAuth] Authentication failed:', authError);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: authError?.message || 'User not found',
          code: authError?.status
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: OAuthInitiateRequest = await req.json();
    const {
      advertiser_id,
      platform,
      use_organization_gcp = true,
      client_id: customClientId,
      client_secret: customClientSecret,
    } = body;

    if (!advertiser_id || !platform) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: advertiser_id, platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // platform_configs에서 OAuth 활성화 여부 확인
    const { data: platformConfig, error: configError } = await supabaseClient
      .from('platform_configs')
      .select('oauth_enabled, oauth_scopes')
      .eq('platform', platform)
      .single();

    if (configError || !platformConfig) {
      return new Response(
        JSON.stringify({ error: 'Platform configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!platformConfig.oauth_enabled) {
      return new Response(
        JSON.stringify({
          error: 'OAuth is not enabled for this platform',
          message: 'OAuth 준비 중입니다. 수동으로 토큰을 입력해주세요.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client (Vault 접근용)
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let clientId: string;
    let clientSecret: string;

    if (use_organization_gcp) {
      // 조직 GCP 사용: advertiser → organization 연결하여 GCP 정보 조회
      console.log('[OAuth] 광고주 조회 시작:', advertiser_id);
      const { data: advertiserData, error: advertiserError } = await supabaseServiceRole
        .from('advertisers')
        .select('organization_id')
        .eq('id', advertiser_id)
        .single();

      console.log('[OAuth] 광고주 조회 결과:', { advertiserData, advertiserError });

      if (advertiserError || !advertiserData?.organization_id) {
        console.error('[OAuth] 광고주 organization_id 없음');
        return new Response(
          JSON.stringify({ error: 'Advertiser organization not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 조직의 GCP 자격증명 조회 (RPC 함수 사용)
      console.log('[OAuth] 조직 GCP 조회 시작:', advertiserData.organization_id);
      const { data: gcpData, error: gcpError } = await supabaseServiceRole
        .rpc('get_organization_gcp_credentials', {
          org_id: advertiserData.organization_id,
        });

      console.log('[OAuth] 조직 GCP 조회 결과:', { gcpData, gcpError });

      if (gcpError || !gcpData || gcpData.length === 0 || !gcpData[0].client_id || !gcpData[0].client_secret) {
        console.error('[OAuth] 조직 GCP 설정 없음 또는 조회 실패');
        return new Response(
          JSON.stringify({
            error: 'Organization GCP credentials not configured',
            message: '대행사 GCP 설정이 필요합니다. 관리자 대시보드에서 설정하거나 자체 GCP를 사용하세요.',
            debug: {
              gcpError: gcpError?.message,
              hasData: !!gcpData,
              dataLength: gcpData?.length,
              hasClientId: gcpData?.[0]?.client_id ? true : false,
              hasClientSecret: gcpData?.[0]?.client_secret ? true : false
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      clientId = gcpData[0].client_id;
      clientSecret = gcpData[0].client_secret;
    } else {
      // 직접 입력된 GCP 사용
      if (!customClientId || !customClientSecret) {
        return new Response(
          JSON.stringify({ error: 'Missing client_id or client_secret for custom GCP' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      clientId = customClientId;
      clientSecret = customClientSecret;
    }

    // State token 생성 (CSRF 방지)
    const stateToken = crypto.randomUUID();
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-callback`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15분 후

    let authorizationUrl: string;
    let codeVerifier: string | null = null;
    let codeChallenge: string | null = null;

    if (platform === 'Google Ads') {
      // PKCE 생성
      codeVerifier = generateCodeVerifier();
      codeChallenge = await generateCodeChallenge(codeVerifier);

      const scopes = platformConfig.oauth_scopes?.join(' ') || 'https://www.googleapis.com/auth/adwords';
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes,
        access_type: 'offline',
        prompt: 'consent',
        state: stateToken,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else if (platform === 'Meta Ads') {
      const scopes = platformConfig.oauth_scopes?.join(',') || 'ads_read,ads_management';
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        state: stateToken,
        scope: scopes,
      });

      authorizationUrl = `https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported platform for OAuth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Origin 추출 (로컬/프로덕션 자동 감지)
    const appOrigin = extractOriginFromRequest(req);

    // OAuth 세션 저장 (client_secret 직접 저장)
    console.log('[OAuth] OAuth 세션 저장 시도...');
    const { error: sessionError } = await supabaseServiceRole
      .from('oauth_authorization_sessions')
      .insert({
        advertiser_id,
        platform,
        state_token: stateToken,
        code_verifier: codeVerifier,
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        client_id: clientId,
        client_secret: clientSecret,
        app_origin: appOrigin,
      });

    console.log('[OAuth] 세션 저장 결과:', { success: !sessionError, error: sessionError?.message });

    if (sessionError) {
      console.error('[OAuth] 세션 저장 실패:', sessionError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create OAuth session',
          details: sessionError?.message || 'Unknown session error',
          code: sessionError?.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response: OAuthInitiateResponse = {
      authorization_url: authorizationUrl,
      state_token: stateToken,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
