import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google OAuth: Authorization code → tokens 교환
async function exchangeGoogleAuthorizationCode(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Google token exchange failed: ${errorData}`);
  }

  return await response.json();
}

// Meta OAuth: Short-lived token → Long-lived token 교환
async function exchangeMetaToken(
  shortLivedToken: string,
  clientId: string,
  clientSecret: string
) {
  const response = await fetch(
    `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Meta token exchange failed: ${errorData}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // URL 파라미터 파싱
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';

    // OAuth 에러 처리
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${appUrl}/admin/api-management?oauth_error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
        },
      });
    }

    if (!code || !state) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${appUrl}/admin/api-management?oauth_error=missing_parameters`,
        },
      });
    }

    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // State token 검증
    const { data: session, error: sessionError } = await supabaseServiceRole
      .from('oauth_authorization_sessions')
      .select('*')
      .eq('state_token', state)
      .eq('status', 'pending')
      .single();

    if (sessionError || !session) {
      console.error('Invalid or expired OAuth session:', sessionError);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${appUrl}/admin/api-management?oauth_error=invalid_state`,
        },
      });
    }

    // 15분 만료 체크
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      await supabaseServiceRole
        .from('oauth_authorization_sessions')
        .update({ status: 'expired', error_message: 'Session expired' })
        .eq('id', session.id);

      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${appUrl}/admin/api-management?oauth_error=session_expired`,
        },
      });
    }

    const platform = session.platform;

    // 세션에서 Client ID 조회
    const clientId = session.client_id;
    if (!clientId) {
      throw new Error('Client ID not found in session');
    }

    // Vault에서 Client Secret 조회
    let clientSecret: string;
    if (session.client_secret_vault_id) {
      const { data: clientSecretVault, error: vaultError } = await supabaseServiceRole
        .from('vault.secrets')
        .select('secret')
        .eq('id', session.client_secret_vault_id)
        .single();

      if (vaultError || !clientSecretVault) {
        throw new Error('Client Secret not found in vault');
      }
      clientSecret = clientSecretVault.secret;
    } else {
      // 기존 방식: 환경변수에서 조회 (하위 호환성)
      clientSecret = Deno.env.get(`${platform.toUpperCase().replace(' ', '_')}_CLIENT_SECRET`) || '';
      if (!clientSecret) {
        throw new Error('OAuth client credentials not configured');
      }
    }

    let accessToken: string;
    let refreshToken: string | null = null;
    let expiresIn: number;

    if (platform === 'Google Ads') {
      // Google OAuth: Authorization code → tokens
      const tokenData = await exchangeGoogleAuthorizationCode(
        code,
        session.code_verifier!,
        clientId,
        clientSecret,
        session.redirect_uri
      );

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresIn = tokenData.expires_in || 3600;
    } else if (platform === 'Meta Ads') {
      // Meta OAuth: Short-lived → Long-lived token
      const tokenData = await exchangeMetaToken(code, clientId, clientSecret);

      accessToken = tokenData.access_token;
      expiresIn = tokenData.expires_in || 5184000; // 60일
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Vault에 토큰 저장
    const { data: accessTokenVault, error: accessVaultError } = await supabaseServiceRole
      .from('vault.secrets')
      .insert({
        secret: accessToken,
        description: `OAuth access token for ${platform}`,
      })
      .select('id')
      .single();

    if (accessVaultError || !accessTokenVault) {
      throw new Error('Failed to store access token in vault');
    }

    let refreshTokenVaultId: string | null = null;
    if (refreshToken) {
      const { data: refreshTokenVault, error: refreshVaultError } = await supabaseServiceRole
        .from('vault.secrets')
        .insert({
          secret: refreshToken,
          description: `OAuth refresh token for ${platform}`,
        })
        .select('id')
        .single();

      if (refreshVaultError || !refreshTokenVault) {
        throw new Error('Failed to store refresh token in vault');
      }

      refreshTokenVaultId = refreshTokenVault.id;
    }

    // Integration 생성
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    const { data: integration, error: integrationError } = await supabaseServiceRole
      .from('integrations')
      .insert({
        advertiser_id: session.advertiser_id,
        platform,
        integration_type: 'oauth',
        oauth_access_token_vault_id: accessTokenVault.id,
        oauth_refresh_token_vault_id: refreshTokenVaultId,
        oauth_token_expires_at: tokenExpiresAt.toISOString(),
        status: 'active',
        data_collection_status: 'pending',
      })
      .select('id')
      .single();

    if (integrationError || !integration) {
      console.error('Failed to create integration:', integrationError);
      throw new Error('Failed to create integration');
    }

    // OAuth 세션 완료 처리
    await supabaseServiceRole
      .from('oauth_authorization_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    // 임시 저장된 Client Secret 삭제 (보안)
    if (session.client_secret_vault_id) {
      await supabaseServiceRole
        .from('vault.secrets')
        .delete()
        .eq('id', session.client_secret_vault_id);
    }

    // 성공 리다이렉트 (리프레쉬 토큰 포함)
    const encodedRefreshToken = refreshToken ? encodeURIComponent(refreshToken) : '';

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appUrl}/admin/api-management?oauth_success=true&integration_id=${integration.id}&refresh_token=${encodedRefreshToken}`,
      },
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appUrl}/admin/api-management?oauth_error=callback_failed&error_message=${encodeURIComponent(error.message)}`,
      },
    });
  }
});
