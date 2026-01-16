// 대시보드 데이터 전체 조회 디버깅
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdzdyoqtzkfpcogecyar.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA5NTMsImV4cCI6MjA4MjY4Njk1M30.ZmC738mDWCJo0U_JZt7-L5KqaRiDAwd8_ihgk4p5pQM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDashboard() {
  console.log('=== 대시보드 데이터 디버깅 ===\n');

  // 1. 광고주 확인
  const { data: advertisers, error: advError } = await supabase
    .from('advertisers')
    .select('*')
    .is('deleted_at', null);

  console.log('1. 광고주 목록:', advertisers);
  if (advError) console.error('광고주 에러:', advError);

  if (!advertisers || advertisers.length === 0) {
    console.log('\n⚠️ 광고주가 없습니다. SQL을 먼저 실행하세요.');
    return;
  }

  const advertiserId = advertisers[0].id;
  console.log(`\n선택된 광고주: ${advertisers[0].name} (${advertiserId})`);

  // 2. ad_performance 데이터 확인
  const { data: performance, error: perfError } = await supabase
    .from('ad_performance')
    .select('*')
    .eq('advertiser_id', advertiserId)
    .is('deleted_at', null);

  console.log('\n2. ad_performance 데이터:');
  console.log('개수:', performance?.length || 0);
  console.log('데이터:', performance);
  if (perfError) console.error('성과 데이터 에러:', perfError);

  // 3. ad_creatives 데이터 확인
  const { data: creatives, error: creError } = await supabase
    .from('ad_creatives')
    .select('*')
    .eq('advertiser_id', advertiserId)
    .is('deleted_at', null);

  console.log('\n3. ad_creatives 데이터:');
  console.log('개수:', creatives?.length || 0);
  console.log('데이터:', creatives);
  if (creError) console.error('크리에이티브 에러:', creError);

  // 4. KPI 데이터 계산
  if (performance && performance.length > 0) {
    const totalCost = performance.reduce((sum, row) => sum + Number(row.cost || 0), 0);
    const totalImpressions = performance.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
    const totalClicks = performance.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
    const totalConversions = performance.reduce((sum, row) => sum + Number(row.conversions || 0), 0);
    const totalConversionValue = performance.reduce((sum, row) => sum + Number(row.conversion_value || 0), 0);

    console.log('\n4. KPI 계산:');
    console.log('총 광고비:', totalCost.toLocaleString());
    console.log('총 노출수:', totalImpressions.toLocaleString());
    console.log('총 클릭수:', totalClicks.toLocaleString());
    console.log('총 전환수:', totalConversions.toLocaleString());
    console.log('총 전환가치:', totalConversionValue.toLocaleString());
    console.log('CVR:', totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%' : '0%');
    console.log('ROAS:', totalCost > 0 ? (totalConversionValue / totalCost).toFixed(2) : '0');
  }

  // 5. users 테이블에서 test@example.com 확인
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@example.com');

  console.log('\n5. test@example.com 사용자:');
  console.log(users);
  if (userError) console.error('사용자 에러:', userError);
}

debugDashboard();
