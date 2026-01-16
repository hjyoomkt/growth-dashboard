// 일일 광고비 데이터 조회 테스트
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA5NTMsImV4cCI6MjA4MjY4Njk1M30.ZmC738mDWCJo0U_JZt7-L5KqaRiDAwd8_ihgk4p5pQM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDailyAdCost() {
  console.log('=== 일일 광고비 조회 테스트 ===\n');

  // 1. 나이키 코리아 advertiser_id 조회
  const { data: advertisers, error: advError } = await supabase
    .from('advertisers')
    .select('id, name')
    .eq('name', '나이키 코리아')
    .is('deleted_at', null)
    .single();

  if (advError) {
    console.error('광고주 조회 실패:', advError);
    return;
  }

  console.log('광고주:', advertisers);
  const advertiserId = advertisers.id;

  // 2. 일일 광고비 조회
  const startDate = '2025-12-31';
  const endDate = '2025-12-31';

  let query = supabase
    .from('ad_performance')
    .select('date, cost, source, ad_id');

  if (advertiserId) {
    query = query.eq('advertiser_id', advertiserId);
  }
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  query = query.is('deleted_at', null).order('date', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('데이터 조회 실패:', error);
    return;
  }

  console.log('\n조회된 원본 데이터:', data);
  console.log('데이터 개수:', data.length);

  // 날짜별로 그룹화하여 합산
  const groupedData = (data || []).reduce((acc, row) => {
    const date = row.date;
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += Number(row.cost) || 0;
    return acc;
  }, {});

  console.log('\n그룹화된 데이터:', groupedData);

  // [{date, cost}] 형식으로 변환
  const result = Object.entries(groupedData).map(([date, cost]) => ({
    date,
    cost,
  }));

  console.log('\n최종 결과:', result);
}

testDailyAdCost();
