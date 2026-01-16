import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qdzdyoqtzkfpcogecyar.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA5NTMsImV4cCI6MjA4MjY4Njk1M30.ZmC738mDWCJo0U_JZt7-L5KqaRiDAwd8_ihgk4p5pQM'
);

async function checkData() {
  console.log('📊 데이터 확인 중...\n');

  // 1. ad_performance 테이블 전체 데이터
  const { data: allData, error: allError } = await supabase
    .from('ad_performance')
    .select('*')
    .order('date', { ascending: false });

  if (allError) {
    console.error('❌ 조회 실패:', allError);
    return;
  }

  const count = allData ? allData.length : 0;
  console.log(`✅ ad_performance 총 ${count}개 행\n`);

  if (allData && allData.length > 0) {
    console.log('📋 데이터 샘플:');
    console.table(allData.map(d => ({
      날짜: d.date,
      광고주ID: d.advertiser_id ? d.advertiser_id.substring(0, 8) + '...' : 'N/A',
      매체: d.source,
      캠페인: d.campaign_name,
      비용: d.cost,
      클릭: d.clicks,
      전환: d.conversions,
      전환가치: d.conversion_value
    })));
  } else {
    console.log('⚠️  ad_performance 테이블이 비어있습니다.');
  }

  // 2. advertisers 확인
  const { data: advertisers } = await supabase.from('advertisers').select('*');
  const advCount = advertisers ? advertisers.length : 0;
  console.log(`\n✅ advertisers: ${advCount}개`);
  if (advertisers && advertisers.length > 0) {
    console.table(advertisers.map(a => ({ ID: a.id.substring(0, 8) + '...', 이름: a.name })));
  }
}

checkData();
