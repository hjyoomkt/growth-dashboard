import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface ResolveTokenRequest {
  integration_id: string;
}

interface ResolveTokenResponse {
  access_token: string;
  token_type: 'token' | 'oauth';
  expires_at?: string;
  refreshed?: boolean;
  platform?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OAuth refresh 로직
async function refreshOAuthToken(
  platform: string,
  refreshToken: string,
  clientId?: string,
  clientSecret?: string
): Promise<{ access_token: string; expires_in: number }> {
  if (platform === 'Google Ads') {
    // Google OAuth 2.0 refresh
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Google OAuth refresh failed: ${errorData}`);
    }

    return await response.json();
  } else if (platform === 'Meta Ads') {
    // Meta long-lived token refresh
    const response = await fetch(
      `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${refreshToken}`
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Meta OAuth refresh failed: ${errorData}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 5184000, // 60일 기본값
    };
  } else {
    throw new Error(`OAuth refresh not supported for platform: ${platform}`);
  }
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

    // Service role client (Vault 접근용)
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticated client (RLS 체크용)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // SERVICE_ROLE_KEY로 호출 시 인증 체크 스킵
    const isServiceRole = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'invalid');

    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { integration_id }: ResolveTokenRequest = await req.json();

    if (!integration_id) {
      return new Response(
        JSON.stringify({ error: 'Missing integration_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Integration 조회 (SERVICE_ROLE로 RLS 우회)
    const { data: integration, error: integrationError } = await supabaseServiceRole
      .from('integrations')
      .select('*')
      .eq('id', integration_id)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const integrationType = integration.integration_type as 'token' | 'oauth';
    const platform = integration.platform;

    let accessToken: string;
    let refreshed = false;
    let expiresAt: string | undefined;

    if (integrationType === 'token') {
      // Token 타입: pgcrypto 또는 Vault에서 조회
      let tokenType = 'access_token';

      if (platform === 'Google Ads') {
        tokenType = 'refresh_token';
      }

      // 먼저 pgcrypto 복호화 시도
      const { data: decryptedToken, error: decryptError } = await supabaseServiceRole
        .rpc('get_decrypted_token', {
          p_api_token_id: integration_id,
          p_token_type: tokenType
        });

      if (!decryptError && decryptedToken) {
        accessToken = decryptedToken;
      } else {
        // pgcrypto 실패 시 Vault fallback
        let vaultId: string | null = null;

        if (platform === 'Google Ads') {
          vaultId = integration.legacy_refresh_token_vault_id;
        } else if (platform === 'Meta Ads' || platform === 'Naver Ads') {
          vaultId = integration.legacy_access_token_vault_id;
        }

        if (!vaultId) {
          return new Response(
            JSON.stringify({ error: 'Token not found (neither encrypted nor in vault)' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Vault에서 토큰 조회 (service_role)
        const { data: vaultData, error: vaultError } = await supabaseServiceRole
          .from('vault.secrets')
          .select('secret')
          .eq('id', vaultId)
          .single();

        if (vaultError || !vaultData) {
          console.error('Vault read error:', vaultError);
          return new Response(
            JSON.stringify({ error: 'Failed to retrieve token from vault' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        accessToken = vaultData.secret;
      }
    } else if (integrationType === 'oauth') {
      // OAuth 타입: 만료 체크 후 필요 시 refresh
      const tokenExpiresAt = integration.oauth_token_expires_at
        ? new Date(integration.oauth_token_expires_at)
        : null;
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (tokenExpiresAt && tokenExpiresAt > fiveMinutesFromNow) {
        // 토큰 유효: 기존 토큰 반환
        const { data: vaultData, error: vaultError } = await supabaseServiceRole
          .from('vault.secrets')
          .select('secret')
          .eq('id', integration.oauth_access_token_vault_id)
          .single();

        if (vaultError || !vaultData) {
          console.error('Vault read error:', vaultError);
          return new Response(
            JSON.stringify({ error: 'Failed to retrieve OAuth token from vault' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        accessToken = vaultData.secret;
        expiresAt = tokenExpiresAt.toISOString();
      } else {
        // 토큰 만료: refresh 필요
        const { data: refreshVaultData, error: refreshVaultError } = await supabaseServiceRole
          .from('vault.secrets')
          .select('secret')
          .eq('id', integration.oauth_refresh_token_vault_id)
          .single();

        if (refreshVaultError || !refreshVaultData) {
          console.error('Refresh token vault read error:', refreshVaultError);
          return new Response(
            JSON.stringify({ error: 'Failed to retrieve refresh token from vault' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // OAuth client credentials 조회
        const { data: clientIdVault } = await supabaseServiceRole
          .from('vault.secrets')
          .select('secret')
          .eq('id', integration.oauth_client_id_vault_id || '')
          .single();

        const { data: clientSecretVault } = await supabaseServiceRole
          .from('vault.secrets')
          .select('secret')
          .eq('id', integration.oauth_client_secret_vault_id || '')
          .single();

        // Refresh 실행
        const refreshResult = await refreshOAuthToken(
          platform,
          refreshVaultData.secret,
          clientIdVault?.secret,
          clientSecretVault?.secret
        );

        accessToken = refreshResult.access_token;
        refreshed = true;

        // 새 토큰 Vault 저장
        const { data: newVaultData, error: newVaultError } = await supabaseServiceRole
          .from('vault.secrets')
          .insert({
            secret: accessToken,
            description: `OAuth access token for ${platform} (refreshed)`,
          })
          .select('id')
          .single();

        if (newVaultError || !newVaultData) {
          console.error('Failed to store refreshed token in vault:', newVaultError);
          return new Response(
            JSON.stringify({ error: 'Failed to store refreshed token' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Integration 업데이트
        const newExpiresAt = new Date(now.getTime() + refreshResult.expires_in * 1000);
        const { error: updateError } = await supabaseClient
          .from('integrations')
          .update({
            oauth_access_token_vault_id: newVaultData.id,
            oauth_token_expires_at: newExpiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', integration_id);

        if (updateError) {
          console.error('Failed to update integration with new token:', updateError);
        }

        expiresAt = newExpiresAt.toISOString();

        // Refresh 로그 기록 (token_refresh_logs 테이블 있을 경우)
        await supabaseServiceRole.from('token_refresh_logs').insert({
          integration_id,
          platform,
          event_type: 'refresh_success',
          created_at: now.toISOString(),
        }).catch(err => console.log('token_refresh_logs 테이블 없음:', err));
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid integration type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response: ResolveTokenResponse = {
      access_token: accessToken,
      token_type: integrationType,
      expires_at: expiresAt,
      refreshed,
      platform,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error resolving access token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
