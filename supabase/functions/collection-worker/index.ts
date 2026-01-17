// collection-worker Edge Function
// 30초마다 pg_cron이 호출, collection_queue에서 pending 청크 병렬 처리

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. pending 상태의 청크 여러개 조회 (광고계정별 1개씩, 최대 5개)
    const { data: chunks, error: fetchError } = await supabase
      .rpc('get_next_pending_chunks', { p_limit: 5 })

    if (fetchError) {
      throw new Error(`Failed to fetch pending chunks: ${fetchError.message}`)
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending chunks', processed: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Processing ${chunks.length} chunks in parallel`)

    // 2. 병렬 처리
    const results = await Promise.allSettled(
      chunks.map(chunk => processChunk(chunk, supabase))
    )

    // 3. 결과 집계
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[SUMMARY] Processed ${chunks.length} chunks: ${succeeded} succeeded, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: chunks.length,
        succeeded,
        failed
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ERROR] Collection worker error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// 청크 처리 함수
async function processChunk(chunk: any, supabase: any) {
  console.log(`[INFO] Processing chunk ${chunk.id} (job: ${chunk.job_id}, chunk_index: ${chunk.chunk_index})`)

  // 타임아웃 설정 (10분)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 600000)

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/collect-ad-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        integration_id: chunk.integration_id,
        start_date: chunk.start_date,
        end_date: chunk.end_date,
        mode: 'initial',
        collection_type: chunk.collection_type,
        job_id: chunk.job_id
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const responseData = await response.json()

    if (response.ok && responseData.success) {
      // 성공: 청크 상태를 'completed'로 업데이트
      try {
        await supabase
          .from('collection_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', chunk.id)

        // Job의 chunks_completed 카운터 증가
        await supabase.rpc('increment_chunks_completed', { p_job_id: chunk.job_id })

        // Job 완료 여부 확인 및 최종 상태 업데이트
        await supabase.rpc('check_and_finalize_job', { p_job_id: chunk.job_id })

        console.log(`[SUCCESS] Chunk ${chunk.id} completed successfully`)
        return { success: true, chunk_id: chunk.id }
      } catch (dbError) {
        console.error(`[DB_ERROR] Failed to update chunk ${chunk.id}:`, dbError)
        throw dbError
      }

    } else {
      // 실패: 재시도 로직
      const errorText = responseData.error || 'Unknown error'
      console.error(`[ERROR] Chunk ${chunk.id} failed: ${errorText}`)

      // 재시도 가능 여부 확인
      try {
        if (chunk.retry_count < chunk.max_retries) {
          // 재시도: status를 다시 'pending'으로 변경
          await supabase
            .from('collection_queue')
            .update({
              status: 'pending',
              retry_count: chunk.retry_count + 1,
              error_message: errorText,
              last_error_at: new Date().toISOString()
            })
            .eq('id', chunk.id)

          console.log(`[RETRY] Chunk ${chunk.id} retry ${chunk.retry_count + 1}/${chunk.max_retries}`)

        } else {
          // 최종 실패: status를 'failed'로 변경
          await supabase
            .from('collection_queue')
            .update({
              status: 'failed',
              error_message: errorText,
              last_error_at: new Date().toISOString()
            })
            .eq('id', chunk.id)

          // Job의 chunks_failed 카운터 증가
          await supabase.rpc('increment_chunks_failed', { p_job_id: chunk.job_id })

          // Job 완료 여부 확인
          await supabase.rpc('check_and_finalize_job', { p_job_id: chunk.job_id })

          console.error(`[FAILED] Chunk ${chunk.id} failed after ${chunk.max_retries} retries`)
        }
      } catch (dbError) {
        console.error(`[DB_ERROR] Failed to update chunk ${chunk.id} after error:`, dbError)
        throw dbError
      }

      throw new Error(errorText)
    }

  } catch (error) {
    clearTimeout(timeoutId)

    // 타임아웃 에러 처리
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[TIMEOUT] Chunk ${chunk.id} timed out after 10 minutes`)

      // 타임아웃 시 pending으로 되돌려 재시도
      try {
        if (chunk.retry_count < chunk.max_retries) {
          await supabase
            .from('collection_queue')
            .update({
              status: 'pending',
              retry_count: chunk.retry_count + 1,
              error_message: 'Timeout: processing took longer than 10 minutes',
              last_error_at: new Date().toISOString()
            })
            .eq('id', chunk.id)
          console.log(`[RETRY] Chunk ${chunk.id} will retry after timeout (${chunk.retry_count + 1}/${chunk.max_retries})`)
        } else {
          await supabase
            .from('collection_queue')
            .update({
              status: 'failed',
              error_message: 'Timeout: processing took longer than 10 minutes',
              last_error_at: new Date().toISOString()
            })
            .eq('id', chunk.id)
          await supabase.rpc('increment_chunks_failed', { p_job_id: chunk.job_id })
          await supabase.rpc('check_and_finalize_job', { p_job_id: chunk.job_id })
          console.error(`[FAILED] Chunk ${chunk.id} failed after timeout and max retries`)
        }
      } catch (dbError) {
        console.error(`[DB_ERROR] Failed to update chunk ${chunk.id} after timeout:`, dbError)
      }
      throw error
    }

    // 기타 예외 처리
    console.error(`[EXCEPTION] Exception processing chunk ${chunk.id}:`, error)

    try {
      // 예외 발생 시에도 재시도 로직 적용
      if (chunk.retry_count < chunk.max_retries) {
        await supabase
          .from('collection_queue')
          .update({
            status: 'pending',
            retry_count: chunk.retry_count + 1,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            last_error_at: new Date().toISOString()
          })
          .eq('id', chunk.id)
      } else {
        await supabase
          .from('collection_queue')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            last_error_at: new Date().toISOString()
          })
          .eq('id', chunk.id)

        await supabase.rpc('increment_chunks_failed', { p_job_id: chunk.job_id })
        await supabase.rpc('check_and_finalize_job', { p_job_id: chunk.job_id })
      }
    } catch (dbError) {
      console.error(`[DB_ERROR] Failed to update chunk ${chunk.id} after exception:`, dbError)
    }

    throw error
  }
}
