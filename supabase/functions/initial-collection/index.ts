// initial-collection Edge Function
// 초기 연동 전용 오케스트레이터: 청크별 개별 호출로 타임아웃 방지

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface InitialCollectionRequest {
  integration_id: string
  start_date: string
  end_date: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body: InitialCollectionRequest = await req.json()

    const { integration_id, start_date, end_date } = body

    if (!integration_id || !start_date || !end_date) {
      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    // Integration 조회
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integration_id)
      .is('deleted_at', null)
      .single()

    if (intError || !integration) {
      console.error('Integration lookup error:', intError)
      return jsonResponse({
        error: 'Integration not found',
        details: intError?.message,
        integration_id
      }, 404)
    }

    const platform = integration.platform

    // 즉시 202 Accepted 응답 반환 (백그라운드 처리)
    console.log(`Accepted initial collection request for ${platform}`)

    // 백그라운드 작업 시작 (await 없이)
    executeBackgroundCollection(integration_id, start_date, end_date, platform, supabase)
      .catch(error => console.error('Background collection error:', error))

    return jsonResponse({
      success: true,
      message: '데이터 수집이 시작되었습니다',
      integration_id,
      platform
    }, 202)

  } catch (error) {
    console.error('Initial collection error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})

// 백그라운드 수집 실행 (청크별 개별 호출)
async function executeBackgroundCollection(
  integrationId: string,
  startDate: string,
  endDate: string,
  platform: string,
  supabase: any
) {
  try {
    // Platform Config 조회
    const { data: platformConfig } = await supabase
      .from('platform_configs')
      .select('*')
      .eq('platform', platform)
      .single()

    if (!platformConfig) {
      throw new Error('Platform config not found')
    }

    if (platform === 'Meta Ads') {
      // Meta: 3단계 처리 (광고 → 연령대 → 크리에이티브)
      console.log('Starting Meta Ads initial collection')

      // Step 1: 광고 데이터 수집 (의존성 없음)
      const adsJob = await processCollectionWithChunks(
        supabase,
        integrationId,
        startDate,
        endDate,
        'ads',
        platformConfig.chunk_size_days,
        'Meta 광고',
        null
      )

      // Step 2: 연령대 수집 (광고 완료 후)
      const demoJob = await processCollectionWithChunks(
        supabase,
        integrationId,
        startDate,
        endDate,
        'demographics',
        platformConfig.demographics_chunk_size_days || platformConfig.chunk_size_days,
        'Meta 연령대',
        adsJob.id
      )

      // Step 3: 크리에이티브 수집 (연령대 완료 후)
      await processCollectionWithChunks(
        supabase,
        integrationId,
        startDate,
        endDate,
        'creatives',
        9999, // 크리에이티브는 청크 없이 전체 기간 1번 호출
        'Meta 크리에이티브',
        demoJob.id
      )

    } else if (platform === 'Google Ads' || platform === 'Naver Ads') {
      // Google/Naver: 광고 데이터만 수집
      console.log(`Starting ${platform} initial collection`)

      await processCollectionWithChunks(
        supabase,
        integrationId,
        startDate,
        endDate,
        'ads',
        platformConfig.chunk_size_days,
        platform
      )
    }

    // 최종 상태 업데이트
    await supabase
      .from('integrations')
      .update({
        data_collection_status: 'success',
        last_collection_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)

    console.log('Background collection completed successfully')

  } catch (error) {
    console.error('Background collection failed:', error)
    await supabase
      .from('integrations')
      .update({
        data_collection_status: 'error',
        last_error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)
  }
}

// 청크별 수집 처리 (1개 job 생성 + 청크별 개별 호출)
async function processCollectionWithChunks(
  supabase: any,
  integrationId: string,
  startDate: string,
  endDate: string,
  collectionType: string,
  chunkSizeDays: number,
  jobName: string,
  dependsOnJobId: string | null = null
) {
  // 청크 계산
  const chunks = calculateDateChunks(startDate, endDate, chunkSizeDays)
  console.log(`${jobName}: ${chunks.length} chunks`)

  // Integration에서 advertiser_id 조회
  const { data: integration } = await supabase
    .from('integrations')
    .select('advertiser_id, platform')
    .eq('id', integrationId)
    .single()

  if (!integration) {
    throw new Error('Integration not found')
  }

  // 1개 Job 생성 (전체 기간)
  const { data: job, error: jobError } = await supabase
    .from('collection_jobs')
    .insert({
      advertiser_id: integration.advertiser_id,
      platform: integration.platform,
      collection_type: collectionType,
      start_date: startDate,
      end_date: endDate,
      mode: 'initial',
      status: 'pending',
      chunks_total: chunks.length,
      chunks_completed: 0,
      chunks_failed: 0,
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  if (jobError || !job) {
    throw new Error(`Failed to create collection job: ${jobError?.message}`)
  }

  // 청크를 collection_queue에 INSERT (의존성 포함)
  const queueInserts = chunks.map((chunk, index) => ({
    job_id: job.id,
    integration_id: integrationId,
    chunk_index: index,
    start_date: chunk.start,
    end_date: chunk.end,
    collection_type: collectionType,
    status: 'pending',
    depends_on_job_id: dependsOnJobId
  }))

  const { error: queueError } = await supabase
    .from('collection_queue')
    .insert(queueInserts)

  if (queueError) {
    throw new Error(`Failed to enqueue chunks: ${queueError.message}`)
  }

  console.log(`${jobName}: ${chunks.length} chunks enqueued to collection_queue${dependsOnJobId ? ` (depends on job ${dependsOnJobId})` : ''}`)

  return job
}

// 날짜 청크 계산
function calculateDateChunks(startDate: string, endDate: string, chunkSizeDays: number): Array<{start: string, end: string}> {
  const chunks: Array<{start: string, end: string}> = []
  const start = new Date(startDate)
  const end = new Date(endDate)

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

  return chunks
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
