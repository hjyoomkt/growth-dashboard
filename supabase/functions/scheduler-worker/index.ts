// scheduler-worker Edge Function
// collection_jobs 테이블을 모니터링하여 pending 상태 작업 자동 실행

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // pending 상태의 collection_jobs 조회
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('collection_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      throw fetchError
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs', processed: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${pendingJobs.length} pending jobs`)

    let processedCount = 0

    for (const job of pendingJobs) {
      try {
        // collect-ad-data Edge Function 호출
        const response = await fetch(`${SUPABASE_URL}/functions/v1/collect-ad-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            integration_id: job.integration_id,
            start_date: job.start_date,
            end_date: job.end_date,
            mode: job.mode,
            collection_type: job.collection_type
          })
        })

        if (response.ok) {
          console.log(`Job ${job.id} processed successfully`)
          processedCount++
        } else {
          const errorText = await response.text()
          console.error(`Job ${job.id} failed: ${errorText}`)

          // 실패 상태 업데이트
          await supabase
            .from('collection_jobs')
            .update({ status: 'failed', error_message: errorText })
            .eq('id', job.id)
        }

        // Rate limiting (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Exception processing job ${job.id}:`, error)

        await supabase
          .from('collection_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', job.id)
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Processing completed',
        total: pendingJobs.length,
        processed: processedCount
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scheduler worker error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
