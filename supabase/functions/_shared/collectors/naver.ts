// Naver Ads 수집기
// API 30일 제한, X-Signature HMAC-SHA256 인증

export async function collectNaverAds(
  supabase: any,
  integration: any,
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const customerId = integration.legacy_account_id
  const secretKey = await getVaultSecret(supabase, integration.legacy_secret_key_vault_id)

  if (!customerId || !secretKey) {
    throw new Error('Naver Ads credentials are missing')
  }

  console.log(`Collecting Naver Ads: ${startDate} to ${endDate}`)

  // Naver API는 30일 제한이 있으므로 청크가 이미 30일로 분할되어 들어옴
  const url = 'https://api.naver.com/ncc/stats'

  const body = {
    customerId: customerId,
    timeRange: {
      since: startDate,
      until: endDate
    },
    level: 'AD',
    timeIncrement: 'DAILY'
  }

  const timestamp = Date.now().toString()
  const bodyString = JSON.stringify(body)
  const signature = await generateSignature(timestamp, bodyString, secretKey)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature
    },
    body: bodyString
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Naver Ads API error:', errorText)
    throw new Error(`Naver Ads API error: ${response.status} ${errorText}`)
  }

  const json = await response.json()

  if (!json.data || !Array.isArray(json.data)) {
    console.log('No Naver Ads data for this period')
    return
  }

  console.log(`Total Naver Ads records collected: ${json.data.length}`)

  // ad_performance 테이블에 저장
  for (const item of json.data) {
    const cost = parseFloat(item.cost) || 0
    const impressions = parseInt(item.impressions) || 0
    const clicks = parseInt(item.clicks) || 0
    const conversions = parseFloat(item.conversions) || 0
    const conversionValue = parseFloat(item.conversionValue) || 0

    const rowData = {
      advertiser_id: integration.advertiser_id,
      source: 'Naver',
      ad_id: item.adId || 'unknown',
      date: item.date || startDate,
      campaign_name: item.campaignName || '',
      ad_group_name: item.adGroupName || '',
      ad_name: item.adName || '',
      cost: cost,
      impressions: impressions,
      clicks: clicks,
      conversions: conversions,
      conversion_value: conversionValue,
      add_to_cart: 0, // Naver Ads는 장바구니 데이터 없음
      add_to_cart_value: 0,
      collected_at: new Date().toISOString(),
      issue_status: (!item.campaignName || !item.adName) ? '캠페인명/광고명 누락' : '정상'
    }

    const { error } = await supabase
      .from('ad_performance')
      .upsert(rowData, {
        onConflict: 'advertiser_id,source,ad_id,date'
      })

    if (error) {
      console.error('Error upserting Naver ad data:', error)
      throw new Error(`DB insert error: ${error.message}`)
    }
  }

  console.log(`Naver Ads data saved successfully`)
}

// ============================================================================
// Helper Functions
// ============================================================================
async function generateSignature(timestamp: string, body: string, secretKey: string): Promise<string> {
  const message = `${timestamp}.${body}`
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
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return signatureHex
}

async function getVaultSecret(supabase: any, vaultId: string | null): Promise<string | null> {
  if (!vaultId) return null

  const { data, error } = await supabase
    .rpc('vault_get_secret', { secret_id: vaultId })

  if (error) {
    console.error('Failed to retrieve vault secret:', error)
    return null
  }

  return data?.decrypted_secret || null
}
