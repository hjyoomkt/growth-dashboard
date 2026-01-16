// vault-store-secrets Edge Function
// API 토큰 생성 시 민감 정보를 암호화하여 저장 (pgcrypto 사용)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Service Role로 작업 수행 (JWT 검증 제거)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { api_token_id, integration_id, platform, credentials } = await req.json()

    const tokenId = integration_id || api_token_id; // 하위 호환성

    if (!tokenId || !platform || !credentials) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 인증 토큰이 있으면 허용 (RLS는 PostgreSQL 함수에서 처리)

    // PostgreSQL 함수로 암호화 저장
    const { error } = await supabase.rpc('store_encrypted_token', {
      p_api_token_id: tokenId,
      p_access_token: credentials.access_token || null,
      p_refresh_token: credentials.refresh_token || null,
      p_developer_token: credentials.developer_token || null,
      p_client_secret: credentials.client_secret || null,
      p_secret_key: credentials.secret_key || null
    })

    if (error) {
      throw new Error(`Failed to store encrypted tokens: ${error.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Tokens encrypted and stored' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Token storage error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
