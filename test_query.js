import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qdzdyoqtzkfpcogecyar.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemR5b3F0emtmcGNvZ2VjeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTA5NTMsImV4cCI6MjA4MjY4Njk1M30.ZmC738mDWCJo0U_JZt7-L5KqaRiDAwd8_ihgk4p5pQM'
);

async function testQueries() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log('📅 날짜 범위:', { thirtyDaysAgo, today });

  // 1. 일별 광고비
  console.log('\n1️⃣ 일별 광고비 (getDailyAdCost)');
  const { data: costData, error: costError } = await supabase
    .from('ad_performance')
    .select('date, cost')
    .gte('date', thirtyDaysAgo)
    .lte('date', today)
    .is('deleted_at', null)
    .order('date', { ascending: true });

  if (costError) {
    console.error('❌ 오류:', costError);
  } else {
    console.log('✅ 원본 데이터:', costData);
    const grouped = (costData || []).reduce((acc, row) => {
      if (!acc[row.date]) acc[row.date] = 0;
      acc[row.date] += Number(row.cost) || 0;
      return acc;
    }, {});
    const result = Object.entries(grouped).map(([date, cost]) => ({ date, cost }));
    console.log('✅ 그룹화 결과:', result);
  }

  // 2. 매체별 매출
  console.log('\n2️⃣ 매체별 매출 (getMediaRevenue)');
  const { data: revenueData, error: revenueError } = await supabase
    .from('ad_performance')
    .select('source, conversion_value')
    .gte('date', thirtyDaysAgo)
    .lte('date', today)
    .is('deleted_at', null);

  if (revenueError) {
    console.error('❌ 오류:', revenueError);
  } else {
    console.log('✅ 원본 데이터:', revenueData);
    const grouped = (revenueData || []).reduce((acc, row) => {
      if (!acc[row.source]) acc[row.source] = 0;
      acc[row.source] += Number(row.conversion_value) || 0;
      return acc;
    }, {});
    const result = Object.entries(grouped).map(([name, value]) => ({ name, value }));
    console.log('✅ 그룹화 결과:', result);
  }

  // 3. 일별 ROAS
  console.log('\n3️⃣ 일별 ROAS (getDailyROASAndCost)');
  const { data: roasData, error: roasError } = await supabase
    .from('ad_performance')
    .select('date, cost, conversion_value')
    .gte('date', thirtyDaysAgo)
    .lte('date', today)
    .is('deleted_at', null)
    .order('date', { ascending: true });

  if (roasError) {
    console.error('❌ 오류:', roasError);
  } else {
    console.log('✅ 원본 데이터:', roasData);
    const grouped = (roasData || []).reduce((acc, row) => {
      if (!acc[row.date]) acc[row.date] = { cost: 0, conversion_value: 0 };
      acc[row.date].cost += Number(row.cost) || 0;
      acc[row.date].conversion_value += Number(row.conversion_value) || 0;
      return acc;
    }, {});
    const result = Object.entries(grouped).map(([date, values]) => ({
      date,
      cost: values.cost,
      roas: values.cost > 0 ? values.conversion_value / values.cost : 0,
    }));
    console.log('✅ 그룹화 결과:', result);
  }
}

testQueries();
