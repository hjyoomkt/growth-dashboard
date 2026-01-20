// Google Ads 수집기
// API v22 기준, Ad 레벨 우선 수집 (ad_group_ad)
// P-MAX는 Ad가 없으므로 AssetGroup으로 Fallback
// 전환 데이터: 전환 발생일 기준 (conversions_by_conversion_date)

export async function collectGoogleAds(
  supabase: any,
  integration: any,
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const customerId = integration.legacy_customer_id
  const managerAccountId = integration.legacy_manager_account_id
  const developerToken = await getDecryptedToken(supabase, integration.id, 'developer_token')
  const conversionActionIds = integration.legacy_target_conversion_action_id || []

  if (!customerId || !developerToken) {
    throw new Error('Google Ads credentials are missing')
  }

  console.log(`Collecting Google Ads: ${startDate} to ${endDate}`)
  console.log(`Conversion Actions: ${conversionActionIds.join(', ')}`)

  // 1. 노출/클릭/비용 수집 (전환 데이터 제외)
  const metricsData = await collectGoogleMetrics(
    accessToken,
    customerId,
    managerAccountId,
    developerToken,
    startDate,
    endDate
  )

  // 2. 전환 데이터 수집 (전환액션별, 전환 발생일 기준)
  const conversionsData = await collectGoogleConversions(
    accessToken,
    customerId,
    managerAccountId,
    developerToken,
    startDate,
    endDate,
    conversionActionIds
  )

  // 3. 데이터 병합 및 저장
  await saveGoogleAdsData(supabase, integration, metricsData, conversionsData)

  // 4. P-MAX Asset Group 수집 (Ad가 없는 캠페인)
  await collectGoogleAssetGroups(
    supabase,
    integration,
    accessToken,
    customerId,
    managerAccountId,
    developerToken,
    startDate,
    endDate,
    conversionActionIds
  )

  console.log(`Google Ads data saved successfully`)
}

// ============================================================================
// 1. 노출/클릭/비용 수집 (Ad 레벨)
// ============================================================================
async function collectGoogleMetrics(
  accessToken: string,
  customerId: string,
  managerAccountId: string | null,
  developerToken: string,
  startDate: string,
  endDate: string
): Promise<Map<string, any>> {
  console.log(`Collecting Google Ads metrics (impressions, clicks, cost)`)

  // GAQL 쿼리: Ad 레벨, 전환 데이터 제외
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
      metrics.cost_micros
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

  const responseText = await response.text()
  const allResults = parseGoogleAdsResponse(responseText)

  console.log(`Total Google Ads metrics records: ${allResults.length}`)

  // Map으로 변환: key = adId_date
  const metricsMap = new Map<string, any>()
  for (const row of allResults) {
    const adId = row.adGroupAd?.ad?.id || null
    const adGroupId = row.adGroup?.id || null
    const campaignId = row.campaign?.id || null
    const finalId = adId || adGroupId || campaignId || 'unknown'
    const date = row.segments?.date || startDate

    const key = `${finalId}_${date}`
    metricsMap.set(key, {
      ad_id: String(finalId),
      date: date,
      campaign_id: campaignId,
      campaign_name: row.campaign?.name || '',
      ad_group_id: adGroupId,
      ad_group_name: row.adGroup?.name || '',
      ad_name: row.adGroupAd?.ad?.name || '',
      impressions: row.metrics?.impressions || 0,
      clicks: row.metrics?.clicks || 0,
      cost: row.metrics?.costMicros ? row.metrics.costMicros / 1000000 : 0
    })
  }

  return metricsMap
}

// ============================================================================
// 2. 전환 데이터 수집 (전환액션별, 전환 발생일 기준)
// ============================================================================
async function collectGoogleConversions(
  accessToken: string,
  customerId: string,
  managerAccountId: string | null,
  developerToken: string,
  startDate: string,
  endDate: string,
  conversionActionIds: string[]
): Promise<Map<string, any>> {
  const conversionsMap = new Map<string, any>()

  if (!conversionActionIds || conversionActionIds.length === 0) {
    console.log('No conversion actions configured, skipping conversion data collection')
    return conversionsMap
  }

  console.log(`Collecting conversion data for ${conversionActionIds.length} actions`)

  for (const conversionActionId of conversionActionIds) {
    console.log(`Collecting conversions for action: ${conversionActionId}`)

    const conversionActionResourceName = `customers/${customerId}/conversionActions/${conversionActionId}`

    // Ad 레벨 전환 데이터
    const adConversions = await fetchConversionData(
      accessToken,
      customerId,
      managerAccountId,
      developerToken,
      startDate,
      endDate,
      conversionActionResourceName,
      'ad_group_ad'
    )

    // 전환 데이터 합산
    for (const [key, data] of Array.from(adConversions.entries())) {
      if (conversionsMap.has(key)) {
        const existing = conversionsMap.get(key)
        existing.conversions += data.conversions
        existing.conversions_value += data.conversions_value
      } else {
        conversionsMap.set(key, {
          conversions: data.conversions,
          conversions_value: data.conversions_value
        })
      }
    }
  }

  console.log(`Total conversion data entries: ${conversionsMap.size}`)
  return conversionsMap
}

