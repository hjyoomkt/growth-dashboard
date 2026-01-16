import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qdzdyoqtzkfpcogecyar.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA5NTMsImV4cCI6MjA4MjY4Njk1M30.ZmC738mDWCJo0U_JZt7-L5KqaRiDAwd8_ihgk4p5pQM'
);

async function insertSampleData() {
  console.log('📝 샘플 데이터 삽입 시작...\n');

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 1. advertiser_id 조회 (실제 존재하는 광고주 사용)
  const { data: advertisers } = await supabase
    .from('advertisers')
    .select('id')
    .limit(1);

  const advertiserId = advertisers && advertisers.length > 0 ? advertisers[0].id : null;

  if (!advertiserId) {
    console.error('❌ 광고주가 존재하지 않습니다. 먼저 광고주를 생성해주세요.');
    return;
  }

  console.log(`✅ 광고주 ID: ${advertiserId}\n`);

  // 2. 샘플 크리에이티브 데이터 (ad_creatives 테이블)
  const sampleCreatives = [
    {
      ad_id: 'meta_ad_001',
      ad_name: '여름 세일 메인 배너',
      url: 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png',
      creative_type: 'image',
      advertiser_id: advertiserId,
      created_at: new Date().toISOString(),
    },
    {
      ad_id: 'meta_ad_002',
      ad_name: '신상품 런칭 영상',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      creative_type: 'video',
      advertiser_id: advertiserId,
      created_at: new Date().toISOString(),
    },
    {
      ad_id: 'meta_ad_003',
      ad_name: '할인 이벤트 배너',
      url: 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png',
      creative_type: 'image',
      advertiser_id: advertiserId,
      created_at: new Date().toISOString(),
    },
    {
      ad_id: 'meta_ad_004',
      ad_name: '브랜드 스토리 영상',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      creative_type: 'video',
      advertiser_id: advertiserId,
      created_at: new Date().toISOString(),
    },
    {
      ad_id: 'meta_ad_005',
      ad_name: '특가 프로모션',
      url: 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png',
      creative_type: 'image',
      advertiser_id: advertiserId,
      created_at: new Date().toISOString(),
    },
    {
      ad_id: 'meta_ad_006',
      ad_name: '리타게팅 광고',
      url: 'https://scontent-sin6-3.xx.fbcdn.net/v/t45.1600-4/471677510_120210137406580130_1863116863095760621_n.png',
      creative_type: 'image',
      advertiser_id: advertiserId,
      created_at: new Date().toISOString(),
    },
  ];

  console.log('1️⃣ ad_creatives 테이블에 샘플 데이터 UPSERT');
  const { data: insertedCreatives, error: creativesError } = await supabase
    .from('ad_creatives')
    .upsert(sampleCreatives, { onConflict: 'advertiser_id,ad_id' })
    .select();

  if (creativesError) {
    console.error('❌ 크리에이티브 삽입 실패:', creativesError);
    return;
  }
  console.log(`✅ ${insertedCreatives.length}개 크리에이티브 삽입 완료\n`);

  // 3. 샘플 성과 데이터 (ad_performance 테이블)
  // 최근 30일간 일별 데이터 생성
  const samplePerformance = [];
  const adIds = ['meta_ad_001', 'meta_ad_002', 'meta_ad_003', 'meta_ad_004', 'meta_ad_005', 'meta_ad_006'];
  const sources = ['Meta', 'Meta', 'Naver', 'Google', 'Kakao', 'Criteo'];

  // 각 광고별 일별 데이터 생성
  for (let i = 0; i < adIds.length; i++) {
    const adId = adIds[i];
    const source = sources[i];

    // 최근 30일간 데이터
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // 광고비는 광고별로 다르게 설정 (광고 1이 가장 많이 지출)
      const baseCost = [50000, 40000, 35000, 30000, 25000, 20000][i];
      const cost = baseCost * (0.8 + Math.random() * 0.4); // ±20% 변동

      const impressions = Math.floor(cost * (50 + Math.random() * 30)); // CPM 기반
      const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.02)); // CTR 1~3%
      const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.05)); // CVR 2~7%

      // ROAS 200~400% 범위로 설정 (현실적인 수치)
      const roas = 2 + Math.random() * 2; // 2.0 ~ 4.0
      const conversion_value = Math.round(cost * roas); // 매출 = 광고비 × ROAS

      samplePerformance.push({
        advertiser_id: advertiserId,
        campaign_name: `캠페인 ${Math.floor(i / 2) + 1}`,
        ad_group_name: `광고세트 ${i + 1}`,
        ad_name: sampleCreatives[i].ad_name,
        ad_id: adId,
        source: source,
        date: dateStr,
        cost: Math.round(cost),
        impressions: impressions,
        clicks: clicks,
        conversions: conversions,
        conversion_value: Math.round(conversion_value),
        created_at: new Date().toISOString(),
      });
    }
  }

  console.log('\n2️⃣ ad_performance 테이블에 샘플 데이터 UPSERT');
  const { data: insertedPerformance, error: performanceError } = await supabase
    .from('ad_performance')
    .upsert(samplePerformance, { onConflict: 'advertiser_id,source,ad_id,date' })
    .select();

  if (performanceError) {
    console.error('❌ 성과 데이터 삽입 실패:', performanceError);
    return;
  }
  console.log(`✅ ${insertedPerformance.length}개 성과 데이터 삽입 완료\n`);

  // 3. 삽입된 데이터 확인
  console.log('3️⃣ 삽입된 데이터 확인\n');

  // ad_creatives 확인
  const { data: creatives } = await supabase
    .from('ad_creatives')
    .select('*')
    .eq('advertiser_id', advertiserId)
    .is('deleted_at', null);

  console.log(`📊 ad_creatives: ${creatives?.length || 0}개`);
  console.table(creatives?.map(c => ({
    광고ID: c.ad_id,
    광고명: c.ad_name?.substring(0, 20),
    타입: c.creative_type,
    URL: c.url ? 'O' : 'X',
  })));

  // ad_performance 집계
  const { data: performance } = await supabase
    .from('ad_performance')
    .select('ad_id, source, cost, impressions, clicks, conversions, conversion_value')
    .eq('advertiser_id', advertiserId)
    .gte('date', thirtyDaysAgo)
    .lte('date', today)
    .is('deleted_at', null);

  // ad_id별 집계
  const aggregated = (performance || []).reduce((acc, row) => {
    const adId = row.ad_id;
    if (!acc[adId]) {
      acc[adId] = {
        ad_id: adId,
        source: row.source,
        cost: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversion_value: 0,
      };
    }
    acc[adId].cost += Number(row.cost) || 0;
    acc[adId].impressions += Number(row.impressions) || 0;
    acc[adId].clicks += Number(row.clicks) || 0;
    acc[adId].conversions += Number(row.conversions) || 0;
    acc[adId].conversion_value += Number(row.conversion_value) || 0;
    return acc;
  }, {});

  console.log(`\n📊 ad_performance 집계 (광고비 순):`);
  const sortedAds = Object.values(aggregated).sort((a, b) => b.cost - a.cost);
  console.table(sortedAds.map(ad => {
    const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
    const roas = ad.cost > 0 ? (ad.conversion_value / ad.cost) * 100 : 0;
    return {
      광고ID: ad.ad_id,
      매체: ad.source,
      비용: Math.round(ad.cost).toLocaleString(),
      노출: ad.impressions.toLocaleString(),
      클릭: ad.clicks,
      전환: ad.conversions,
      CTR: ctr.toFixed(1) + '%',
      ROAS: Math.round(roas) + '%',
    };
  }));

  console.log('\n✅ 샘플 데이터 삽입 및 검증 완료!');
  console.log('\n📌 다음 단계:');
  console.log('   1. npm start로 대시보드 실행');
  console.log('   2. "조회기간 BEST 소재" 위젯 확인');
  console.log('   3. "전체 소재 현황" 페이지 확인');
  console.log('   4. 광고비 순으로 정렬되어 있는지 확인');
  console.log('   5. 이미지/영상이 올바르게 표시되는지 확인\n');
}

insertSampleData();
