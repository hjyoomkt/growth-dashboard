// Meta Ads 수집기
// API 버전은 platform_configs.api_version에서 동적으로 가져옴
// 광고 레벨 수집 + Demographics 별도 수집 + 크리에이티브 수집

export async function collectMetaAds(
  supabase: any,
  integration: any,
  accessToken: string,
  startDate: string,
  endDate: string,
  collectionType: string = 'ads',
  apiVersion: string = 'v24.0'
) {
  const accountId = integration.legacy_account_id

  if (!accountId) {
    throw new Error('Meta account_id is missing')
  }

  if (collectionType === 'ads') {
    await collectMetaAdInsights(supabase, integration, accessToken, accountId, startDate, endDate, apiVersion)
  } else if (collectionType === 'demographics') {
    await collectMetaDemographics(supabase, integration, accessToken, accountId, startDate, endDate, apiVersion)
  } else if (collectionType === 'creatives') {
    await collectMetaCreatives(supabase, integration, accessToken, accountId, startDate, endDate, apiVersion)
  } else {
    throw new Error(`Unsupported collection type: ${collectionType}`)
  }
}

// ============================================================================
// 광고 레벨 Insights 수집
// ============================================================================
async function collectMetaAdInsights(
  supabase: any,
  integration: any,
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string,
  apiVersion: string
) {
  console.log(`Collecting Meta Ad Insights: ${startDate} to ${endDate}`)

  const timeRange = JSON.stringify({ since: startDate, until: endDate })
  const attrWindows = JSON.stringify(['7d_click', '1d_view'])

  let url =
    `https://graph.facebook.com/${apiVersion}/act_${accountId}/insights?` +
    `fields=date_start,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,actions,action_values` +
    `&level=ad` +
    `&time_range=${encodeURIComponent(timeRange)}` +
    `&time_increment=1` +
    `&action_attribution_windows=${encodeURIComponent(attrWindows)}` +
    `&access_token=${accessToken}`

  let allData: any[] = []
  let pageCount = 0

  // 페이징 처리
  while (url) {
    pageCount++
    console.log(`Fetching Meta Insights page ${pageCount}`)

    const response = await fetch(url, { method: 'GET' })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Meta API error:', errorText)
      throw new Error(`Meta API error: ${response.status} ${errorText}`)
    }

    const json = await response.json()

    if (json.error) {
      throw new Error(`Meta API error: ${JSON.stringify(json.error)}`)
    }

    if (json.data && json.data.length > 0) {
      allData = allData.concat(json.data)
      console.log(`Page ${pageCount}: ${json.data.length} records`)
    }

    url = json.paging?.next || null
  }

  console.log(`Total Meta Insights collected: ${allData.length}`)

  if (allData.length === 0) {
    console.log('No Meta data for this period')
    return
  }

  // ad_performance 테이블에 저장
  for (const item of allData) {
    const cost = parseFloat(item.spend) || 0
    const impressions = parseInt(item.impressions) || 0
    const linkClicks = getActionValue(item.actions, 'link_click')
    const conversions = getActionValue(item.actions, 'purchase')
    const conversionValue = getActionValue(item.action_values, 'purchase')
    const addToCart = getActionValue(item.actions, 'add_to_cart')
    const addToCartValue = getActionValue(item.action_values, 'add_to_cart')
    const completeRegistrations = getActionValue(item.actions, 'complete_registration')
    const completeRegistrationsValue = getActionValue(item.action_values, 'complete_registration')

    const rowData = {
      advertiser_id: integration.advertiser_id,
      source: 'Meta',
      ad_id: item.ad_id || '',
      date: item.date_start || startDate,
      campaign_name: item.campaign_name || '',
      ad_group_name: item.adset_name || '',
      ad_name: item.ad_name || '',
      cost: cost,
      impressions: impressions,
      clicks: linkClicks,
      conversions: conversions,
      conversion_value: conversionValue,
      add_to_cart: addToCart,
      add_to_cart_value: addToCartValue,
      complete_registrations: completeRegistrations,
      complete_registrations_value: completeRegistrationsValue,
      collected_at: new Date().toISOString(),
      issue_status: (!item.campaign_name || !item.ad_name) ? '캠페인명/광고명 누락' : '정상'
    }

    // UPSERT (conflict on advertiser_id, source, ad_id, date)
    const { error } = await supabase
      .from('ad_performance')
      .upsert(rowData, {
        onConflict: 'advertiser_id,source,ad_id,date'
      })

    if (error) {
      console.error('Error upserting Meta ad data:', error)
      throw new Error(`DB insert error: ${error.message}`)
    }
  }

  console.log(`Meta Ad Insights saved successfully`)

  // Destination URL 수집 및 저장 (ad_performance 저장 완료 후 실행, 에러 발생해도 영향 없음)
  try {
    const uniqueAdIds = Array.from(new Set(allData.map(item => item.ad_id).filter(Boolean)))
    await fetchAndSaveDestinationUrls(
      supabase,
      integration.advertiser_id,
      uniqueAdIds,
      accessToken,
      apiVersion
    )
  } catch (error) {
    console.error('Destination URL collection failed (non-critical):', error)
    // 에러를 throw하지 않음 - ad_performance 저장에는 영향 없음
  }
}