// ============================================================================
// 전환 데이터 Fetch (Ad/AdGroup/Campaign 레벨)
// ============================================================================
async function fetchConversionData(
  accessToken: string,
  customerId: string,
  managerAccountId: string | null,
  developerToken: string,
  startDate: string,
  endDate: string,
  conversionActionResourceName: string,
  resourceType: 'ad_group_ad' | 'ad_group' | 'campaign'
): Promise<Map<string, any>> {
  const conversionsMap = new Map<string, any>()

  let gaqlQuery = ''
  if (resourceType === 'ad_group_ad') {
    gaqlQuery = `
      SELECT
        campaign.id,
        ad_group.id,
        ad_group_ad.ad.id,
        segments.date,
        segments.conversion_action,
        metrics.conversions_by_conversion_date,
        metrics.conversions_value_by_conversion_date
      FROM ad_group_ad
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND segments.conversion_action = '${conversionActionResourceName}'
    `
  } else if (resourceType === 'ad_group') {
    gaqlQuery = `
      SELECT
        campaign.id,
        ad_group.id,
        segments.date,
        segments.conversion_action,
        metrics.conversions_by_conversion_date,
        metrics.conversions_value_by_conversion_date
      FROM ad_group
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND segments.conversion_action = '${conversionActionResourceName}'
    `
  } else {
    gaqlQuery = `
      SELECT
        campaign.id,
        segments.date,
        segments.conversion_action,
        metrics.conversions_by_conversion_date,
        metrics.conversions_value_by_conversion_date
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND segments.conversion_action = '${conversionActionResourceName}'
    `
  }

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
    console.error(`Conversion data API error (${resourceType}):`, errorText)
    return conversionsMap
  }

  const responseText = await response.text()
  const allResults = parseGoogleAdsResponse(responseText)

  for (const row of allResults) {
    const adId = row.adGroupAd?.ad?.id || null
    const adGroupId = row.adGroup?.id || null
    const campaignId = row.campaign?.id || null
    const finalId = adId || adGroupId || campaignId || 'unknown'
    const date = row.segments?.date || startDate

    const key = `${finalId}_${date}`
    conversionsMap.set(key, {
      conversions: row.metrics?.conversionsByConversionDate || 0,
      conversions_value: row.metrics?.conversionsValueByConversionDate || 0
    })
  }

  return conversionsMap
}

