import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversionActionRequest {
  customer_id: string
  developer_token: string
  manager_account_id?: string
  refresh_token: string
  client_id: string
  client_secret: string
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
      customer_id,
      developer_token,
      manager_account_id,
      refresh_token,
      client_id,
      client_secret
    } = body

    // 필수 파라미터 체크
    if (!customer_id || !developer_token || !refresh_token || !client_id || !client_secret) {
      return new Response(
        JSON.stringify({ error: '필수 파라미터가 누락되었습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Access Token 발급
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id,
        client_secret,
        refresh_token,
        grant_type: 'refresh_token'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      console.error('Access Token 발급 실패:', tokenData)
      return new Response(
        JSON.stringify({ error: 'Access Token 발급 실패', details: tokenData }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = tokenData.access_token

    // 2. 전환 액션 목록 조회 (모든 상태 포함)
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
      'developer-token': developer_token,
      'Content-Type': 'application/json'
    }

    if (manager_account_id) {
      headers['login-customer-id'] = manager_account_id
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
