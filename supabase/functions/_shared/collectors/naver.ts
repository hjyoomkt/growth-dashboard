// Naver Ads 수집기 (완전 재작성)
// 기존 앱스스크립트 방식 기준으로 재구현
// 작성일: 2026-01-24
// 수집 레벨: AdGroup (광고그룹)
// 인증 방식: X-API-KEY + X-Customer + endpoint signature

export async function collectNaverAds(
  supabase: any,
  integration: any,
  accessToken: string, // 사용하지 않음 (조직 설정에서 직접 조회)
  startDate: string,
  endDate: string
) {
  console.log(`=== Naver Ads Collection Started ===`)
  console.log(`Period: ${startDate} to ${endDate}`)
  console.log(`Integration ID: ${integration.id}`)

  // 1. 자격증명 조회
  const customerId = integration.legacy_account_id
  if (!customerId) {
    throw new Error('Naver Customer ID is missing in integration.legacy_account_id')
  }

  // API Key와 Secret Key는 조직에서 조회
  const advertiser = await supabase
    .from('advertisers')
    .select('organization_id')
    .eq('id', integration.advertiser_id)
    .single()

  if (!advertiser.data) {
    throw new Error('Advertiser not found for integration')
  }

  const { data: orgCreds } = await supabase.rpc('get_organization_naver_credentials', {
    org_id: advertiser.data.organization_id
  })

  if (!orgCreds || orgCreds.length === 0 || !orgCreds[0].api_key || !orgCreds[0].secret_key) {
    throw new Error('Naver API Key or Secret Key is missing in organization settings')
  }

  const apiKey = orgCreds[0].api_key
  const secretKey = orgCreds[0].secret_key

  console.log(`Credentials loaded: Customer ID = ${customerId}`)

  // 2. 캠페인 목록 조회
  console.log('Fetching campaign list...')
  const campaigns = await callNaverAPI('/ncc/campaigns', 'GET', null, apiKey, secretKey, customerId)

  if (!campaigns || !Array.isArray(campaigns)) {
    console.log('No campaigns found')
    return
  }

  console.log(`Total campaigns: ${campaigns.length}`)

  let totalRecords = 0

  // 3. 각 캠페인의 광고그룹 조회 및 통계 수집
  for (let campIndex = 0; campIndex < campaigns.length; campIndex++) {
    const campaign = campaigns[campIndex]
    console.log(`[${campIndex + 1}/${campaigns.length}] Campaign: ${campaign.name} (ID: ${campaign.nccCampaignId})`)

    // 광고그룹 목록 조회
    const adgroups = await callNaverAPI(
      `/ncc/adgroups?nccCampaignId=${campaign.nccCampaignId}`,
      'GET',
      null,
      apiKey,
      secretKey,
      customerId
    )

    if (!adgroups || !Array.isArray(adgroups) || adgroups.length === 0) {
      console.log(`  └ No adgroups found`)
      continue
    }

    console.log(`  └ Adgroups: ${adgroups.length}`)

    // 각 광고그룹의 통계 조회
    for (const adgroup of adgroups) {
      const fields = encodeURIComponent('["impCnt","clkCnt","salesAmt","ctr","cpc","avgRnk","ccnt","convAmt"]')
      const timeRange = encodeURIComponent(JSON.stringify({ since: startDate, until: endDate }))

      const stats = await callNaverAPI(
        `/stats?id=${adgroup.nccAdgroupId}&fields=${fields}&timeRange=${timeRange}&timeIncrement=1`,
        'GET',
        null,
        apiKey,
        secretKey,
        customerId
      )

      // 통계 데이터 저장
      // timeIncrement=1 사용 시: stats.dailyStat.data[]
      // fallback: stats.data[] (호환성 유지)
      const dailyData = stats?.dailyStat?.data || stats?.data || []

      if (Array.isArray(dailyData) && dailyData.length > 0) {
        for (const s of dailyData) {
          // 데이터가 있는 경우만 저장 (노출, 클릭, 전환 중 하나라도 있으면 저장)
          if ((s.impCnt || 0) > 0 || (s.clkCnt || 0) > 0 || (s.ccnt || 0) > 0) {
            const rowData = {
              advertiser_id: integration.advertiser_id,
              source: 'Naver',
              ad_id: adgroup.nccAdgroupId, // 광고그룹 ID
              date: s.dateStart || startDate, // dailyStat에서 날짜 추출, fallback to request date
              campaign_name: campaign.name || '',
              ad_group_name: adgroup.name || '',
              ad_name: '', // 광고그룹 레벨이므로 빈 문자열
              cost: parseFloat(s.salesAmt) || 0,
              impressions: parseInt(s.impCnt) || 0,
              clicks: parseInt(s.clkCnt) || 0,
              conversions: parseFloat(s.ccnt) || 0,
              conversion_value: parseFloat(s.convAmt) || 0,
              cpc: parseFloat(s.cpc) || null, // 네이버 고유 지표
              avg_rank: parseFloat(s.avgRnk) || null, // 네이버 고유 지표
              add_to_cart: 0, // 네이버는 장바구니 데이터 없음
              add_to_cart_value: 0,
              collected_at: new Date().toISOString(),
              issue_status: (!campaign.name || !adgroup.name) ? '캠페인명/광고그룹명 누락' : '정상'
            }

            const { error } = await supabase
              .from('ad_performance')
              .upsert(rowData, {
                onConflict: 'advertiser_id,source,ad_id,date'
              })

            if (error) {
              console.error(`Error upserting data for adgroup ${adgroup.nccAdgroupId}:`, error)
              // 에러가 발생해도 계속 진행
            } else {
              totalRecords++
            }
          }
        }
      }

      // Rate limit 대기 (네이버 API는 2000ms 권장)
      await delay(100)
    }
  }

  console.log(`=== Naver Ads Collection Completed ===`)
  console.log(`Total records saved: ${totalRecords}`)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 네이버 API 호출 함수
 * 기존 앱스스크립트 방식과 동일한 인증 방식 사용
 */
async function callNaverAPI(
  endpoint: string,
  method: string,
  body: any,
  apiKey: string,
  secretKey: string,
  customerId: string
): Promise<any> {
  const timestamp = Date.now().toString()
  const signature = await generateSignature(timestamp, method, endpoint, secretKey)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': timestamp,
    'X-API-KEY': apiKey,
    'X-Customer': customerId,
    'X-Signature': signature
  }

  const options: RequestInit = {
    method,
    headers
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`https://api.searchad.naver.com${endpoint}`, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Naver API error [${response.status}]: ${errorText}`)
      console.error(`Endpoint: ${endpoint}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error)
    return null
  }
}

/**
 * Signature 생성 함수 (기존 앱스스크립트 방식)
 * message = timestamp + "." + method + "." + endpoint (쿼리 제외)
 * signature = base64(HMAC-SHA256(message, secretKey))
 */
async function generateSignature(
  timestamp: string,
  method: string,
  endpoint: string,
  secretKey: string
): Promise<string> {
  // 엔드포인트에서 쿼리 파라미터 제거
  const endpointPath = endpoint.split('?')[0]
  const message = `${timestamp}.${method}.${endpointPath}`

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const messageData = encoder.encode(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const signatureArray = Array.from(new Uint8Array(signature))

  // Base64 인코딩 (앱스스크립트 방식과 동일)
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray))

  return signatureBase64
}

/**
 * 대기 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
