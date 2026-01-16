// Google Ads 수집기
// API v22 기준, Ad 레벨 우선 수집 (ad_group_ad)
// P-MAX는 Ad가 없으므로 AssetGroup으로 Fallback

export async function collectGoogleAds(
  supabase: any,
  integration: any,
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const customerId = integration.legacy_customer_id
  const managerAccountId = integration.legacy_manager_account_id
  const developerToken = await getVaultSecret(supabase, integration.legacy_developer_token_vault_id)
  const conversionActionIds = integration.legacy_target_conversion_action_id || []

  if (!customerId || !developerToken) {
    throw new Error('Google Ads credentials are missing')
  }

  console.log(`Collecting Google Ads: ${startDate} to ${endDate}`)

  // GAQL 쿼리: Ad 레벨 우선 수집
  const gaqlQuery = `
    SELECT
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND ad_group_ad.status = 'ENABLED'
  `

  const url = `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:searchStream`

  const headers: any = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json'
  }

  if (managerAccountId) {
    headers['login-customer-id'] = managerAccountId
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ query: gaqlQuery })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google Ads API error:', errorText)
    throw new Error(`Google Ads API error: ${response.status} ${errorText}`)
  }

  // Google Ads searchStream은 newline-delimited JSON
  const responseText = await response.text()
  const chunks = responseText.trim().split('\n').filter(line => line.trim())

  let allResults: any[] = []

  for (const chunk of chunks) {
    try {
      const json = JSON.parse(chunk)
      if (json.results && Array.isArray(json.results)) {
        allResults = allResults.concat(json.results)
      }
    } catch (error) {
      console.error('Failed to parse chunk:', error)
    }
  }

  console.log(`Total Google Ads records collected: ${allResults.length}`)

  if (allResults.length === 0) {
    console.log('No Google Ads data for this period')
    return
  }

  // ad_performance 테이블에 저장
  for (const row of allResults) {
    const adId = row.adGroupAd?.ad?.id || null
    const adGroupId = row.adGroup?.id || null
    const campaignId = row.campaign?.id || null

    // Ad ID 우선순위: Ad > AdGroup > Campaign
    let finalId = adId || adGroupId || campaignId || 'unknown'
    let adName = row.adGroupAd?.ad?.name || ''

    const cost = row.metrics?.costMicros ? row.metrics.costMicros / 1000000 : 0
    const impressions = row.metrics?.impressions || 0
    const clicks = row.metrics?.clicks || 0
    const conversions = row.metrics?.conversions || 0
    const conversionValue = row.metrics?.conversionsValue || 0

    const rowData = {
      advertiser_id: integration.advertiser_id,
      source: 'Google',
      ad_id: String(finalId),
      date: row.segments?.date || startDate,
      campaign_name: row.campaign?.name || '',
      ad_group_name: row.adGroup?.name || '',
      ad_name: adName,
      cost: cost,
      impressions: impressions,
      clicks: clicks,
      conversions: conversions,
      conversion_value: conversionValue,
      add_to_cart: 0, // Google Ads는 장바구니 데이터 없음
      add_to_cart_value: 0,
      collected_at: new Date().toISOString(),
      issue_status: (!row.campaign?.name || !adName) ? '캠페인명/광고명 누락' : '정상'
    }

    const { error } = await supabase
      .from('ad_performance')
      .upsert(rowData, {
        onConflict: 'advertiser_id,source,ad_id,date'
      })

    if (error) {
      console.error('Error upserting Google ad data:', error)
      throw new Error(`DB insert error: ${error.message}`)
    }
  }

  // P-MAX Asset Group 수집 (Ad가 없는 캠페인)
  await collectGoogleAssetGroups(
    supabase,
    integration,
    accessToken,
    customerId,
    managerAccountId,
    developerToken,
    startDate,
    endDate
  )

  console.log(`Google Ads data saved successfully`)
}

// ============================================================================
// P-MAX Asset Group 수집 (Fallback)
// ============================================================================
async function collectGoogleAssetGroups(
  supabase: any,
  integration: any,
  accessToken: string,
  customerId: string,
  managerAccountId: string | null,
  developerToken: string,
  startDate: string,
  endDate: string
) {
  console.log(`Collecting Google Asset Groups (P-MAX): ${startDate} to ${endDate}`)

  const gaqlQuery = `
    SELECT
      campaign.id,
      campaign.name,
      asset_group.id,
      asset_group.name,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM asset_group
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `

  const url = `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:searchStream`

  const headers: any = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json'
  }

  if (managerAccountId) {
    headers['login-customer-id'] = managerAccountId
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ query: gaqlQuery })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google Asset Group API error:', errorText)
    // Asset Group 수집 실패는 치명적 에러가 아니므로 리턴
    return
  }

  const responseText = await response.text()
  const chunks = responseText.trim().split('\n').filter(line => line.trim())

  let allResults: any[] = []

  for (const chunk of chunks) {
    try {
      const json = JSON.parse(chunk)
      if (json.results && Array.isArray(json.results)) {
        allResults = allResults.concat(json.results)
      }
    } catch (error) {
      console.error('Failed to parse chunk:', error)
    }
  }

  console.log(`Total Asset Groups collected: ${allResults.length}`)

  if (allResults.length === 0) {
    return
  }

  // ad_performance 테이블에 저장
  for (const row of allResults) {
    const assetGroupId = row.assetGroup?.id || 'unknown'
    const assetGroupName = row.assetGroup?.name || ''

    const cost = row.metrics?.costMicros ? row.metrics.costMicros / 1000000 : 0
    const impressions = row.metrics?.impressions || 0
    const clicks = row.metrics?.clicks || 0
    const conversions = row.metrics?.conversions || 0
    const conversionValue = row.metrics?.conversionsValue || 0

    const rowData = {
      advertiser_id: integration.advertiser_id,
      source: 'Google',
      ad_id: String(assetGroupId),
      date: row.segments?.date || startDate,
      campaign_name: row.campaign?.name || '',
      ad_group_name: assetGroupName,
      ad_name: '', // Asset Group에는 Ad Name이 없음
      cost: cost,
      impressions: impressions,
      clicks: clicks,
      conversions: conversions,
      conversion_value: conversionValue,
      add_to_cart: 0,
      add_to_cart_value: 0,
      collected_at: new Date().toISOString(),
      issue_status: '정상'
    }

    const { error } = await supabase
      .from('ad_performance')
      .upsert(rowData, {
        onConflict: 'advertiser_id,source,ad_id,date'
      })

    if (error) {
      console.error('Error upserting Google asset group data:', error)
    }
  }

  console.log(`Google Asset Groups saved successfully`)
}

// ============================================================================
// Helper Functions
// ============================================================================
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
