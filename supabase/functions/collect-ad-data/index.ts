// collect-ad-data Edge Function
// 메인 데이터 수집 엔진: 토큰 검증, 청크 분할, Rate Limit 처리, 진행 상태 추적

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface CollectRequest {
  integration_id: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  mode: 'initial' | 'daily'
  collection_type?: 'ads' | 'demographics' | 'creatives' | 'daily'
  job_id?: string // initial-collection에서 생성한 job ID (선택)
}

interface ChunkProgress {
  total_chunks: number
  completed: number
  failed: number
  errors: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body: CollectRequest = await req.json()

    const { integration_id, start_date, end_date, mode, collection_type = 'ads', job_id } = body

    // 입력 검증
    if (!integration_id || !start_date || !end_date || !mode) {
      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    // 1. Integration 조회
    console.log('[DEBUG] Fetching integration:', { integration_id })
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integration_id)
      .is('deleted_at', null)
      .single()

    console.log('[DEBUG] Integration query result:', {
      integration_id,
      found: !!integration,
      error: intError,
      integration_data: integration
    })

    if (intError || !integration) {
      console.error('[ERROR] Integration not found:', intError)
      return jsonResponse({ error: 'Integration not found' }, 404)
    }

    // 2. 토큰 검증 (초기 연동 필수)
    if (mode === 'initial') {
      const tokenValidation = await validateToken(supabase, integration)
      if (!tokenValidation.valid) {
        return jsonResponse({
          error: 'Token validation failed',
          details: tokenValidation.error
        }, 401)
      }
    }

    // 3. 토큰 해결
    const accessToken = await resolveAccessToken(supabase, integration)
    if (!accessToken) {
      return jsonResponse({ error: 'Failed to resolve access token' }, 500)
    }

    // 4. Platform Config 조회
    const { data: platformConfig } = await supabase
      .from('platform_configs')
      .select('*')
      .eq('platform', integration.platform)
      .single()

    if (!platformConfig) {
      return jsonResponse({ error: 'Platform config not found' }, 404)
    }

    // initial-collection에서 호출된 경우: job 생성 안 함, 단일 청크만 처리
    if (job_id) {
      console.log(`[INFO] Called from initial-collection with job_id: ${job_id}`)

      // 단일 청크 수집
      try {
        await collectChunk(
          supabase,
          integration,
          accessToken,
          start_date,
          end_date,
          collection_type,
          platformConfig
        )

        return jsonResponse({
          success: true,
          job_id: job_id
        })

      } catch (error) {
        console.error('[ERROR] Chunk collection failed:', error)
        return jsonResponse({
          success: false,
          error: error.message,
          job_id: job_id
        }, 500)
      }
    }

    // 직접 호출된 경우: job 생성 + 청크 분할 처리 (기존 로직)
    console.log(`[INFO] Direct call - creating job and processing chunks`)

    // 5. 청크 크기 결정
    let chunkSizeDays = platformConfig.chunk_size_days
    if (collection_type === 'demographics' && platformConfig.demographics_chunk_size_days) {
      chunkSizeDays = platformConfig.demographics_chunk_size_days
    }

    // 6. 날짜 청크 계산
    const chunks = calculateDateChunks(start_date, end_date, chunkSizeDays, collection_type)