// ============================================================================
// Demographics 수집 (성별/연령대)
// ============================================================================
async function collectMetaDemographics(
  supabase: any,
  integration: any,
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string,
  apiVersion: string
) {
  console.log(`Collecting Meta Demographics: ${startDate} to ${endDate}`)

  const timeRange = JSON.stringify({ since: startDate, until: endDate })
  const attrWindows = JSON.stringify(['7d_click', '1d_view'])

  let url =
    `https://graph.facebook.com/${apiVersion}/act_${accountId}/insights?` +
    `fields=date_start,spend,impressions,actions,action_values` +
    `&level=account` +
    `&breakdowns=age,gender` +
    `&time_range=${encodeURIComponent(timeRange)}` +
    `&time_increment=1` +
    `&action_attribution_windows=${encodeURIComponent(attrWindows)}` +
    `&access_token=${accessToken}`

  let allData: any[] = []
  let pageCount = 0

  while (url) {
    pageCount++
    console.log(`Fetching Meta Demographics page ${pageCount}`)

    const response = await fetch(url, { method: 'GET' })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Meta Demographics API error:', errorText)
      throw new Error(`Meta Demographics API error: ${response.status} ${errorText}`)
    }

    const json = await response.json()

    if (json.error) {
      throw new Error(`Meta Demographics API error: ${JSON.stringify(json.error)}`)
    }

    if (json.data && json.data.length > 0) {
      allData = allData.concat(json.data)
      console.log(`Demographics page ${pageCount}: ${json.data.length} records`)
    }

    url = json.paging?.next || null
  }

  console.log(`Total Meta Demographics collected: ${allData.length}`)

  if (allData.length === 0) {
    console.log('No Meta Demographics data for this period')
    return
  }

  // ad_performance_demographics 테이블에 저장
  for (const item of allData) {
    const cost = parseFloat(item.spend) || 0
    const impressions = parseInt(item.impressions) || 0
    const clicks = getActionValue(item.actions, 'link_click')
    const conversions = getActionValue(item.actions, 'purchase')
    const conversionValue = getActionValue(item.action_values, 'purchase')
    const addToCart = getActionValue(item.actions, 'add_to_cart')
    const addToCartValue = getActionValue(item.action_values, 'add_to_cart')
    const completeRegistrations = getActionValue(item.actions, 'complete_registration')
    const completeRegistrationsValue = getActionValue(item.action_values, 'complete_registration')

    const rowData = {
      advertiser_id: integration.advertiser_id,
      source: 'Meta',
      date: item.date_start || startDate,
      gender: item.gender || 'unknown',
      age: item.age || 'unknown',
      impressions: impressions,
      clicks: clicks,
      cost: cost,
      conversions: conversions,
      conversion_value: conversionValue,
      add_to_cart: addToCart,
      add_to_cart_value: addToCartValue,
      complete_registrations: completeRegistrations,
      complete_registrations_value: completeRegistrationsValue
    }

    const { error } = await supabase
      .from('ad_performance_demographics')
      .upsert(rowData, {
        onConflict: 'advertiser_id,source,date,gender,age'
      })

    if (error) {
      console.error('Error upserting Meta demographics:', error)
      throw new Error(`DB insert error: ${error.message}`)
    }
  }

  console.log(`Meta Demographics saved successfully`)
}

