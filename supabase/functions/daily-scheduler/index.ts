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

    // 어제 날짜 계산
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // active integrations 조회 (토큰이 있는 것만)
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select('id, oauth_refresh_token_encrypted')
      .eq('status', 'active')
      .eq('platform', platform)
      .is('deleted_at', null)
      .not('oauth_refresh_token_encrypted', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    if (!integrations || integrations.length === 0) {
      console.log(`No active integrations for ${platform}`)
      return new Response(
        JSON.stringify({ message: `No active integrations for ${platform}`, count: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

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
