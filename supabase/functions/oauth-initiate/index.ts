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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
      const { data: advertiserData, error: advertiserError } = await supabaseServiceRole
        .from('advertisers')
        .select('organization_id')
        .eq('id', advertiser_id)
        .single();

      if (advertiserError || !advertiserData?.organization_id) {
        return new Response(
          JSON.stringify({ error: 'Advertiser organization not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 조직의 GCP 자격증명 조회 (RPC 함수 사용)
      const { data: gcpData, error: gcpError } = await supabaseServiceRole
        .rpc('get_organization_gcp_credentials', {
          org_id: advertiserData.organization_id,
        });

      if (gcpError || !gcpData || gcpData.length === 0 || !gcpData[0].client_id || !gcpData[0].client_secret) {
        return new Response(
          JSON.stringify({
            error: 'Organization GCP credentials not configured',
            message: '대행사 GCP 설정이 필요합니다. 관리자 대시보드에서 설정하거나 자체 GCP를 사용하세요.'
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

    // Client Secret을 Vault에 임시 저장 (callback에서 사용)
    const { data: clientSecretVault, error: vaultError } = await supabaseServiceRole
      .from('vault.secrets')
      .insert({
        secret: clientSecret,
        description: `Temporary OAuth client secret for session ${stateToken}`,
      })
      .select('id')
      .single();

    if (vaultError || !clientSecretVault) {
      console.error('Failed to store client secret in vault:', vaultError);
      return new Response(
        JSON.stringify({ error: 'Failed to store OAuth credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OAuth 세션 저장 (client_id와 client_secret_vault_id 포함)
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
        // 추가 필드: Client ID와 Client Secret Vault ID 저장
        client_id: clientId,
        client_secret_vault_id: clientSecretVault.id,
      });

    if (sessionError) {
      console.error('Failed to create OAuth session:', sessionError);
      // 실패 시 Vault에서 Client Secret 삭제
      await supabaseServiceRole
        .from('vault.secrets')
        .delete()
        .eq('id', clientSecretVault.id);

      return new Response(
        JSON.stringify({ error: 'Failed to create OAuth session' }),
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