// ============================================================================
// 크리에이티브 수집 (Apps Script 동일화)
// ============================================================================
async function collectMetaCreatives(
  supabase: any,
  integration: any,
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string,
  apiVersion: string
) {
  console.log(`Collecting Meta Creatives: ${startDate} to ${endDate}`)

  // Step 1: 광고 목록 조회 (campaign_id, adset_id 포함)
  const filterParam = encodeURIComponent('[{"field":"ad.effective_status","operator":"IN","value":["ACTIVE","PAUSED","DELETED","ARCHIVED"]}]')
  let adsUrl =
    `https://graph.facebook.com/${apiVersion}/act_${accountId}/ads?` +
    `fields=id,campaign_id,adset_id` +
    `&filtering=${filterParam}` +
    `&limit=500&access_token=${accessToken}`

  const allAds: any[] = []
  let pageCount = 0

  while (adsUrl) {
    pageCount++
    console.log(`Fetching ads page ${pageCount}`)

    const response = await fetch(adsUrl, { method: 'GET' })
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Ads API error:', errorText)
      throw new Error(`Ads API error: ${response.status}`)
    }

    const json = await response.json()
    if (json.data && json.data.length > 0) {
      allAds.push(...json.data)
    }

    adsUrl = json.paging?.next || null
    if (adsUrl) await delay(100)
  }

  console.log(`Total ads collected: ${allAds.length}`)

  if (allAds.length === 0) {
    console.log('No ads found')
    return
  }

  const campaignIds = Array.from(new Set(allAds.map(ad => ad.campaign_id)))
  const adsetIds = Array.from(new Set(allAds.map(ad => ad.adset_id)))
  const adIds = allAds.map(ad => ad.id)

  // Step 2: 이름 조회 (batch API)
  console.log('Fetching names via batch API...')
  const campaignNames = await batchGetNames(campaignIds, accessToken, apiVersion)
  const adsetNames = await batchGetNames(adsetIds, accessToken, apiVersion)
  const adNames = await batchGetNames(adIds, accessToken, apiVersion)
  console.log('Names fetched successfully')

  // Step 3: 광고-캠페인-광고그룹 매핑
  const adMapping: Record<string, { campaignId: string; adsetId: string }> = {}
  allAds.forEach(ad => {
    adMapping[ad.id] = {
      campaignId: ad.campaign_id,
      adsetId: ad.adset_id
    }
  })

  // Step 4: 크리에이티브 정보 수집 (batch API)
  console.log('Fetching creative info via batch API...')
  const creativeData: Record<string, any> = {}
  const imageHashesSet: Set<string> = new Set()
  const videoIdsSet: Set<string> = new Set()

  const batchSize = 50
  for (let i = 0; i < adIds.length; i += batchSize) {
    const batch = adIds.slice(i, i + batchSize)

    const batchRequests = batch.map(adId => ({
      method: 'GET',
      relative_url: `${adId}?fields=creative{asset_feed_spec,object_story_spec,thumbnail_url}`
    }))

    const batchResponse = await fetch(`https://graph.facebook.com/${apiVersion}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `access_token=${accessToken}&batch=${encodeURIComponent(JSON.stringify(batchRequests))}`
    })

    const batchResults = await batchResponse.json()

    batchResults.forEach((res: any, index: number) => {
      if (res.code === 200) {
        const body = JSON.parse(res.body)
        const adId = batch[index]

        if (body.creative) {
          creativeData[adId] = body.creative
          const creative = body.creative

          // 비디오 ID 수집
          if (creative.object_story_spec?.video_data?.video_id) {
            videoIdsSet.add(creative.object_story_spec.video_data.video_id)
          }
          if (creative.asset_feed_spec?.videos?.length > 0) {
            const videoId = creative.asset_feed_spec.videos[0].video_id
            if (videoId) videoIdsSet.add(videoId)
          }

          // 이미지 해시 수집
          if (creative.asset_feed_spec?.images?.length > 0) {
            creative.asset_feed_spec.images.forEach((img: any) => {
              if (img.hash) imageHashesSet.add(img.hash)
            })
          }
          if (creative.object_story_spec?.link_data?.child_attachments?.length > 0) {
            creative.object_story_spec.link_data.child_attachments.forEach((child: any) => {
              if (child.image_hash) imageHashesSet.add(child.image_hash)
            })
          }
          if (creative.object_story_spec?.link_data?.image_hash) {
            imageHashesSet.add(creative.object_story_spec.link_data.image_hash)
          }
        }
      }
    })

    console.log(`Creative batch: ${Math.min(i + batchSize, adIds.length)}/${adIds.length}`)
    if (i + batchSize < adIds.length) await delay(100)
  }

  // Step 5: adimages API 호출 (1:1 비율만)
  const imageMap: Record<string, { url: string; width: number; height: number }> = {}
  const imageHashes = Array.from(imageHashesSet)

  if (imageHashes.length > 0) {
    console.log('Fetching adimages...')
    const imagesUrl =
      `https://graph.facebook.com/${apiVersion}/act_${accountId}/adimages?` +
      `fields=hash,url,url_128,original_width,original_height` +
      `&limit=1000&access_token=${accessToken}`

    const imagesResponse = await fetch(imagesUrl, { method: 'GET' })
    const imagesData = await imagesResponse.json()

    if (imagesData.data) {
      const hashSet = new Set(imageHashes)
      imagesData.data.forEach((img: any) => {
        if (hashSet.has(img.hash) && img.original_width === img.original_height) {
          // 1:1 비율만 저장
          imageMap[img.hash] = {
            url: img.url || img.url_128,
            width: img.original_width,
            height: img.original_height
          }
        }
      })
      console.log(`Images matched: ${Object.keys(imageMap).length} (1:1 only)`)
    }
  }

  // Step 6: advideos API 호출
  const videoMap: Record<string, { source: string; thumbnail: string | null }> = {}
  const videoIds = Array.from(videoIdsSet)

  if (videoIds.length > 0) {
    console.log('Fetching advideos...')
    const videosUrl =
      `https://graph.facebook.com/${apiVersion}/act_${accountId}/advideos?` +
      `fields=id,source,thumbnails` +
      `&limit=1000&access_token=${accessToken}`

    const videosResponse = await fetch(videosUrl, { method: 'GET' })
    const videosData = await videosResponse.json()

    if (videosData.data) {
      const idSet = new Set(videoIds)
      videosData.data.forEach((video: any) => {
        if (idSet.has(video.id)) {
          videoMap[video.id] = {
            source: video.source,
            thumbnail: video.thumbnails?.data?.length > 0
              ? (video.thumbnails.data.find((t: any) => t.is_preferred) || video.thumbnails.data[0]).uri
              : null
          }
        }
      })
      console.log(`Videos matched: ${Object.keys(videoMap).length}`)
    }
  }

  // Step 7: 최종 매칭 및 DB 저장
  console.log('Saving creatives to DB...')
  let savedCount = 0

  for (const adId in creativeData) {
    const creative = creativeData[adId]
    const mapping = adMapping[adId]
    if (!mapping) continue

    const campaignName = campaignNames[mapping.campaignId] || ''
    const adsetName = adsetNames[mapping.adsetId] || ''
    const adName = adNames[adId] || ''

    // ad_type 판단
    let adType = 'image'
    if (creative.asset_feed_spec?.videos?.length > 0 || creative.object_story_spec?.video_data) {
      adType = 'video'
    } else if (creative.asset_feed_spec?.images?.length > 1 ||
               creative.object_story_spec?.link_data?.child_attachments?.length > 1) {
      adType = 'carousel'
    } else if (creative.asset_feed_spec) {
      adType = 'dynamic'
    }

    // 비디오 처리
    let videoId: string | null = null
    if (creative.object_story_spec?.video_data?.video_id) {
      videoId = creative.object_story_spec.video_data.video_id
    } else if (creative.asset_feed_spec?.videos?.length > 0) {
      videoId = creative.asset_feed_spec.videos[0].video_id
    }

    if (videoId && videoMap[videoId]) {
      const { error } = await supabase
        .from('ad_creatives')
        .upsert({
          advertiser_id: integration.advertiser_id,
          ad_id: adId,
          campaign_name: campaignName,
          ad_group_name: adsetName,
          ad_name: adName,
          ad_type: adType,
          creative_type: 'video',
          url: videoMap[videoId].source || videoMap[videoId].thumbnail || creative.thumbnail_url || '',
          width: 0,
          height: 0,
          hash: '',
          collected_at: new Date().toISOString()
        }, { onConflict: 'advertiser_id,ad_id' })

      if (error) console.error(`Error saving video creative ${adId}:`, error)
      else savedCount++
      continue
    }

    // 이미지 처리
    const imageHashList: string[] = []

    if (creative.asset_feed_spec?.images?.length > 0) {
      creative.asset_feed_spec.images.forEach((img: any) => {
        if (img.hash) imageHashList.push(img.hash)
      })
    }
    if (imageHashList.length === 0 && creative.object_story_spec?.link_data?.child_attachments?.length > 0) {
      creative.object_story_spec.link_data.child_attachments.forEach((child: any) => {
        if (child.image_hash) imageHashList.push(child.image_hash)
      })
    }
    if (imageHashList.length === 0 && creative.object_story_spec?.link_data?.image_hash) {
      imageHashList.push(creative.object_story_spec.link_data.image_hash)
    }

    if (imageHashList.length > 0) {
      const firstHash = imageHashList[0]

      if (imageMap[firstHash]) {
        const { error } = await supabase
          .from('ad_creatives')
          .upsert({
            advertiser_id: integration.advertiser_id,
            ad_id: adId,
            campaign_name: campaignName,
            ad_group_name: adsetName,
            ad_name: adName,
            ad_type: adType,
            creative_type: 'image',
            url: imageMap[firstHash].url,
            width: imageMap[firstHash].width,
            height: imageMap[firstHash].height,
            hash: firstHash,
            collected_at: new Date().toISOString()
          }, { onConflict: 'advertiser_id,ad_id' })

        if (error) console.error(`Error saving image creative ${adId}:`, error)
        else savedCount++
      } else if (creative.thumbnail_url) {
        const { error } = await supabase
          .from('ad_creatives')
          .upsert({
            advertiser_id: integration.advertiser_id,
            ad_id: adId,
            campaign_name: campaignName,
            ad_group_name: adsetName,
            ad_name: adName,
            ad_type: adType,
            creative_type: 'image',
            url: creative.thumbnail_url,
            width: 0,
            height: 0,
            hash: firstHash,
            collected_at: new Date().toISOString()
          }, { onConflict: 'advertiser_id,ad_id' })

        if (error) console.error(`Error saving thumbnail creative ${adId}:`, error)
        else savedCount++
      }
    }
  }

  console.log(`Meta Creatives saved successfully: ${savedCount} records`)
}