    // 7. Collection Job 생성
    const { data: job, error: jobError } = await supabase
      .from('collection_jobs')
      .insert({
        advertiser_id: integration.advertiser_id,
        platform: integration.platform,
        collection_type,
        collection_date: mode === 'daily' ? start_date : null,
        start_date: mode === 'initial' ? start_date : null,
        end_date: mode === 'initial' ? end_date : null,
        mode,
        status: 'running',
        chunks_total: chunks.length,
        chunks_completed: 0,
        chunks_failed: 0,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (jobError || !job) {
      return jsonResponse({ error: 'Failed to create collection job' }, 500)
    }

    // 8. 각 청크 순차 수집
    const progress: ChunkProgress = {
      total_chunks: chunks.length,
      completed: 0,
      failed: 0,
      errors: []
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`)

      try {
        // 청크 수집 실행
        await collectChunk(
          supabase,
          integration,
          accessToken,
          chunk.start,
          chunk.end,
          collection_type,
          platformConfig
        )

        progress.completed++

        // 진행률 업데이트
        await supabase
          .from('collection_jobs')
          .update({
            chunks_completed: progress.completed,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // Rate Limit 대기
        await delay(platformConfig.rate_limit_delay_ms)

      } catch (error) {
        console.error(`Chunk ${i + 1} failed:`, error)
        progress.failed++
        progress.errors.push(`Chunk ${i + 1}: ${error.message}`)

        // 실패 횟수 업데이트
        await supabase
          .from('collection_jobs')
          .update({
            chunks_failed: progress.failed,
            error_details: progress.errors,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // 재시도 로직 (지수 백오프)
        let retryCount = 0
        let retrySuccess = false

        while (retryCount < platformConfig.max_retry_attempts && !retrySuccess) {
          const backoffDelay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
          console.log(`Retrying chunk ${i + 1} after ${backoffDelay}ms (attempt ${retryCount + 1})`)
          await delay(backoffDelay)

          try {
            await collectChunk(
              supabase,
              integration,
              accessToken,
              chunk.start,
              chunk.end,
              collection_type,
              platformConfig
            )
            retrySuccess = true
            progress.completed++
            progress.failed--

            await supabase
              .from('collection_jobs')
              .update({
                chunks_completed: progress.completed,
                chunks_failed: progress.failed,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id)

          } catch (retryError) {
            retryCount++
            if (retryCount >= platformConfig.max_retry_attempts) {
              console.error(`Chunk ${i + 1} failed after ${retryCount} retries`)
            }
          }
        }
      }
    }

    // 9. Job 상태 업데이트
    let finalStatus = 'completed'
    if (progress.failed === progress.total_chunks) {
      finalStatus = 'failed'
    } else if (progress.failed > 0) {
      finalStatus = 'partial'
    }

    await supabase
      .from('collection_jobs')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error_message: progress.errors.length > 0 ? progress.errors.join('; ') : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    // 10. Integration 상태 업데이트
    await supabase
      .from('integrations')
      .update({
        data_collection_status: finalStatus === 'completed' ? 'success' : finalStatus === 'failed' ? 'error' : 'partial',
        last_collection_at: new Date().toISOString(),
        last_error: progress.errors.length > 0 ? progress.errors[0] : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', integration_id)

    return jsonResponse({
      success: finalStatus === 'completed',
      job_id: job.id,
      progress
    })

  } catch (error) {
    console.error('Collection error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

async function validateToken(supabase: any, integration: any): Promise<{ valid: boolean; error?: string }> {
  // 토큰 검증 API 호출 (플랫폼별)
  try {
    const platform = integration.platform
    console.log('[DEBUG] validateToken:', { platform, integration_id: integration.id })

    // 토큰 가져오기
    const token = await resolveAccessToken(supabase, integration)
    console.log('[DEBUG] Token resolved:', { has_token: !!token, token_length: token?.length })

    if (!token) {
      return { valid: false, error: 'Failed to resolve token' }
    }

    // 플랫폼별 테스트 API 호출
    if (platform === 'Meta Ads') {
      const accountId = integration.legacy_account_id
      const url = `https://graph.facebook.com/v24.0/act_${accountId}?fields=id,name&access_token=${token}`
      console.log('[DEBUG] Meta API validation:', { accountId, url: url.replace(token, 'TOKEN_HIDDEN') })

      const response = await fetch(url, { method: 'GET' })
      console.log('[DEBUG] Meta API response:', { status: response.status, ok: response.ok })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ERROR] Meta API validation failed:', { status: response.status, body: errorText })
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: { message: errorText } }
        }
        return { valid: false, error: error.error?.message || 'Meta API validation failed' }
      }

      const successData = await response.json()
      console.log('[DEBUG] Meta API validation success:', successData)
    } else if (platform === 'Google Ads') {
      // Google Ads는 refresh_token이 있으면 유효하다고 판단
      if (!integration.legacy_refresh_token_vault_id) {
        return { valid: false, error: 'Missing refresh token' }
      }
    } else if (platform === 'Naver Ads') {
      const response = await fetch(
        'https://api.naver.com/ncc/customers',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        return { valid: false, error: 'Naver API validation failed' }
      }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

async function resolveAccessToken(supabase: any, integration: any): Promise<string | null> {
  try {
    console.log('[DEBUG] Resolving access token:', { integration_id: integration.id, platform: integration.platform })

    // Meta Ads는 Access Token 직접 사용 (HTTP 호출 없이 RPC로 바로 가져옴)
    if (integration.platform === 'Meta Ads') {
      const { data: accessToken, error } = await supabase.rpc(
        'get_decrypted_token',
        {
          p_api_token_id: integration.id,
          p_token_type: 'access_token'
        }
      )

      if (error || !accessToken) {
        console.error('[ERROR] Failed to get Meta access token:', error)
        return null
      }

      console.log('[DEBUG] Meta access token resolved directly:', { token_length: accessToken?.length })
      return accessToken
    }

    // Google Ads 등 다른 플랫폼은 기존 HTTP 호출 방식 유지 (토큰 교환 필요)
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/resolve-access-token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integration_id: integration.id })
      }
    )

    console.log('[DEBUG] resolve-access-token response:', { status: response.status, ok: response.ok })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ERROR] Failed to resolve access token:', { status: response.status, body: errorText })
      return null
    }

    const data = await response.json()
    console.log('[DEBUG] Access token resolved:', { has_token: !!data.access_token, token_length: data.access_token?.length })
    return data.access_token
  } catch (error) {
    console.error('[ERROR] Error resolving access token:', error)
    return null
  }
}

