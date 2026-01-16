import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qdzdyoqtzkfpcogecyar.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA5NTMsImV4cCI6MjA4MjY4Njk1M30.ZmC738mDWCJo0U_JZt7-L5KqaRiDAwd8_ihgk4p5pQM'
);

async function testCreatives() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log('📅 날짜 범위:', { thirtyDaysAgo, today });

  // 1. ad_creatives 테이블 확인
  console.log('\n1️⃣ ad_creatives 테이블 확인');
  const { data: creatives, error: creativesError } = await supabase
    .from('ad_creatives')
    .select('*')
    .is('deleted_at', null)
    .limit(5);

  if (creativesError) {
    console.error('❌ 오류:', creativesError);
  } else {
    console.log(`✅ ad_creatives 총 ${creatives?.length || 0}개`);
    console.table(creatives?.map(c => ({
      광고ID: c.ad_id?.substring(0, 15) + '...',
      광고명: c.ad_name?.substring(0, 20),
      이미지: c.image_url ? 'O' : 'X',
      영상: c.video_url ? 'O' : 'X',
    })));
  }

  // 2. ad_performance에서 ad_id 확인
  console.log('\n2️⃣ ad_performance에 ad_id 존재 여부');
  const { data: performance, error: perfError } = await supabase
    .from('ad_performance')
    .select('ad_id, source, cost')
    .gte('date', thirtyDaysAgo)
    .lte('date', today)
    .is('deleted_at', null)
    .not('ad_id', 'is', null)
    .limit(10);

  if (perfError) {
    console.error('❌ 오류:', perfError);
  } else {
    console.log(`✅ ad_id 있는 행: ${performance?.length || 0}개`);
    console.table(performance?.map(p => ({
      광고ID: p.ad_id?.substring(0, 15) + '...',
      매체: p.source,
      비용: p.cost,
    })));
  }

  // 3. JOIN 시뮬레이션 (getBestCreatives 로직)
  console.log('\n3️⃣ JOIN 시뮬레이션 (성과 + 크리에이티브)');

  // 3-1. 성과 데이터 조회
  const { data: performanceData } = await supabase
    .from('ad_performance')
    .select('ad_id, source, cost, impressions, clicks, conversions, conversion_value')
    .gte('date', thirtyDaysAgo)
    .lte('date', today)
    .is('deleted_at', null);

  // 3-2. ad_id별로 집계
  const aggregated = (performanceData || []).reduce((acc, row) => {
    const adId = row.ad_id;
    if (!adId) return acc;
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

  const adIds = Object.keys(aggregated);
  console.log(`집계된 광고 수: ${adIds.length}개`);

  if (adIds.length === 0) {
    console.log('⚠️  ad_id가 있는 데이터가 없습니다.');
    return;
  }

  // 3-3. 크리에이티브 조회
  const { data: creativesData } = await supabase
    .from('ad_creatives')
    .select('ad_id, ad_name, image_url, video_url')
    .in('ad_id', adIds)
    .is('deleted_at', null);

  console.log(`매칭된 크리에이티브: ${creativesData?.length || 0}개`);

  // 3-4. JOIN 결과
  const joined = (creativesData || []).map(creative => {
    const perf = aggregated[creative.ad_id] || {};
    const cost = perf.cost || 0;
    const impressions = perf.impressions || 0;
    const clicks = perf.clicks || 0;
    const conversions = perf.conversions || 0;
    const conversion_value = perf.conversion_value || 0;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = cost > 0 ? (conversion_value / cost) * 100 : 0;

    return {
      광고명: creative.ad_name?.substring(0, 20) || '없음',
      매체: perf.source,
      비용: Math.round(cost),
      전환: conversions,
      CTR: ctr.toFixed(1) + '%',
      ROAS: Math.round(roas) + '%',
      이미지: creative.image_url ? 'O' : 'X',
      영상: creative.video_url ? 'O' : 'X',
    };
  });

  // 광고비 순 정렬
  const sorted = joined.sort((a, b) => b.비용 - a.비용);

  console.log('\n✅ JOIN 결과 (광고비 순):');
  console.table(sorted.slice(0, 10));
}

testCreatives();
