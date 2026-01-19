// resolve-access-token Edge Function
// Refresh Token으로 Access Token 발급 (Google Ads API용)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { integration_id } = await req.json();

    if (!integration_id) {
      return new Response(
        JSON.stringify({ error: 'Missing integration_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Integration 조회
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('platform, legacy_client_id, legacy_refresh_token_vault_id, legacy_client_secret_vault_id, legacy_access_token_vault_id')
      .eq('id', integration_id)
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 플랫폼별 처리
    if (integration.platform === 'Google Ads') {
      // Vault에서 Refresh Token 조회
      const { data: refreshTokenData, error: vaultError } = await supabase.rpc(
        'get_decrypted_token',
        { p_vault_id: integration.legacy_refresh_token_vault_id }
      );

      if (vaultError || !refreshTokenData) {
        console.error('Vault error:', vaultError);
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve refresh token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Client Secret 조회
      const { data: clientSecretData, error: secretError } = await supabase.rpc(
        'get_decrypted_token',
        { p_vault_id: integration.legacy_client_secret_vault_id }
      );

      if (secretError || !clientSecretData) {
        console.error('Client secret error:', secretError);
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve client secret' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Google OAuth2 Token Exchange
      const tokenPayload = new URLSearchParams({
        client_id: integration.legacy_client_id,
        client_secret: clientSecretData,
        refresh_token: refreshTokenData,
        grant_type: 'refresh_token'
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenPayload.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Token exchange failed', details: errorText }),
          { status: tokenResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenData = await tokenResponse.json();

      return new Response(
        JSON.stringify({ access_token: tokenData.access_token }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (integration.platform === 'Meta Ads' || integration.platform === 'Kakao Ads') {
      // Meta/Kakao는 Access Token이 바로 사용됨
      const { data: accessTokenData, error: vaultError } = await supabase.rpc(
        'get_decrypted_token',
        { p_vault_id: integration.legacy_access_token_vault_id }
      );

      if (vaultError || !accessTokenData) {
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve access token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ access_token: accessTokenData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (integration.platform === 'Naver Ads') {
      // Naver도 Access Token 직접 사용
      const { data: accessTokenData, error: vaultError } = await supabase.rpc(
        'get_decrypted_token',
        { p_vault_id: integration.legacy_access_token_vault_id }
      );

      if (vaultError || !accessTokenData) {
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve access token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ access_token: accessTokenData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