function calculateDateChunks(
  startDate: string,
  endDate: string,
  chunkSizeDays: number,
  collectionType: string = 'ads'
): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Demographics 390일 제한
  if (collectionType === 'demographics') {
    const today = new Date()
    const limitDate = new Date(today)
    limitDate.setDate(limitDate.getDate() - 390)

    if (start < limitDate) {
      console.log(`[Demographics 390일 제한] ${formatDate(start)} → ${formatDate(limitDate)}`)
      start.setTime(limitDate.getTime())
    }

    if (start > end) {
      console.log('[Demographics 390일 제한] 수집 가능 기간 없음')
      return []
    }
  }

  let currentStart = new Date(start)

  while (currentStart <= end) {
    const currentEnd = new Date(currentStart)
    currentEnd.setDate(currentEnd.getDate() + chunkSizeDays - 1)

    if (currentEnd > end) {
      currentEnd.setTime(end.getTime())
    }

    chunks.push({
      start: formatDate(currentStart),
      end: formatDate(currentEnd)
    })

    currentStart.setDate(currentStart.getDate() + chunkSizeDays)
  }

  console.log(`[calculateDateChunks] ${collectionType}: ${chunks.length} chunks`)
  return chunks
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function collectChunk(
  supabase: any,
  integration: any,
  accessToken: string,
  startDate: string,
  endDate: string,
  collectionType: string,
  platformConfig: any
) {
  const platform = integration.platform

  if (platform === 'Meta Ads') {
    const { collectMetaAds } = await import('../_shared/collectors/meta.ts')
    await collectMetaAds(supabase, integration, accessToken, startDate, endDate, collectionType)
  } else if (platform === 'Google Ads') {
    const { collectGoogleAds } = await import('../_shared/collectors/google.ts')
    await collectGoogleAds(supabase, integration, accessToken, startDate, endDate)
  } else if (platform === 'Naver Ads') {
    const { collectNaverAds } = await import('../_shared/collectors/naver.ts')
    await collectNaverAds(supabase, integration, accessToken, startDate, endDate)
  } else {
    throw new Error(`Unsupported platform: ${platform}`)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  }
}

function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
  })
}
