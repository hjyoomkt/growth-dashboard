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

// APP_URL 동적 감지 (로컬/프로덕션 자동 지원)
function getAppUrl(req: Request): string {
  const configuredUrl = Deno.env.get('APP_URL');

  // Referer 헤더에서 origin 추출 (OAuth initiate 호출한 origin)
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

      // localhost인 경우 referer origin 사용 (로컬 개발 환경)
      if (refererOrigin.includes('localhost') || refererOrigin.includes('127.0.0.1')) {
        console.log('[OAuth] Local development detected, using referer origin:', refererOrigin);
        return refererOrigin;
      }
    } catch (e) {
      console.warn('[OAuth] Failed to parse referer:', e);
    }
  }

  // 프로덕션 또는 Referer 없을 경우 환경 변수 사용
  return configuredUrl || 'http://localhost:3000';
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

    const appUrl = getAppUrl(req);

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

    // 세션에서 Client Secret 조회
    const clientSecret = session.client_secret ||
      Deno.env.get(`${platform.toUpperCase().replace(' ', '_')}_CLIENT_SECRET`) || '';

    if (!clientSecret) {
      throw new Error('OAuth client credentials not configured');
    }

    let accessToken: string;
    let refreshToken: string | null = null;
    let expiresIn: number;

    let googleAccountEmail: string | null = null;

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

      // ===== 디버깅 로그 추가 =====
      console.log('[OAuth Callback] Google token exchange SUCCESS');
      console.log('[OAuth Callback] Token data received:', {
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0,
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken?.length || 0,
        refreshTokenPreview: refreshToken ? refreshToken.substring(0, 10) + '...' : 'null',
        expiresIn
      });
      // ===== 끝 =====

      // ID Token에서 Google 계정 이메일 추출
      if (tokenData.id_token) {
        try {
          const idTokenPayload = JSON.parse(
            atob(tokenData.id_token.split('.')[1])
          );
          googleAccountEmail = idTokenPayload.email || null;
        } catch (e) {
          console.warn('Failed to decode ID token:', e);
        }
      }
    } else if (platform === 'Meta Ads') {
      // Meta OAuth: Short-lived → Long-lived token
      const tokenData = await exchangeMetaToken(code, clientId, clientSecret);

      accessToken = tokenData.access_token;
      expiresIn = tokenData.expires_in || 5184000; // 60일
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // 토큰 저장 (플랫폼별 처리)
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    const encryptionKey = 'your-encryption-key-change-this-in-production';

    // 사용자 ID 조회 (토큰 생성자 저장용)
    const authHeader = req.headers.get('Authorization');
    let createdByUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseServiceRole.auth.getUser(token);
      if (user) {
        const { data: userData } = await supabaseServiceRole
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();
        createdByUserId = userData?.id || null;
      }
    }

    let integrationData: any = {
      advertiser_id: session.advertiser_id,
      platform,
      integration_type: 'oauth',
      oauth_token_expires_at: tokenExpiresAt.toISOString(),
      status: 'active',
      data_collection_status: 'pending',
      created_by_user_id: createdByUserId,
      is_organization_shared: true,
    };

    if (platform === 'Google Ads') {
      // Google Ads: pgcrypto 암호화 저장
      const { data: encryptedTokens, error: encryptError } = await supabaseServiceRole
        .rpc('encrypt_oauth_tokens', {
          p_access_token: accessToken,
          p_refresh_token: refreshToken,
          p_encryption_key: encryptionKey,
        })
        .single();

      if (encryptError || !encryptedTokens) {
        console.error('Failed to encrypt tokens:', encryptError);
        throw new Error('Failed to encrypt OAuth tokens');
      }

      integrationData.oauth_access_token_encrypted = encryptedTokens.access_token_encrypted;
      integrationData.oauth_refresh_token_encrypted = encryptedTokens.refresh_token_encrypted;
      integrationData.google_account_email = googleAccountEmail;

    } else if (platform === 'Meta Ads') {
      // Meta Ads: Vault 저장 (기존 방식 유지)
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

      integrationData.oauth_access_token_vault_id = accessTokenVault.id;

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

        integrationData.oauth_refresh_token_vault_id = refreshTokenVault.id;
      }
    }

    // Integration 생성
    const { data: integration, error: integrationError } = await supabaseServiceRole
      .from('integrations')
      .insert(integrationData)
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

    // 성공 리다이렉트 (팝업 콜백 페이지로 이동)
    const encodedRefreshToken = refreshToken ? encodeURIComponent(refreshToken) : '';

    // ===== 디버깅 로그 추가 =====
    const redirectUrl = `${appUrl}/oauth-callback.html?oauth_success=true&integration_id=${integration.id}&refresh_token=${encodedRefreshToken}`;
    console.log('[OAuth Callback] Redirecting to oauth-callback.html');
    console.log('[OAuth Callback] Redirect URL:', redirectUrl);
    console.log('[OAuth Callback] URL params:', {
      appUrl,
      integrationId: integration.id,
      hasRefreshToken: !!refreshToken,
      encodedRefreshTokenLength: encodedRefreshToken.length
    });
    // ===== 끝 =====

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appUrl}/oauth-callback.html?oauth_error=callback_failed&error_message=${encodeURIComponent(error.message)}`,
      },
    });
  }
});
