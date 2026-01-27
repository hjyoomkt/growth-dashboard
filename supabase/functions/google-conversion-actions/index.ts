import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversionActionRequest {
  integration_id: string
  customer_id: string
}

interface ConversionAction {
  id: string
  name: string
  status: string
  type: string
  category: string
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: ConversionActionRequest = await req.json()

    const {
      integration_id,
      customer_id
    } = body

    // 필수 파라미터 체크
    if (!integration_id || !customer_id) {
      return new Response(
        JSON.stringify({ error: 'integration_id and customer_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase Client 초기화
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 사용자 인증 확인
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Integration 조회 (RLS 적용으로 권한 검증)
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('id, platform, advertiser_id, legacy_client_id, legacy_manager_account_id, advertisers(organization_id)')
      .eq('id', integration_id)
      .single()

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (integration.platform !== 'Google Ads') {
      return new Response(
        JSON.stringify({ error: 'Only Google Ads integrations are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Refresh Token 복호화 (Service Role 사용)
    const { data: refreshToken, error: tokenError } = await supabaseServiceRole.rpc(
      'get_decrypted_token',
      {
        p_api_token_id: integration_id,
        p_token_type: 'oauth_refresh_token',
      }
    )

    if (tokenError || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve refresh token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Client ID 조회
    const clientId = integration.legacy_client_id

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID not found in integration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Client Secret 복호화
    const { data: clientSecret, error: clientSecretError } = await supabaseServiceRole.rpc(
      'get_decrypted_token',
      {
        p_api_token_id: integration_id,
        p_token_type: 'client_secret'
      }
    )

    if (clientSecretError || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve client secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Developer Token 조회 (organization에서)
    const organizationId = integration.advertisers?.organization_id
    let developerToken = null

    if (organizationId) {
      const { data: gcpCredentials } = await supabaseServiceRole.rpc(
        'get_organization_gcp_credentials',
        { org_id: organizationId }
      )

      if (gcpCredentials && gcpCredentials.length > 0) {
        developerToken = gcpCredentials[0].developer_token
      }
    }

    if (!developerToken) {
      return new Response(
        JSON.stringify({ error: 'Developer token not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Manager Account ID 추출
    const managerAccountId = integration.legacy_manager_account_id

    // 8. Refresh Token으로 Access Token 발급
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Failed to refresh access token:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to refresh access token', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { access_token: accessToken } = await tokenResponse.json()

    // 9. 전환 액션 목록 조회
    const gaqlQuery = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.status,
        conversion_action.type,
        conversion_action.category
      FROM conversion_action
    `

    const url = `https://googleads.googleapis.com/v22/customers/${customer_id}/googleAds:searchStream`

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json'
    }

    if (managerAccountId) {
      headers['login-customer-id'] = managerAccountId
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: gaqlQuery })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Ads API 에러:', errorText)
      return new Response(
        JSON.stringify({ error: 'Google Ads API 호출 실패', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 응답 파싱 (배열로 감싸진 JSON)
    const responseData = await response.json()
    console.log('Google Ads API Response:', JSON.stringify(responseData, null, 2))

    const conversionActions: ConversionAction[] = []

    // Google Ads API는 응답을 배열로 감쌉니다
    const dataArray = Array.isArray(responseData) ? responseData : [responseData]

    for (const data of dataArray) {
      if (data.results && Array.isArray(data.results)) {
        console.log('Results count:', data.results.length)
        for (const row of data.results) {
          const ca = row.conversionAction
          if (ca) {
            // ID에서 숫자만 추출
            const idParts = ca.resourceName ? ca.resourceName.split('/') : []
            const id = idParts.length > 0 ? idParts[idParts.length - 1] : (ca.id || '')

            conversionActions.push({
              id,
              name: ca.name || '',
              status: ca.status || '',
              type: ca.type || '',
              category: ca.category || ''
            })
          }
        }
      }
    }

    console.log(`전환 액션 ${conversionActions.length}개 조회 완료`)

    return new Response(
      JSON.stringify({
        success: true,
        conversionActions,
        count: conversionActions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('에러 발생:', error)
    return new Response(
      JSON.stringify({ error: '서버 에러', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
