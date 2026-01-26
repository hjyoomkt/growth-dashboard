// daily-scheduler Edge Function
// 매일 정해진 시간에 cron으로 호출되어 collection_jobs 생성 및 실행

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase는 자동으로 이 환경변수를 주입합니다
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const { platform, collection_type } = await req.json()

    if (!platform || !collection_type) {
      return new Response(
        JSON.stringify({ error: 'platform and collection_type required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 어제 날짜 계산 (한국 시간 기준)
    const getKSTYesterday = (): string => {
      const now = new Date()
      const kstOffset = 9 * 60 // UTC+9 (분 단위)
      const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000)
      kstNow.setDate(kstNow.getDate() - 1)
      return kstNow.toISOString().split('T')[0]
    }

    const yesterdayStr = getKSTYesterday()
    console.log(`[Daily Scheduler] Collecting data for date (KST yesterday): ${yesterdayStr}`)

    // active integrations 조회 (플랫폼별 토큰 타입에 맞게)
    let query = supabase
      .from('integrations')
      .select('id, oauth_refresh_token_encrypted, access_token_encrypted')
      .eq('status', 'active')
      .eq('platform', platform)
      .is('deleted_at', null)

    // 플랫폼별 토큰 타입 필터링
    if (platform === 'Google Ads') {
      // OAuth refresh token 필요
      query = query.not('oauth_refresh_token_encrypted', 'is', null)
    } else if (platform === 'Meta Ads') {
      // Access token 필요
      query = query.not('access_token_encrypted', 'is', null)
    } else if (platform === 'Naver Ads') {
      // Organization-level credentials 사용, integration-level 토큰 불필요
      // 기본 필터(status, platform, deleted_at)만 적용
    } else {
      // 기타 플랫폼: 어떤 형태의 토큰이라도 있으면 처리
      query = query.or('oauth_refresh_token_encrypted.not.is.null,access_token_encrypted.not.is.null')
    }

    const { data: integrations, error: fetchError } = await query

    if (fetchError) {
      throw fetchError
    }

    if (!integrations || integrations.length === 0) {
      console.warn(`[Daily Scheduler] No active integrations found for ${platform}. Check: status='active', deleted_at IS NULL, platform='${platform}'`)
      return new Response(
        JSON.stringify({ message: `No active integrations for ${platform}`, count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.info(`[Daily Scheduler] Found ${integrations.length} active integrations for ${platform}`)
    console.log(`Processing ${integrations.length} integrations for ${platform} ${collection_type}`)

    let processedCount = 0

    // 각 integration에 대해 collection_jobs 생성 및 즉시 실행
    for (const integration of integrations) {
      try {
        // collect-ad-data 직접 호출
        const response = await fetch(`${SUPABASE_URL}/functions/v1/collect-ad-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            integration_id: integration.id,
            start_date: yesterdayStr,
            end_date: yesterdayStr,
            mode: 'daily',
            collection_type: collection_type
          })
        })

        if (response.ok) {
          console.log(`Successfully triggered collection for integration ${integration.id}`)
          processedCount++
        } else {
          const errorText = await response.text()
          console.error(`Failed to trigger collection for integration ${integration.id}: ${errorText}`)
        }

        // Rate limiting (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Exception processing integration ${integration.id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Daily collection triggered',
        platform: platform,
        collection_type: collection_type,
        date: yesterdayStr,
        total: integrations.length,
        processed: processedCount
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Daily scheduler error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