// ============================================================================
// 3. 데이터 병합 및 저장
// ============================================================================
async function saveGoogleAdsData(
  supabase: any,
  integration: any,
  metricsData: Map<string, any>,
  conversionsData: Map<string, any>
) {
  console.log(`Saving Google Ads data: ${metricsData.size} records`)

  for (const [key, metrics] of Array.from(metricsData.entries())) {
    const conversions = conversionsData.get(key) || { conversions: 0, conversions_value: 0 }

    const rowData = {
      advertiser_id: integration.advertiser_id,
      source: 'Google',
      ad_id: metrics.ad_id,
      date: metrics.date,
      campaign_name: metrics.campaign_name,
      ad_group_name: metrics.ad_group_name,
      ad_name: metrics.ad_name,
      cost: metrics.cost,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      conversions: conversions.conversions,
      conversion_value: conversions.conversions_value,
      add_to_cart: 0,
      add_to_cart_value: 0,
      collected_at: new Date().toISOString(),
      issue_status: (!metrics.campaign_name || !metrics.ad_name) ? '캠페인명/광고명 누락' : '정상'
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
  endDate: string,
  conversionActionIds: string[]
) {
  console.log(`Collecting Google Asset Groups (P-MAX): ${startDate} to ${endDate}`)

  // 1. Asset Group 노출/클릭/비용
  const metricsData = await collectAssetGroupMetrics(
    accessToken,
    customerId,
    managerAccountId,
    developerToken,
    startDate,
    endDate
  )

  // 2. Asset Group 전환 데이터
  const conversionsData = await collectAssetGroupConversions(
    accessToken,
    customerId,
    managerAccountId,
    developerToken,
    startDate,
    endDate,
    conversionActionIds
  )

  // 3. 데이터 병합 및 저장
  await saveAssetGroupData(supabase, integration, metricsData, conversionsData)

  console.log(`Google Asset Groups saved successfully`)
}

async function collectAssetGroupMetrics(
  accessToken: string,
  customerId: string,
  managerAccountId: string | null,
  developerToken: string,
  startDate: string,
  endDate: string
): Promise<Map<string, any>> {
  const gaqlQuery = `
    SELECT
      campaign.id,
      campaign.name,
      asset_group.id,
      asset_group.name,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros
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
    return new Map()
  }

  const responseText = await response.text()
  const allResults = parseGoogleAdsResponse(responseText)

  console.log(`Total Asset Groups collected: ${allResults.length}`)

  const metricsMap = new Map<string, any>()
  for (const row of allResults) {
    const assetGroupId = row.assetGroup?.id || 'unknown'
    const date = row.segments?.date || startDate
    const key = `${assetGroupId}_${date}`

    metricsMap.set(key, {
      ad_id: String(assetGroupId),
      date: date,
      campaign_name: row.campaign?.name || '',
      ad_group_name: row.assetGroup?.name || '',
      ad_name: '',
      impressions: row.metrics?.impressions || 0,
      clicks: row.metrics?.clicks || 0,
      cost: row.metrics?.costMicros ? row.metrics.costMicros / 1000000 : 0
    })
  }

  return metricsMap
}

async function collectAssetGroupConversions(
  accessToken: string,
  customerId: string,
  managerAccountId: string | null,
  developerToken: string,
  startDate: string,
  endDate: string,
  conversionActionIds: string[]
): Promise<Map<string, any>> {
  const conversionsMap = new Map<string, any>()

  if (!conversionActionIds || conversionActionIds.length === 0) {
    return conversionsMap
  }

  for (const conversionActionId of conversionActionIds) {
    const conversionActionResourceName = `customers/${customerId}/conversionActions/${conversionActionId}`

    const gaqlQuery = `
      SELECT
        asset_group.id,
        segments.date,
        segments.conversion_action,
        metrics.conversions_by_conversion_date,
        metrics.conversions_value_by_conversion_date
      FROM asset_group
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND segments.conversion_action = '${conversionActionResourceName}'
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
      console.error(`Asset Group conversion API error for action ${conversionActionId}`)
      continue
    }

    const responseText = await response.text()
    const allResults = parseGoogleAdsResponse(responseText)

    for (const row of allResults) {
      const assetGroupId = row.assetGroup?.id || 'unknown'
      const date = row.segments?.date || startDate
      const key = `${assetGroupId}_${date}`

      if (conversionsMap.has(key)) {
        const existing = conversionsMap.get(key)
        existing.conversions += row.metrics?.conversionsByConversionDate || 0
        existing.conversions_value += row.metrics?.conversionsValueByConversionDate || 0
      } else {
        conversionsMap.set(key, {
          conversions: row.metrics?.conversionsByConversionDate || 0,
          conversions_value: row.metrics?.conversionsValueByConversionDate || 0
        })
      }
    }
  }

  return conversionsMap
}

async function saveAssetGroupData(
  supabase: any,
  integration: any,
  metricsData: Map<string, any>,
  conversionsData: Map<string, any>
) {
  for (const [key, metrics] of Array.from(metricsData.entries())) {
    const conversions = conversionsData.get(key) || { conversions: 0, conversions_value: 0 }

    const rowData = {
      advertiser_id: integration.advertiser_id,
      source: 'Google',
      ad_id: metrics.ad_id,
      date: metrics.date,
      campaign_name: metrics.campaign_name,
      ad_group_name: metrics.ad_group_name,
      ad_name: metrics.ad_name,
      cost: metrics.cost,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      conversions: conversions.conversions,
      conversion_value: conversions.conversions_value,
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
}

// ============================================================================
// Helper Functions
// ============================================================================
function parseGoogleAdsResponse(responseText: string): any[] {
  let allResults: any[] = []

  try {
    // 전체 JSON 배열로 파싱 시도
    const jsonArray = JSON.parse(responseText)
    if (Array.isArray(jsonArray)) {
      // 배열 형태: [{"results": [...]}, {"results": [...]}]
      for (const item of jsonArray) {
        if (item.results && Array.isArray(item.results)) {
          allResults = allResults.concat(item.results)
        }
      }
    } else if (jsonArray.results && Array.isArray(jsonArray.results)) {
      // 단일 객체: {"results": [...]}
      allResults = jsonArray.results
    }
  } catch {
    // 전체 파싱 실패 시 newline-delimited JSON으로 시도
    const lines = responseText.trim().split('\n').filter(line => line.trim())
    for (const line of lines) {
      try {
        const json = JSON.parse(line)
        if (json.results && Array.isArray(json.results)) {
          allResults = allResults.concat(json.results)
        }
      } catch {
        // 개별 라인 파싱 실패는 무시
      }
    }
  }

  return allResults
}

async function getDecryptedToken(supabase: any, integrationId: string, tokenType: string): Promise<string | null> {
  if (!integrationId || !tokenType) return null

  const { data, error } = await supabase
    .rpc('get_decrypted_token', {
      p_api_token_id: integrationId,
      p_token_type: tokenType
    })

  if (error) {
    console.error('Failed to retrieve decrypted token:', error)
    return null
  }

  return data || null
}