// Batch API로 이름 조회
async function batchGetNames(ids: string[], accessToken: string, apiVersion: string): Promise<Record<string, string>> {
  if (!ids || ids.length === 0) return {}

  const result: Record<string, string> = {}
  const batchSize = 50

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)

    const batchRequests = batch.map(id => ({
      method: 'GET',
      relative_url: `${id}?fields=name`
    }))

    try {
      const response = await fetch(`https://graph.facebook.com/${apiVersion}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `access_token=${accessToken}&batch=${encodeURIComponent(JSON.stringify(batchRequests))}`
      })

      const batchResults = await response.json()

      batchResults.forEach((res: any, index: number) => {
        if (res.code === 200) {
          const body = JSON.parse(res.body)
          result[batch[index]] = body.name || ''
        }
      })

      if (i + batchSize < ids.length) await delay(100)
    } catch (e) {
      console.error('Batch name fetch error:', e)
    }
  }

  return result
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// Helper Functions
// ============================================================================
function getActionValue(actions: any[], actionType: string): number {
  if (!Array.isArray(actions)) return 0

  const action = actions.find(a => a.action_type === actionType)
  return action ? parseFloat(action.value) || 0 : 0
}

// ============================================================================
// Destination URL 수집 (ad_performance 저장 완료 후 실행)
// ============================================================================
async function fetchAndSaveDestinationUrls(
  supabase: any,
  advertiserId: string,
  adIds: string[],
  accessToken: string,
  apiVersion: string
): Promise<void> {
  if (!adIds || adIds.length === 0) {
    console.log('No ad IDs to fetch destination URLs')
    return
  }

  console.log(`Fetching destination URLs for ${adIds.length} ads`)

  // Batch API로 destination URL 수집 (50개씩)
  const batchSize = 50
  const destinationUrls: Record<string, string> = {}

  for (let i = 0; i < adIds.length; i += batchSize) {
    const batch = adIds.slice(i, i + batchSize)

    const batchRequests = batch.map(adId => ({
      method: 'GET',
      relative_url: `${apiVersion}/${adId}?fields=${encodeURIComponent('adcreatives{object_story_spec,asset_feed_spec}')}`
    }))

    const batchResponse = await fetch('https://graph.facebook.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        batch: batchRequests
      })
    })

    if (!batchResponse.ok) {
      console.error(`Batch API error: ${batchResponse.status}`)
      continue
    }

    const batchResults = await batchResponse.json()

    batchResults.forEach((res: any, index: number) => {
      const adId = batch[index]

      if (res.code !== 200) return

      const body = JSON.parse(res.body)
      if (!body.adcreatives?.data?.length) return

      const creative = body.adcreatives.data[0]
      const spec = creative.object_story_spec
      const asset = creative.asset_feed_spec

      if (!spec && !asset) return

      // URL 추출 (4가지 경로 시도)
      const url =
        spec?.link_data?.link ||
        spec?.video_data?.call_to_action?.value?.link ||
        spec?.link_data?.child_attachments?.[0]?.link ||
        asset?.link_urls?.[0]?.website_url ||
        null

      if (url) {
        destinationUrls[adId] = url
      }
    })

    if (i + batchSize < adIds.length) await delay(100)
  }

  console.log(`Extracted ${Object.keys(destinationUrls).length} destination URLs`)

  // Step 3: ad_creatives 테이블에 destination_url 업데이트
  let successCount = 0
  let failCount = 0

  for (const adId in destinationUrls) {
    const { data, error } = await supabase
      .from('ad_creatives')
      .update({ destination_url: destinationUrls[adId] })
      .eq('advertiser_id', advertiserId)
      .eq('ad_id', adId)
      .select()

    if (error) {
      console.error(`Failed to update destination_url for ad_id=${adId}:`, error)
      failCount++
    } else if (!data || data.length === 0) {
      console.warn(`No rows updated for ad_id=${adId} (ad_creatives에 해당 ad_id가 없을 수 있음)`)
      failCount++
    } else {
      successCount++
    }
  }

  console.log(`Destination URLs saved: ${successCount} success, ${failCount} failed`)
}
